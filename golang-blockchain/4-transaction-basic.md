---
description: 기초적인 Transaction
---

# \#4 Transaction Basic

비트코인의 가장 중요한 기능 Transaction을 구현할 것 입니다. 이 파트에서 구현하는 트랜잭션은 완벽한 트랜잭션은 아니고 기본 동작을 구현한 것입니다. 나머지 파트를 진행하면서 점차 완성되어 갈 것입니다.

## 배경지 

이제 우리는 블록에 저장될 "거래"\(트랜잭션\)를 구현할 것입니다. 기존 구현에서의 Block.Data가 트랜잭션의 모음으로 대체될 것 입니다.

하기 내용은 [Transaction](../bitcoin/transaction.md)과 [UTXO](../bitcoin/untitled.md)의 개념없이 이해하기 힘들 수 있습니다. 단어를 클릭하여 해당 키워드를 습득하고 돌아오시는 걸 추천드립니다.

### Coinbase Transaction

블록이 채굴될 때, 채굴자에게 보상으로 코인을 주는 트랜잭션을 Coinbase 트랜잭션이라고 합니다. 모든 블록의 첫번째 트랜잭션은 Coinbase 트랜잭션 입니다. 

[https://www.blockchain.com/explorer](https://www.blockchain.com/explorer) 에서 아무 블록이나 눌러서 트랜잭션을 확인해봅시다. 

![COINBASE &#xD2B8;&#xB79C;&#xC7AD;&#xC158;](../.gitbook/assets/image%20%2899%29.png)

이 튜토리얼에서 구현할 coinbase 트랜잭션은 아래와 같은 구조입니다. 하나의 TxInput과 채굴자에게 주어지는 하나의 TxOutput\(TXO\)으로 구성되어 있습니다.

![&#xAD6C;&#xD604;&#xD560; Coinbase &#xD2B8;&#xB79C;&#xC7AD;&#xC158;](../.gitbook/assets/image%20%28107%29.png)

Coin이 생성되는 Coinbase 트랜잭션이기 때문에 TxInput이 TXO를 참조하고 있지않습니다. \(TxInput은 사용할 UTXO를 가르키는 일을 합니다.\) TxOutput에는 채굴자의 PubKey \(아직은 암호화를 거치지 않고 단순 문자열로 사용\)와 주어지는 코인의 양이 기록됩니다.

위의 Coinbase 트랜잭션만 발생한 상황에서 jy에게 주어진 100코인짜리 TXO는 아직 소모되지 않았기 때문에 이를 Unspent\(사용되지않은\) TXO라고 하여 **UTXO**라고 부릅니다.

jy가 받은 100 coin 중 30 coin을 ht에게 보내는 새로운 트랜잭션을 만듭니다.

![jy-&amp;gt;ht &#xD2B8;&#xB79C;&#xC7AD;&#xC158;](../.gitbook/assets/image%20%28106%29.png)

TxInput은 TXO를 가르키는 구조체입니다. 어떤 {ID}를 가진 트랜잭션의 {Out}번 째 TXO를 사용할 지를 표시합니다. 해당 TXO가 자신의 TXO임을 증명하는 {Sig}도 포함시킵니다.

TxInput이 가르키는 TXO는 100 Coin 짜리 입니다. 30 coin, 70 coin 짜리 TXO로 나누어져 30은 ht에게 보내지고 70은 다시 jy에게로 반환됩니다.

이제 코딩을 시작해봅시다.

## blockchain/transaction.go

`blockchain/transaction.go` 파일을 열어서 아래 내용을 붙혀넣습니다. 사실 따라서 타이핑해보는 것이 좋습니다.

```go
package blockchain

import (
	"bytes"
	"crypto/sha256"
	"encoding/gob"
	"encoding/hex"
	"fmt"
	"log"
)

// Transaction은 Input, Output으로 구성되어있습니다.
type Transaction struct {
	ID      []byte
	Inputs  []TxInput
	Outputs []TxOutput
}

// 이것이 TXO(Transaction Output)입니다.
// "트랜잭션의 아웃풋"과 TXO라는 표현을 병행해서 사용합니다.
type TxOutput struct {
	Value int // 잔액

	// 소유자의 공개키
	// 여기서는 쉽게 소유자의 주소를 사용합니다.
	PubKey string
}

// 트랜잭션의 인풋은 이전 트랜잭션에서의 아웃풋을 사용하는 것임을 기억해야합니다.
// {ID}를 가지는 트랜잭션의 {OUT}번째 {Sig} 소유의 아웃풋으로 생각할 수 있습니다.
type TxInput struct {
	ID  []byte
	Out int
	Sig string // 소유자의 서명
}

// 1
// transaction에ID를 부여
func (tx *Transaction) SetID() {
	var encoded bytes.Buffer
	var hash [32]byte

	encode := gob.NewEncoder(&encoded)
	err := encode.Encode(tx)
	Handle(err)

	hash = sha256.Sum256(encoded.Bytes())
	tx.ID = hash[:]
}

// 1
// mining하면 to에게 코인(100)을 보상으로 줍니다.
// 해당 트랜잭션을 Coinbase 라고 부르겠습니다.
func CoinbaseTx(to, data string) *Transaction {
	if data == "" {
		data = fmt.Sprintf("Coins to %s", to)
	}

	// txin은 없다.
	txin := TxInput{[]byte{}, -1, data}
	// 100 coin이 to의 소유라는 내용의 txout
	txout := TxOutput{100, to}

	// in은 없는데 out만 존재하는 돈의 복사 현장이다...
	tx := Transaction{nil, []TxInput{txin}, []TxOutput{txout}}
	tx.SetID()

	return &tx
}

// 2 (blockchain.go 수정 후 참고)
// Transaction을 만드는 함수 입니다.
func NewTransaction(from, to string, amount int, chain *BlockChain) *Transaction {
	var inputs []TxInput
	var outputs []TxOutput

	// {from}이 {amount}를 지불하기 위해 필요한 {from}소유의 UTXO를 가지고 옵니다.
	// validOutputs : map[string][]int (txID => outIdx)
	acc, validOutputs := chain.FindSpendableOutputs(from, amount)

	// UTXO를 다 모았는데 amount보다 작다면 잔액 부족입니다.
	if acc < amount {
		log.Panic("Error: not enough funds")
	}

	// 모아온 UTXOs에 대해 for loop
	for txid, outs := range validOutputs {
		txID, err := hex.DecodeString(txid)
		Handle(err)

		for _, out := range outs {
			// {txID}를 가지는 트랜잭션의 {out}번째 {from}소유의 아웃풋이 인풋이 됩니다.
			input := TxInput{txID, out, from}
			inputs = append(inputs, input)
		}
	}

	// 이제 트랜잭션의 인풋으로 사용될 UTXO를 모두 모았습니다.
	// 그리고 그 가치의 합은 acc가 될 것입니다.
	// 트랜잭션의 아웃풋은 전송될 TXO, 잔금(반환될) TXO
	// 항상 두개로 이루어집니다.

	// 전송될 TXO
	outputs = append(outputs, TxOutput{amount, to})

	// 반환될 TXO
	if acc > amount {
		outputs = append(outputs, TxOutput{acc - amount, from})
	}

	// 인풋과 아웃풋을 바탕으로 Transaction이 생성됩니다.
	tx := Transaction{nil, inputs, outputs}
	tx.SetID()

	return &tx
}

// 1
// 해당 트랜잭션이 Coinbase 인가?
func (tx *Transaction) IsCoinbase() bool {
	return len(tx.Inputs) == 1 && len(tx.Inputs[0].ID) == 0 && tx.Inputs[0].Out == -1
}

// 1
// Signature를 확인해서 같으면 풀 수 있는 (소유의) Input입니다.
func (in *TxInput) CanUnlock(data string) bool {
	return in.Sig == data
}

// 1
// 공개키를 확인해서 같으면 풀 수 있는 (소유의) Input입니다.
func (out *TxOutput) CanBeUnlocked(data string) bool {
	return out.PubKey == data
}
```

## blockchain/block.go

블록에 데이터 대신 트랜잭션을 저장합니다. 크게 바뀌는 것은 없습니다.

```go
// blockchain/block.go
package blockchain

import (
	"bytes"
	"crypto/sha256"
	"encoding/gob"
	"log"
)

// Block의 구조
type Block struct {
	Hash         []byte         // 현재 블록의 해시
	Transactions []*Transaction // Data 대신 트랜잭션이 기록됨
	PrevHash     []byte         // 이전 블록의 해시
	Nonce        int
}

// Block의 Transaction들을 합쳐서 하나의 해시를 만듭니다.
func (b *Block) HashTransactions() []byte {
	var txHashes [][]byte
	var txHash [32]byte

	for _, tx := range b.Transactions {
		txHashes = append(txHashes, tx.ID)
	}
	txHash = sha256.Sum256(bytes.Join(txHashes, []byte{}))

	return txHash[:]
}

// Transaction과 이전 해시값을 인자로 받는다.
func CreateBlock(txs []*Transaction, prevHash []byte) *Block {
	block := &Block{[]byte{}, txs, prevHash, 0}
	pow := NewProof(block)
	nonce, hash := pow.Run()

	block.Hash = hash[:]
	block.Nonce = nonce

	return block
}

// Genesis Block은 coinbase 트랜잭션을 인자로 받습니다.
func Genesis(coinbase *Transaction) *Block {
	return CreateBlock([]*Transaction{coinbase}, []byte{})
}

// Util 함수
func (b *Block) Serialize() []byte {
	var res bytes.Buffer
	encoder := gob.NewEncoder(&res)

	err := encoder.Encode(b)
	Handle(err)

	return res.Bytes()
}

// Util 함수
func Deserialize(data []byte) *Block {
	var block Block

	decoder := gob.NewDecoder(bytes.NewReader(data))

	err := decoder.Decode(&block)
	Handle(err)

	return &block
}

// Util 함수
func Handle(err error) {
	if err != nil {
		log.Panic(err)
	}
}
```

## blockchain/blockchain.go

우리의 블록체인은 이제 거래 내역을 저장하는 의미있는 블록체인이 되었습니다. 이제 블록체인은 과거의 거래 내역을 토대로 계좌의 잔고를 계산하거나 새로운 거래를 만드는 일을 수행해야합니다.

findUnspentTransaction함수부터는 직접 타이핑하면서 이해하시길 권장합니다.

```go
package blockchain

import (
	"encoding/hex"
	"fmt"
	"os"
	"runtime"

	"github.com/dgraph-io/badger"
)

const (
	dbPath      = "./tmp/blocks"
	dbFile      = "./tmp/blocks/MANIFEST"
	genesisData = "First Transaction from Genesis" // Genesis block의 시그니쳐 데이터
)

// Badger DB를 고려해서 BlockChain을 재설계
// 기존의 Block slice는 메모리에 상주하기 때문에 프로그램 종료시 없어짐.
// DB를 가르키는 포인터를 저장해서 포인터를 통해 블록 관리
type BlockChain struct {
	LastHash []byte     // 마지막 블록의 hash
	Database *badger.DB // Badger DB를 가르키는 포인터
}

// BlockChain DB의 Block을 순회하는 자료구조
type BlockChainIterator struct {
	CurrentHash []byte
	Database    *badger.DB
}

// MANIFEST file 존재 여부로 DB 존재 확인
func DBexists() bool {
	if _, err := os.Stat(dbFile); os.IsNotExist(err) {
		return false
	}
	return true
}

// Blockchain을 새로 만들어 반환하는 함수
func InitBlockChain(address string) *BlockChain {
	var lastHash []byte

	if DBexists() {
		fmt.Println("Blockcahin already exists")
		runtime.Goexit()
	}

	// File명을 통해 DB를 엽니다.
	db, err := badger.Open(badger.DefaultOptions(dbPath))
	Handle(err)

	// db.Update는 Read/Write함수, View는 Read Only 함수입니다.
	// 수정사항(Genesis 생성)이 있기 때문에 Update함수를 사용합니다.
	err = db.Update(func(txn *badger.Txn) error {
		// coinbase 트랜잭션을 만들어서, 이를 통해 Genesis block을 만들어 저장합니다.
		cbtx := CoinbaseTx(address, genesisData)
		genesis := Genesis(cbtx)
		fmt.Println("Genesis created")
		err = txn.Set(genesis.Hash, genesis.Serialize())
		Handle(err)
		err = txn.Set([]byte("lh"), genesis.Hash)

		lastHash = genesis.Hash

		return err
	})

	Handle(err)

	// 마지막 해시와 db pointer를 인자로하여 블록체인을 생성합니다.
	blockchain := BlockChain{lastHash, db}
	return &blockchain
}

// 이미 블록체인이 DB에 있으면 그 정보를 이용해서 *BlockChain을 반환합니다.
func ContinueBlockChain(address string) *BlockChain {
	if !DBexists() {
		fmt.Println("No existing blockchain found, create one!")
		runtime.Goexit()
	}

	var lastHash []byte

	// File명을 통해 DB를 엽니다.
	db, err := badger.Open(badger.DefaultOptions(dbPath))
	Handle(err)

	// 값을 가져오는 것이므로 View를 사용합니다.
	err = db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte("lh"))
		Handle(err)
		lastHash, err = item.ValueCopy(nil)

		return err
	})
	Handle(err)

	chain := BlockChain{lastHash, db}

	return &chain
}

// 새로운 블록을 만들어서 블록체인에 연결하는 함수
func (chain *BlockChain) AddBlock(transactions []*Transaction) {
	var lastHash []byte

	// Read만 하므로 View를 사용
	err := chain.Database.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte("lh"))
		Handle(err)
		lastHash, err = item.ValueCopy(nil)

		return err
	})
	Handle(err)

	// lashHash를 토대로 다음 문제를 풀어 새로운 블록을 생성.
	newBlock := CreateBlock(transactions, lastHash)

	// 블록의 해시를 키값으로 새로운 블록을 저장하고
	// lh의 값 또한 새로운 블록의 해시로 업데이트 해줍니다.
	err = chain.Database.Update(func(txn *badger.Txn) error {
		err := txn.Set(newBlock.Hash, newBlock.Serialize())
		Handle(err)
		err = txn.Set([]byte("lh"), newBlock.Hash)

		chain.LastHash = newBlock.Hash

		return err
	})
	Handle(err)
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

// UTXO가 포함된 모든 트랜잭션을 반환합니다.
func (chain *BlockChain) FindUnspentTransactions(address string) []Transaction {
	var unspentTxs []Transaction

	// 사용된 TXO의 (txID => []Out) 매핑입니다.
	// "{txID}를 가진 트랜잭션의 {[]Out}번째 TXO들은 사용되었다."
	// TxInput에 속한 TXO는 사용된 TXO임을 기억하세요.
	spentTXOs := make(map[string][]int)

	iter := chain.Iterator()

	// 가장 최신의 블록부터 for loop를 수행합니다.
	for {
		block := iter.Next()

		// Block에 저장된 트랜잭션에 대해 for loop 수행
		for _, tx := range block.Transactions {
			txID := hex.EncodeToString(tx.ID)

		Outputs:
			// 트랜잭션의 모든 TXO에대해 for loop
			for outIdx, out := range tx.Outputs {
				// {txID}의 트랜잭션에서 TXO가 사용된 기록이 있고
				if spentTXOs[txID] != nil {
					for _, spentOut := range spentTXOs[txID] {
						// {spentOut}: 사용된 TXO의 index
						if spentOut == outIdx {
							// 사용된 TXO의 Index와 같은 outIdx를 가지는
							// TXO는 사용된 TXO이므로 다음 TXO 조사
							continue Outputs
						}
					}
				}

				// 사용된 기록이 없고, address 소유이면
				// 사용되지 않은 트랜잭션에 추가합니다.
				if out.CanBeUnlocked(address) {
					unspentTxs = append(unspentTxs, *tx)
				}
			}

			// 해당 트랜잭션이 coinbase가 아니라면 (일반 트랜잭션이라면)
			if !tx.IsCoinbase() {
				// 트랜잭션의 input 중에
				for _, in := range tx.Inputs {
					// address 소유인 것들은 사용한 TXO이므로 사용된 TXO 매핑에 추가합니다.
					if in.CanUnlock(address) {
						inTxID := hex.EncodeToString(in.ID)
						spentTXOs[inTxID] = append(spentTXOs[inTxID], in.Out)
					}
				}
			}
		}

		// Genesis 까지 for를 돌았다면 break 합니다.
		if len(block.PrevHash) == 0 {
			break
		}
	}

	// {address}의 사용되지않은 트랜잭션을 반환합니다.
	// TXO가 아닌 UTXO가 포함된 트랜잭션이 반환됨을 유의합니다.
	return unspentTxs
}

func (chain *BlockChain) FindUTXO(address string) []TxOutput {
	var UTXOs []TxOutput // Unspent Transaction Outputs
	unspentTransactions := chain.FindUnspentTransactions(address)

	// 사용되지 않은 트랜잭션들의 Output(UTXO)중에
	// 나{address}의 UTXO들을 저장하여 반환.
	for _, tx := range unspentTransactions {
		for _, out := range tx.Outputs {
			if out.CanBeUnlocked(address) {
				UTXOs = append(UTXOs, out)
			}
		}
	}

	return UTXOs
}

// amount를 집불하기위해 사용될 UTXO를 검색합니다.
// 사용할 수 있는 금액과 사용할 수 있는 TXO를 찾을 수 있는 매핑을 반환합니다.
func (chain *BlockChain) FindSpendableOutputs(address string, amount int) (int, map[string][]int) {
	// UTXO의 txID => outIdx(해당 트랜잭션에서 몇번째 TXO가 UTXO인지) 매핑
	unspentOuts := make(map[string][]int)
	unspentTxs := chain.FindUnspentTransactions(address)
	accumulated := 0

Work:
	// {address}의 사용되지 않은 트랜잭션들에 대해 for loop
	for _, tx := range unspentTxs {
		txID := hex.EncodeToString(tx.ID)

		// 트랜잭션의 모든 Output(TXO)에 대해 for loop
		for outIdx, out := range tx.Outputs {
			// {address}소유이고 지금까지의 UTXO의 합이 amount보다 작다면 해당 UTXO를 추가
			if out.CanBeUnlocked(address) && accumulated < amount {
				accumulated += out.Value
				unspentOuts[txID] = append(unspentOuts[txID], outIdx)

				// amount를 지불하기 위한 UTXO를 충분히 모았다면 for 종료
				if accumulated >= amount {
					break Work // Work로 레이블된 for loop 탈출
				}
			}
		}
	}

	return accumulated, unspentOuts
}
```

## main.go

마지막으로 Cli 프로그램을 수정하도록 하겠습니다. 만들어진 함수를 사용하는 단계이고 크게 어려울 것은 없을 것 같아서 주석은 거의 생략하였습니다.

```go
// main.go
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"runtime"
	"strconv"

	"github.com/siisee11/golang-blockchain/blockchain"
)

// CommandLine은 BlockChain과 상호작용을 해야합니다.
type CommandLine struct{}

// Cli help 메세지 입니다.
func (cli *CommandLine) printUsage() {
	fmt.Println("Usage: ")
	fmt.Println(" getbalance -address ADDRESS - get the balance for address")
	fmt.Println(" createblockchain -address ADDRESS - creates a blockchain(miner: ADDRESS)")
	fmt.Println(" printchain - Prints the blocks in the chain")
	fmt.Println(" send -from FROM -to TO -amount AMOUNT - sends AMOUNT of coin from FROM to TO")
}

// Args(arguments)가 1개면 명령어를 입력하지 않은 것이므로 종료합니다.
func (cli *CommandLine) validateArgs() {
	if len(os.Args) < 2 {
		cli.printUsage()

		// runtime.Goexit은 Go routine을 종료시키는 것이기 때문에
		// applicaion 강제 종료가 아니여서 DB가 정상 종료(close)될 수 있도록 해준다.
		runtime.Goexit()
	}
}

// Chain을 순회하며 블록을 출력합니다.
func (cli *CommandLine) printChain() {
	chain := blockchain.ContinueBlockChain("") // blockchain을 DB로 부터 받아온다.
	defer chain.Database.Close()
	iter := chain.Iterator()

	for {
		block := iter.Next()

		fmt.Printf("Previous Hash: %x\n", block.PrevHash)
		fmt.Printf("Hash: %x\n", block.Hash)

		pow := blockchain.NewProof(block)
		fmt.Printf("PoW: %s\n", strconv.FormatBool(pow.Validate()))
		fmt.Println()

		// if Genesis
		if len(block.PrevHash) == 0 {
			break
		}
	}
}

func (cli *CommandLine) createBlockChain(address string) {
	chain := blockchain.InitBlockChain(address)
	chain.Database.Close()
	fmt.Println("Finished!")
}

func (cli *CommandLine) getBalance(address string) {
	chain := blockchain.ContinueBlockChain("") // blockchain을 DB로 부터 받아온다.
	defer chain.Database.Close()

	balance := 0
	UTXOs := chain.FindUTXO(address)

	for _, out := range UTXOs {
		balance += out.Value
	}

	fmt.Printf("Balance of %s: %d\n", address, balance)
}

func (cli *CommandLine) send(from, to string, amount int) {
	chain := blockchain.ContinueBlockChain("") // blockchain을 DB로 부터 받아온다.
	defer chain.Database.Close()

	tx := blockchain.NewTransaction(from, to, amount, chain)
	chain.AddBlock([]*blockchain.Transaction{tx})
	fmt.Println("Success!")
}

func (cli *CommandLine) run() {
	cli.validateArgs()

	// Go의 option 처리하는 함수들.
	getBalanceCmd := flag.NewFlagSet("getbalance", flag.ExitOnError)
	createBlockchainCmd := flag.NewFlagSet("createblockchain", flag.ExitOnError)
	sendCmd := flag.NewFlagSet("send", flag.ExitOnError)
	printChainCmd := flag.NewFlagSet("printchain", flag.ExitOnError)

	getBalanceAddress := getBalanceCmd.String("address", "", "The address")
	createBlockchainAddress := createBlockchainCmd.String("address", "", "Miner address")
	sendFrom := sendCmd.String("from", "", "Source wallet address")
	sendTo := sendCmd.String("to", "", "Dest wallet address")
	sendAmount := sendCmd.Int("amount", 0, "Amount to send")

	switch os.Args[1] {
	case "getbalance":
		err := getBalanceCmd.Parse(os.Args[2:])
		if err != nil {
			log.Panic(err)
		}
	case "createblockchain":
		err := createBlockchainCmd.Parse(os.Args[2:])
		if err != nil {
			log.Panic(err)
		}
	case "send":
		err := sendCmd.Parse(os.Args[2:])
		if err != nil {
			log.Panic(err)
		}
	case "printchain":
		err := printChainCmd.Parse(os.Args[2:])
		if err != nil {
			log.Panic(err)
		}

	default:
		cli.printUsage()
		runtime.Goexit()
	}

	if getBalanceCmd.Parsed() {
		if *getBalanceAddress == "" {
			getBalanceCmd.Usage()
			runtime.Goexit()
		}
		cli.getBalance(*getBalanceAddress)
	}

	if createBlockchainCmd.Parsed() {
		if *createBlockchainAddress == "" {
			createBlockchainCmd.Usage()
			runtime.Goexit()
		}
		cli.createBlockChain(*createBlockchainAddress)
	}

	if sendCmd.Parsed() {
		if *sendFrom == "" || *sendTo == "" || *sendAmount == 0 {
			sendCmd.Usage()
			runtime.Goexit()
		}
		cli.send(*sendFrom, *sendTo, *sendAmount)
	}

	if printChainCmd.Parsed() {
		cli.printChain()
	}
}

func main() {
	defer os.Exit(0)
	cli := CommandLine{}
	cli.run()
}
```

## Let's Run

블록체인을 새로 생성합니다. 기존의 tmp/blocks의 모든 파일을 삭제하세요.

```go
rm tmp/blocks/*
go run main.go createblockchain -address "Alice"
```

![createblockchain](../.gitbook/assets/image%20%2854%29.png)

chain을 프린트해봅니다.

```go
go run main.go printchain
```

![printchain](../.gitbook/assets/image%20%2842%29.png)

잔고를 확인하세요. 현재 코드에서는 Genesis block을 채굴하면 100을 받게되어있습니다.

```go
go run main.go getbalance -address "Alice"
```

![getbalance](../.gitbook/assets/image%20%2855%29.png)

Alice가 채굴한 100중 50을 Bob에게 보냅니다.

```go
go run main.go send -from "Alice" -to "Bob" -amount 50
```

![send](../.gitbook/assets/image%20%285%29.png)

Bob의 잔고를 확인해보세요.

```go
go run main.go getbalance -address "Bob"
```

![Bob&apos;s balance](../.gitbook/assets/image%20%2840%29.png)



{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step4 브랜치에 있습니다 . 
{% endhint %}





Last update: 2021/04/28

