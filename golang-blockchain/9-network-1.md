---
description: Network를 구현하여 블록체인 참여자들끼리 블록을 공유하도록 하자
---

# \#9 Network 1

지금까지 하나의 컴퓨터에서 블록체인의 중요한 개념들을 구현하고 실행해보았다. 하지만 블록체인이 의미를 가지려면 많은 참여자들이 같은 블록을 저장하고 합의하는 일들이 필요하다. 블록체인 참여자들끼리 소통할 수 있도록 네트워크를 구현해보자.

이번 파트는 네트워크에 속한 다른 참여자들에게 요청을 보내거나 요청을 받았을 때 처리하는 전체적인 틀에 대해 구현을 할 것이고 각각 함수들의 세부 구현은 다음 파트에서 진행됩니다. 

[비트코인 네트워크 ](../bitcoin/bitcoin-network.md)문서를 보고 아래 함수들을 읽어보면 대충 어떤 식으로 돌아갈 예정인가를 이해하실 수 있을 것 입니다. 비트코인의 네트워크와 완전히 일치하지는 않으나 Blocks-First 메소드와 유사하게 동작합니다.

이번 파트는 반복되는 코드가 많고 미구현된 부분이 많으니 그냥 한번 구조만 보는 식으로 진행하시면 됩니다. 

## blockchain/chain\_iter.go

BlockchainIterator를 따로 파일을 분리한다. 원래는 `blockchain.go` 파일에 있던 코드입니다.

```go
//blockchain/chain_iter.go
package blockchain

import "github.com/dgraph-io/badger"

// BlockChain DB의 Block을 순회하는 자료구조
type BlockChainIterator struct {
	CurrentHash []byte
	Database    *badger.DB
}

// 아래 함수는 BlockChainIterator를 생성하여 반환합니다.
func (chain *BlockChain) Iterator() *BlockChainIterator {
	iter := &BlockChainIterator{chain.LastHash, chain.Database}
	return iter
}

// Next()함수는 최신 블록에서 Genesis블록 쪽으로
// 다음 블록을 탐색해 포인터를 반환합니다.
func (iter *BlockChainIterator) Next() *Block {
	var block *Block

	// 현재 해시값 {CurrentHash}로 블록을 검색합니다.
	err := iter.Database.View(func(txn *badger.Txn) error {
		item, err := txn.Get(iter.CurrentHash)
		Handle(err)
		encodedBlock, err := item.ValueCopy(nil)
		block = Deserialize(encodedBlock)

		return err
	})
	Handle(err)

	// block에 저장된 PrevHash를 가져와서
	// 다음 탐색에 사용합니다.
	iter.CurrentHash = block.PrevHash

	return block
}
```

## network/network.go

network 폴더를 만들어서 `network.go` 파일을 만들고 아래와 같이 작성하자.

네트워킹의 기본적인 뼈대인 서버 시작, request 메세지 발송 및 처리에 관한 코드입니다. 세부적인 함수 내용은 다음 파트에서 작성합니다.

```go
package network

import (
	"bytes"
	"encoding/gob"
	"encoding/hex"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net"
	"os"
	"runtime"
	"syscall"

	"github.com/siisee11/golang-blockchain/blockchain"
	DEATH "github.com/vrecan/death/v3"
)

// 	go get github.com/vrecan/death/v3

const (
	protocol      = "tcp" // 통신 프로토콜
	version       = 1     // version number
	commandLength = 12    // command string의 길이
)

var (
	nodeAddress   string // Server를 돌리는 바로 이 노드의 주소
	minterAddress string // minter의 주소
	// KnownNodes : 네트워크에 속한 알고있는 노드들
	// localhost:3000은 central node
	KnownNodes      = []string{"localhost:3000"}
	blocksInTransit = [][]byte{}
	memoryPool      = make(map[string]blockchain.Transaction) // txID => Transaction
)

// 아래는 통신을 위한 구조들.
type Addr struct {
	AddrList []string
}

type Block struct {
	AddrFrom string
	Block    []byte
}

type GetBlocks struct {
	AddrFrom string
}

type GetData struct {
	AddrFrom string
	Type     string
	ID       []byte
}

// Inventory
type Inv struct {
	AddrFrom string
	Type     string
	Items    [][]byte
}

type Tx struct {
	AddrFrom    string
	Transaction []byte
}

type Version struct {
	Version    int
	BestHeight int
	AddrFrom   string
}

// Helper functionn
// network 통신을 위해 command를 byte 배열로 변환
func CmdToBytes(cmd string) []byte {
	var bytes [commandLength]byte

	for i, c := range cmd {
		bytes[i] = byte(c)
	}
	return bytes[:]
}

// Helper functionn
// byte배열을 커맨드로 변환
func BytesToCmd(bytes []byte) string {
	var cmd []byte

	for _, b := range bytes {
		if b != 0x0 {
			cmd = append(cmd, b)
		}
	}
	return fmt.Sprintf("%s", cmd)
}

// KnownNodes들에게 블록을 달라고 요청
func RequestBlocks() {
	for _, node := range KnownNodes {
		SendGetBlocks(node)
	}
}

// {request}의 첫 commandLength byte는 커맨드
func ExtractCmd(request []byte) []byte {
	return request[:commandLength]
}

// KnownNodes에 자신의 address를 더해서 {addr}에게 addr 커맨드를 보냄
func SendAddr(addr string) {
	nodes := Addr{KnownNodes}
	nodes.AddrList = append(nodes.AddrList, nodeAddress)
	payload := GobEncode(nodes)
	request := append(CmdToBytes("addr"), payload...)

	SendData(addr, request)
}

// Block을 payload에 담아서 보냄
func SendBlock(addr string, b *blockchain.Block) {
	data := Block{nodeAddress, b.Serialize()}
	payload := GobEncode(data)
	request := append(CmdToBytes("block"), payload...)

	SendData(addr, request)
}

// {items}(block이나 tx)을 보냄
func SendInv(addr, kind string, items [][]byte) {
	inventory := Inv{nodeAddress, kind, items}
	payload := GobEncode(inventory)
	request := append(CmdToBytes("inv"), payload...)

	SendData(addr, request)
}

// Transaction을 보냄
func SendTx(addr string, tnx *blockchain.Transaction) {
	data := Tx{nodeAddress, tnx.Serialize()}
	payload := GobEncode(data)
	request := append(CmdToBytes("tx"), payload...)

	SendData(addr, request)
}

// Version을 보냄(Height, version)
func SendVersion(addr string, chain *blockchain.BlockChain) {
	bestHeight := chain.GetBestHeight() // next part
	data := Version{version, bestHeight, nodeAddress}
	payload := GobEncode(data)
	request := append(CmdToBytes("version"), payload...)

	SendData(addr, request)
}

// Block을 달라고 요청을 보냄
func SendGetBlocks(addr string) {
	payload := GobEncode(GetBlocks{nodeAddress})
	request := append(CmdToBytes("getblocks"), payload...)

	SendData(addr, request)
}

// data를 달라고 요청을 보냄
func SendGetData(addr, kind string, id []byte) {
	payload := GobEncode(GetData{nodeAddress, kind, id})
	request := append(CmdToBytes("getdata"), payload...)

	SendData(addr, request)
}

// request(cmd + payload)를 보냄
func SendData(addr string, data []byte) {
	conn, err := net.Dial(protocol, addr)

	if err != nil {
		fmt.Printf("%s is not available\n", addr)
		var updatedNodes []string

		for _, node := range KnownNodes {
			if node != addr {
				updatedNodes = append(updatedNodes, node)
			}
		}

		KnownNodes = updatedNodes

		return
	}

	defer conn.Close()

	_, err = io.Copy(conn, bytes.NewReader(data))
	if err != nil {
		log.Panic(err)
	}

}

// "addr" 커맨드를 처리함
func HandleAddr(request []byte) {
	var buff bytes.Buffer
	var payload Addr

	// request에서 앞 commandLength를 제외하면 payload
	buff.Write(request[commandLength:])
	dec := gob.NewDecoder(&buff)
	// []byte => Addr
	err := dec.Decode(&payload)
	if err != nil {
		log.Panic(err)
	}

	// KnownNodes에 추가
	KnownNodes = append(KnownNodes, payload.AddrList...)
	fmt.Printf("there are %d known nodes\n", len(KnownNodes))

	// Block을 요청함.
	RequestBlocks()
}

// "block" 커맨드를 처리함.
func HandleBlock(request []byte, chain *blockchain.BlockChain) {
	var buff bytes.Buffer
	var payload Block

	buff.Write(request[commandLength:])
	dec := gob.NewDecoder(&buff)
	err := dec.Decode(&payload)
	if err != nil {
		log.Panic(err)
	}

	blockData := payload.Block
	block := blockchain.Deserialize(blockData)

	fmt.Println("received a new block!")
	chain.AddBlock(block) // 다음 파트에서 AddBlock함수를 다시 정의함

	fmt.Printf("added block %x\n", block.Hash)

	if len(blocksInTransit) > 0 {
		blockHash := blocksInTransit[0]
		SendGetData(payload.AddrFrom, "block", blockHash)

		blocksInTransit = blocksInTransit[1:]
	} else {
		UTXOset := blockchain.UTXOSet{chain}
		UTXOset.Reindex()
	}
}

// "getblock" 커맨드를 처리함.
func HandleGetBlock(request []byte, chain *blockchain.BlockChain) {
	var buff bytes.Buffer
	var payload GetBlocks

	buff.Write(request[commandLength:])
	dec := gob.NewDecoder(&buff)
	err := dec.Decode(&payload)
	if err != nil {
		log.Panic(err)
	}

	blocks := chain.GetBlockHashes() // next part
	SendInv(payload.AddrFrom, "block", blocks)
}

// "getdata" 커맨드를 처리함.
func HandleGetData(request []byte, chain *blockchain.BlockChain) {
	var buff bytes.Buffer
	var payload GetData

	buff.Write(request[commandLength:])
	dec := gob.NewDecoder(&buff)
	err := dec.Decode(&payload)
	if err != nil {
		log.Panic(err)
	}

	if payload.Type == "block" {
		block, err := chain.GetBlock([]byte(payload.ID))
		if err != nil {
			return
		}

		SendBlock(payload.AddrFrom, &block)
	}

	if payload.Type == "tx" {
		txID := hex.EncodeToString(payload.ID)
		tx := memoryPool[txID]

		SendTx(payload.AddrFrom, &tx)
	}

}

// "getversion" 커맨드를 처리함.
func HandleVersion(request []byte, chain *blockchain.BlockChain) {
	var buff bytes.Buffer
	var payload Version

	buff.Write(request[commandLength:])
	dec := gob.NewDecoder(&buff)
	err := dec.Decode(&payload)
	if err != nil {
		log.Panic(err)
	}

	bestHeight := chain.GetBestHeight() // next part
	otherHeight := payload.BestHeight

	if bestHeight < otherHeight {
		SendGetBlocks(payload.AddrFrom)
	} else if bestHeight > otherHeight {
		SendVersion(payload.AddrFrom, chain)
	}

	if !NodeIsKnown(payload.AddrFrom) {
		KnownNodes = append(KnownNodes, payload.AddrFrom)
	}
}

// "tx" 커맨드를 처리함.
func HandleTx(request []byte, chain *blockchain.BlockChain) {
	var buff bytes.Buffer
	var payload Tx

	buff.Write(request[commandLength:])
	dec := gob.NewDecoder(&buff)
	err := dec.Decode(&payload)
	if err != nil {
		log.Panic(err)
	}

	txData := payload.Transaction
	tx := blockchain.DeserializeTransaction(txData)
	memoryPool[hex.EncodeToString(tx.ID)] = tx

	fmt.Printf("%s, %d", nodeAddress, len(memoryPool))

	if nodeAddress == KnownNodes[0] {
		for _, node := range KnownNodes {
			if node != nodeAddress && node != payload.AddrFrom {
				SendInv(node, "tx", [][]byte{tx.ID})
			}
		}
	} else {
		if len(memoryPool) >= 2 && len(minterAddress) > 0 {
			MintTx(chain)
		}
	}
}

// "inv" 커맨드를 처리함.
func HandleInv(request []byte, chain *blockchain.BlockChain) {
	var buff bytes.Buffer
	var payload Inv

	buff.Write(request[commandLength:])
	dec := gob.NewDecoder(&buff)
	err := dec.Decode(&payload)
	if err != nil {
		log.Panic(err)
	}

	fmt.Printf("Received Inventory with %d %s\n", len(payload.Items), payload.Type)

	if payload.Type == "block" {
		blocksInTransit = payload.Items

		blockHash := payload.Items[0]
		SendGetData(payload.AddrFrom, "block", blockHash)

		newInTransit := [][]byte{}
		for _, b := range blocksInTransit {
			if !bytes.Equal(b, blockHash) {
				newInTransit = append(newInTransit, b)
			}
		}
		blocksInTransit = newInTransit
	}

	if payload.Type == "tx" {
		txID := payload.Items[0]

		if memoryPool[hex.EncodeToString(txID)].ID == nil {
			SendGetData(payload.AddrFrom, "tx", txID)
		}
	}
}

func MintTx(chain *blockchain.BlockChain) {
	var txs []*blockchain.Transaction

	for id := range memoryPool {
		fmt.Printf("tx: ^s\n", memoryPool[id].ID)
		tx := memoryPool[id]
		if chain.VerifyTransaction(&tx) {
			txs = append(txs, &tx)
		}
	}

	if len(txs) == 0 {
		fmt.Println("All Transactions are invalid")
		return
	}

	cbTx := blockchain.CoinbaseTx(minterAddress, "")
	txs = append(txs, cbTx)

	newBlock := chain.MintBlock(txs)
	UTXOset := blockchain.UTXOSet{chain}
	UTXOset.Reindex()

	fmt.Println("New Block minted")

	for _, tx := range txs {
		txID := hex.EncodeToString(tx.ID)
		delete(memoryPool, txID)
	}

	for _, node := range KnownNodes {
		if node != nodeAddress {
			SendInv(node, "block", [][]byte{newBlock.Hash})
		}
	}

	if len(memoryPool) > 0 {
		MintTx(chain)
	}
}

// request를 받으면 처리하는 로직
func HandleConnection(conn net.Conn, chain *blockchain.BlockChain) {
	req, err := ioutil.ReadAll(conn)
	defer conn.Close()

	if err != nil {
		log.Panic(err)
	}

	command := BytesToCmd(req[:commandLength])
	fmt.Printf("Received %s command\n", command)

	switch command {
	case "addr":
		HandleAddr(req)
	case "block":
		HandleBlock(req, chain)
	case "inv":
		HandleInv(req, chain)
	case "getblocks":
		HandleGetBlock(req, chain)
	case "getdata":
		HandleGetData(req, chain)
	case "tx":
		HandleTx(req, chain)
	case "version":
		HandleVersion(req, chain)
	default:
		fmt.Println("Unknown command")
	}
}

// Node(server)를 실행합니다.
func StartServer(nodeID, minterAddress string) {
	nodeAddress = fmt.Sprintf("localhost:%s", nodeID)
	// miner의 주소를 global 변수에 저장.
	minterAddress = minterAddress
	// localhast:{nodeID} 주소에서 listen합니다.
	ln, err := net.Listen(protocol, nodeAddress)
	if err != nil {
		log.Panic(err)
	}
	defer ln.Close()

	chain := blockchain.ContinueBlockChain(nodeID)
	defer chain.Database.Close()
	go CloseDB(chain)

	if nodeAddress != KnownNodes[0] {
		SendVersion(KnownNodes[0], chain)
	}

	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Panic(err)
		}
		// connection 처리는 asynchronous하게 go routine으로 처리
		go HandleConnection(conn, chain)

	}
}

// Generic Encoding 함수
func GobEncode(data interface{}) []byte {
	var buff bytes.Buffer

	enc := gob.NewEncoder(&buff)
	err := enc.Encode(data)
	if err != nil {
		log.Panic(err)
	}

	return buff.Bytes()
}

// {addr}가 KnownNodes에 속해있으면 true
func NodeIsKnown(addr string) bool {
	for _, node := range KnownNodes {
		if node == addr {
			return true
		}
	}
	return false
}

// 안전한 DB close
func CloseDB(chain *blockchain.BlockChain) {
	// SIGINT, SIGTERM : unix, linux / Interrupt : window
	d := DEATH.NewDeath(syscall.SIGINT, syscall.SIGTERM, os.Interrupt)

	d.WaitForDeathWithFunc(func() {
		defer os.Exit(1)
		defer runtime.Goexit()
		chain.Database.Close()
	})
}
```

위의 `CloseDB` 함수에서 SIGINT, SIGTERM, Interrupt 같은 급작스러운 종료에 대비하기 위해서 death 모듈을 사용합니다. 아래 커맨드로 다운로드 받을 수 있습니다.

```go
go get github.com/vrecan/death/v3
```

{% hint style="info" %}
[https://github.com/vrecan/death](https://github.com/vrecan/death) 에 death 코드가 공개되어 있습니다.
{% endhint %}





{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step9 브랜치에 있습니다 . 
{% endhint %}



Last updated: May 8, 2021

