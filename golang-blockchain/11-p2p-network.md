---
description: libp2p 를 이용하여 p2p방식의 네트워킹을 구현하자.
---

# \#11 p2p network

## go-libp2p

libp2p는 p2p 네트워크 관련된 모듈입니다. 네트워크는 오래된 기술인 만큼 많이 발전하여 통신을 위한 프로토콜이 정말 많습니다. IPFS를 개발할때 모든 머신들이 서로 통신을 해야하는데 노드마다 사용하는 통신이나 호환성등이 다르기 때문에 이를 위해 libp2p를 개발하였다고 합니다. libp2p는 이런 네트워킹 프로토콜들을 추상화해주느데 의미를 갖는다고 생각합니다. 또, p2p 방식의 네트워킹을 위한 라이브러리를 제공해줍니다. 아래는 공식 홈페이지입니다.

{% embed url="https://libp2p.io/" caption="libp2p" %}

우리는 go 언어로 블록체인을 개발하고 있기 때문에 go언어에서 사용할 수 있게 go로 개발된 go-libp2p를 사용할 것입니다.  

{% embed url="https://github.com/libp2p/go-libp2p" caption="go-libp2p" %}

위의 go-libp2p 깃허브에 가면 libp2p를 사용한 chat이나 proxy server등 예시들이 있으니 참고해서 공부하시면 되리라 생각됩니다.

## 구현 할 것

일단 p2p 네트워크 구현의 첫번째 단계로, 기존의 네트워크를 libp2p를 사용하도록 바꾸도록 하겠습니다. 통신 내용 \(HandleXXX, SendXXX\)는 그대로 유지하고 실제로 네트워크 통신하는 코드만 수정합니다.

## network/network.go

기존의 net을 사용하던 네트워크 코드를 삭제하고 \(StartNode, SendData\) 새로 LibP2P를 이용한 코드를 삽입합니다.

```go
// random peer ID를 가진 LibP2P 호스트를 만듭니다.
func makeBasicHost(listenPort int, secio bool, randseed int64) (host.Host, error) {
	// randseed가 0이면 완벽한 랜덤값이 아닙니다. 예측가능한 값이 사용되어 같은 priv가 생성될 것입니다.
	var r io.Reader
	if randseed == 0 {
		r = rand.Reader
	} else {
		r = mrand.New(mrand.NewSource(randseed))
	}

	// 이 호스트의 key pair를 만듭니다.
	priv, _, err := crypto.GenerateKeyPairWithReader(crypto.RSA, 2048, r)
	if err != nil {
		return nil, err
	}

	// 옵션들.
	opts := []libp2p.Option{
		libp2p.ListenAddrStrings(fmt.Sprintf("/ip4/0.0.0.0/tcp/%d", listenPort)),
		libp2p.Identity(priv),
		libp2p.DisableRelay(),
	}

	// 호스트를 만들어 리턴합니다.
	return libp2p.New(context.Background(), opts...)
}

// {data}(cmd + payload)를 보냄
// p2p 에서는 peer ID를 이용하여 통신합니다.
func SendData(destPeerID string, data []byte) {
	peerID, err := peer.Decode(destPeerID)
	if err != nil {
		log.Panic(err)
	}

	// {ha} => {peerID} 의 Stream을 만듭니다.
	// 이 Stream은 {peerID}호스트의 steamHandler에 의해 처리될 것입니다.
	s, err := ha.NewStream(context.Background(), peerID, "/p2p/1.0.0")
	if err != nil {
		log.Printf("%s is not reachable\n", destPeerID)
		// TODO: 통신이 되지 않는 {peer}를 KnownNodes에서 삭제합니다.
		var updatedPeers []string

		// 통신이 되지 않는 {addr}를 KnownNodes에서 삭제합니다.
		for _, node := range KnownNodes {
			if node != destPeerID {
				updatedPeers = append(updatedPeers, node)
			}
		}

		KnownNodes = updatedPeers

		return
	}
	defer s.Close()

	_, err = s.Write(data)
	if err != nil {
		log.Println(err)
		return
	}
}

// {targetPeer}에게 {data}를 보냅니다.
// 1회성 host를 만들어 전송합니다.
func SendDataOnce(targetPeer string, data []byte) {
	host, err := libp2p.New(context.Background())
	if err != nil {
		log.Panic(err)
	}
	defer host.Close()
	ha = host

	destPeerID := addAddrToPeerstore(host, targetPeer)
	SendData(peer.Encode(destPeerID), data)
}

// 호스트의 0번째 주소를 알아옵니다.
func getHostAddress(_ha host.Host) string {
	// Build host multiaddress
	hostAddr, _ := ma.NewMultiaddr(fmt.Sprintf("/ipfs/%s", _ha.ID().Pretty()))

	// Now we can build a full multiaddress to reach this host
	// by encapsulating both addresses:
	addr := _ha.Addrs()[0]
	return addr.Encapsulate(hostAddr).String()
}

// Stream을 받았을 때 처리하는 핸들러 함수
func handleStream(s network.Stream) {
	// 일이 다 끝나면 stream을 종료합니다.
	defer s.Close()

	// Non blocking read/write를 위해 버퍼 스트림을 만듭니다.
	rw := bufio.NewReadWriter(bufio.NewReader(s), bufio.NewWriter(s))

	// connection 처리는 asynchronous하게 go routine으로 처리
	go HandleP2PConnection(rw)
}

// Host를 시작합니다.
func StartHost(listenPort int, minter string, secio bool, randseed int64, targetPeer string) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// minter의 주소를 global 변수에 저장.
	minterAddress = minter

	// {listenPort}가 nodeId로 쓰이게됩니다.
	nodeId := fmt.Sprintf("%d", listenPort)
	chain = blockchain.ContinueBlockChain(nodeId)
	go CloseDB(chain) // 하드웨어 인터럽트를 대기하고 있다가 안전하게 DB를 닫는 함수
	defer chain.Database.Close()

	// p2p host를 만듭니다.
	host, err := makeBasicHost(listenPort, secio, randseed)
	if err != nil {
		log.Panic(err)
	}
	// {host}를 전역변수 {ha}에 저장합니다.
	ha = host
	// {nodePeerId}: 이 노드의 peer ID 입니다.
	// 통신에 Peer Id 가 사용됩니다.
	nodePeerId = peer.Encode(host.ID())

	if len(KnownNodes) == 0 {
		// KnownNodes[0]는 자기 자신입니다.
		KnownNodes = append(KnownNodes, nodePeerId)
	}

	if targetPeer == "" {
		// listen 합니다.
		runListener(ctx, ha, listenPort, secio)
	} else {
		// listen하면서 listening하고 있는 서버에 접속합니다.
		runSender(ctx, ha, targetPeer)
	}

	// Wait forever
	select {}
}

// listening server를 구동합니다. (중앙 서버)
func runListener(ctx context.Context, ha host.Host, listenPort int, secio bool) {
	fullAddr := getHostAddress(ha)
	log.Printf("I am %s\n", fullAddr)

	// StreamHandler를 Set합니다.
	// {handleStream}은 stream을 받았을 때 불리는 핸들러 함수 입니다.
	// /p2p/1.0.0은 user-defined protocal 입니다.
	ha.SetStreamHandler("/p2p/1.0.0", handleStream)

	log.Printf("Now run \"go run main.go startp2p -dest %s\" on a different terminal\n", fullAddr)
}

// StreamHandler를 설정하고, {targetPeer}에게 Version 정보를 보냅니다.
func runSender(ctx context.Context, ha host.Host, targetPeer string) {
	fullAddr := getHostAddress(ha)
	log.Printf("I am %s\n", fullAddr)

	ha.SetStreamHandler("/p2p/1.0.0", handleStream)

	// targetPeer를 ha의 Peerstore에 저장하고 destination의 peerId를 받아옵니다.
	destPeerID := addAddrToPeerstore(ha, targetPeer)

	// {destPeerID}에게 {chain}의 Version을 보냅니다.
	SendVersion(peer.Encode(destPeerID), chain)
}

// peer의 {addr}를 받아 multiaddress로 파싱한 후 host의 peerstore에 저장합니다.
// 해당 정보로 peer ID를 알면 어떻게 통신해야하는 지 알 수 있습니다.
// peer의 ID를 반환합니다.
func addAddrToPeerstore(ha host.Host, addr string) peer.ID {
	// multiaddress로 파싱 후
	ipfsaddr, err := ma.NewMultiaddr(addr)
	if err != nil {
		log.Fatalln(err)
	}

	// multiaddress에서 Address와 PeerID 정보를 알아옵니다.
	info, err := peer.AddrInfoFromP2pAddr(ipfsaddr)
	if err != nil {
		log.Fatalln(err)
	}

	// LibP2P가 참고할 수 있도록
	// Peer ID와 address를 peerstore에 저장합니다.
	ha.Peerstore().AddAddrs(info.ID, info.Addrs, peerstore.PermanentAddrTTL)
	return info.ID
}
```

"send" 커맨드에서 사용할 SendTxOnce 함수도 추가로 구현합니다. \(이전 코드와 호환을 위해 추가되었지만, 코드 미용상 문제가 있으니 조만간 없어질 것입니다.\)

```go
// Transaction을 보냄 (전송 한번 후에 종료되는 경우)
func SendTxOnce(addr string, tnx *blockchain.Transaction) {
	data := Tx{nodePeerId, tnx.Serialize()}
	payload := GobEncode(data)
	request := append(CmdToBytes("tx"), payload...)

	SendDataOnce(addr, request)
}
```

Global variable 부분과 import 부분도 수정해줍니다.

```go
import (
	"bufio"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/gob"
	"encoding/hex"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	mrand "math/rand"
	"os"
	"runtime"
	"syscall"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p-core/crypto"
	"github.com/libp2p/go-libp2p-core/host"
	"github.com/libp2p/go-libp2p-core/network"
	"github.com/libp2p/go-libp2p-core/peer"
	peerstore "github.com/libp2p/go-libp2p-peerstore"
	ma "github.com/multiformats/go-multiaddr"
	"github.com/siisee11/golang-blockchain/blockchain"
	DEATH "github.com/vrecan/death/v3"
)

var (
	chain           *blockchain.BlockChain
	ha              host.Host // 지금 노드의 host
	nodePeerId      string    // p2p에서 사용될 이 노드의 peerId
	minterAddress   string    // minter의 주소
	KnownNodes      = []string{}
	blocksInTransit = [][]byte{}
	memoryPool      = make(map[string]blockchain.Transaction) // txID => Transaction
)
```



## cli/cli.go

cli 에서 startnode커맨드를 삭제하고 startp2p 커맨드를 추가하겠습니다. 역시 Flag나 Cmd에 대한 코드는 생략하겠습니다.

```go
// {nodeId}를 listen 포트로 서버를 시작합니다.
// {minterAddress}가 있다면 이 서버는 minter로 동작하며
// transaction을 모은 후 블록을 생성하여 {minterAddress}에 보상을 받습니다.
// {dest}가 있다면 {dest}노드를 통해 p2p 네트워크에 접속합니다.
func (cli *CommandLine) StartP2P(nodeId, minterAddress, dest string, secio bool) {
	fmt.Printf("Starting Host localhost:%s\n", nodeId)

	wallets, _ := wallet.CreateWallets(nodeId)
	minterAddress = wallets.GetAddress(minterAddress)

	if len(minterAddress) > 0 {
		if wallet.ValidateAddress(minterAddress) {
			fmt.Println("Mining is on. Address to receive rewards: ", minterAddress)
		} else {
			log.Panic("Wrong minter address!")
		}
	}

	port, err := strconv.Atoi(nodeId)
	if err != nil {
		log.Panic(err)
	}

	network.StartHost(port, minterAddress, secio, 0, dest)
}
```

send 함수에서 SendTx는 아직 host를 생성하지 않았기 때문에 사용하지 못하므로, SendTxOnce 함수를 사용합니다. 중앙 노드의 peerID가 "localhost:3000"처럼 고정되어 있지 않기 때문에 메세지를 보낼 대상인 targetPeer로 인자로 추가해야합니다. \(아래 Cmd 인자 추가도 잊지 마세요.\) 

```go
// {from}에서 {to}로 {amount}만큼 보냅니다.
// {mintNow}가 true이면 send트랜잭션을 담은 블록을 생성하고
// {mintNow}가 false이면 트랜잭션을 만들어 중앙 노드(targetPeer)에게 보냅니다.
func (cli *CommandLine) send(alias, to, targetPeer string, amount int, nodeId string, mintNow bool) {
	wallets, _ := wallet.CreateWallets(nodeId)
	from := wallets.GetAddress(alias)
	if !wallet.ValidateAddress(from) {
		log.Panic("Address is not Valid")
	}
	if !wallet.ValidateAddress(to) {
		log.Panic("Address is not Valid")
	}
	chain := blockchain.ContinueBlockChain(nodeId) // blockchain을 DB로 부터 받아온다.
	UTXOset := blockchain.UTXOSet{Blockchain: chain}
	defer chain.Database.Close()

	wallets, err := wallet.CreateWallets(nodeId)
	if err != nil {
		log.Panic(err)
	}
	wallet := wallets.GetWallet(from)

	tx := blockchain.NewTransaction(&wallet, to, amount, &UTXOset) // send 트랜잭션도 생성하여
	if mintNow {
		cbTx := blockchain.CoinbaseTx(from, "") // 코인베이스 트랜잭션을 생성하고
		txs := []*blockchain.Transaction{cbTx, tx}
		block := chain.MintBlock(txs)
		UTXOset.Update(block)
	} else {
		network.SendTxOnce(targetPeer, tx)
		fmt.Println("send tx")
	}

	fmt.Println("Success!")
}
```

## Test

먼저, 사용한 go-libp2p 모듈을 다운로드 받아야합니다. 

```bash
go get github.com/libp2p/go-libp2p
go mod tidy
```

동작은 커맨드가 살짝 다른 것 말고는 \#10과 같습니다.

{% hint style="info" %}
대신, 이번 파트에서는 같은 LAN \(192.168.0.x\)의 다른 컴퓨터끼리도 통신이 가능합니다.
{% endhint %}

 간단하게 다시 진행해보겠습니다. 일단 3000번 노드에서 지갑과 블록체인을 만들고 초기 블록체인을 복사한 후 send를 진행합니다.

```bash
// NODE 3000
export NODE_ID=3000
go run main.go createwallet -alias w1
go run main.go createblockchain -address w1
cp -r tmp/blocks_3000 tmp/blocks_3001
cp -r tmp/blocks_3000 tmp/blocks_3002
go run main.go send -from w1 -to <address of w2> -amount 10 -mint

// NODE 3001
export NODE_ID=3001
go run main.go createwallet -alias w2
```

![](../.gitbook/assets/image%20%28117%29.png)

다음으로 3000번 노드의 서버를 구동하고, 하나의 터미널을 더 켜서 NODE\_ID 3002를 부여하고 minter옵션을 주어 서버를 구동합니다.

```bash
export NODE_ID=3002
go run main.go createwallet -alias w3
go run main.go startp2p -dest <targetPeer> -minter w3
```

![](../.gitbook/assets/image%20%28115%29.png)

3001번 노드에서 send 트랜잭션 두개를 발생시키면 다른 서버가 해당 트랜잭션을 받고 3002번 노드에서는 minting이 발생함을 볼 수 있다.

```bash
go run main.go startp2p -dest <targetPeer>
go run main.go send -from w2 -to <wallet of node 1> -amount 1 -peer <targetPeer> 
```

![](../.gitbook/assets/image%20%28120%29.png)



{% hint style="success" %}
여기 까지의 구현은  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step11 브랜치에 있습니다 . 
{% endhint %}

Last updated: May 16, 2021

