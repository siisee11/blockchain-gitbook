---
description: Rendezvous를 이용해 P2P 네트워크 구축
---

# \#12 Peer Discovery

이번 스텝에서는 Rendezvous\(랑데부\)를 사용해서 P2P 네트워크에서 peer 노드를 찾아 네트워크에 접속할 수 있도록 할 것입니다. 프로그램이 처음 네트워크에 접속하는 것을 bootstrapping이라고 부릅니다.

Bootstrap을 하기위해 네트워크에 참여하고 있는 peer node의 IP 주소를 알아와야합니다. 이를 Peer Discovery 라고 부릅니다. Peer Discovery를 위한 방법은 여러가지가 있습니다. 비트코인은 아주 초기에[ IRC](https://namu.wiki/w/IRC)에 의존하여 Peer 정보를 공유하여 모든 노드가 공유된 Peer 노드에 접속했습니다. 지금의 비트코인 클라이언트는 DNS seed를 이용하여 peer discovory를 합니다. 자세한 내용은 [네트워크](../bitcoin/bitcoin-network.md) 문서를 참고하길 바랍니다.

우리는 rendezvous 방법을 이용해 Peer Discovery를 구현할 것입니다. \(참고로 이더리움에서 local network를 구축할 때 이 rendezvous 방법이 쓰입니다.\)

## 구현 할 것

이 파트에서는 크게 두가지의 기능을 구현할 것입니다. 

1. 랑데뷰 방식 Peer discovery를 진행하여 P2P 네트워크에 접속할 수 있도록 합니다.
2. Peer의 정보를 영구적으로 저장하여 다음 bootstrapping 시에 peer discovery를 하지 않고도 네트워크에 접속할 수 있도록 합니다. 

기타 코드 수정 내역은 아래와 같습니다.

1. Genesis 블록을 하드코딩하여 새로 참여하는 노드가 통신을 하지 않고도 Genesis 블록을 가질 수 있게 되었습니다.
2. Send를 호출하기 위해 유통되는 코인이 필요하므로 임시적으로 mint 함수를 구현하여 코인을 받을 수 있도록 하였습니다.

우선 구현해야할 Rendezvous 방식이 어떻게 동작하는 지와 노드가 시작할 때 어떤 플로우를 따라가는 지 살펴보고 구현을 시작하도록 하겠습니다.

## network/network.go

먼저 network 코드의 가장 중심인 StartHost 함수부터 보도록 하겠습니다. StartHost는 P2P 호스트를 만들고 네트워크의 어떠한 한 Peer와 연결하는 것이 목적입니다. Peer 하나만 연결하면 해당 피어에서 주는 정보들로 더 많은 피어와 연결할 수 있습니다.

1. Peer DB에 저장되어 있는 Peer들에게 먼저 접속합니다. 만약 연결된다면 Peer Discovery는 진행하지 않습니다.
2. Peer DB의 Peer들에게 접속이 실패했다면 랑데뷰 방식으로 Peer Discovery 후 연결합니다.

```go
// Host를 시작합니다.
func StartHost(listenPort int, minter string, secio bool, randseed int64, rendezvous string, bootstrapPeers []ma.Multiaddr) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// minter의 주소를 global 변수에 저장.
	minterAddress = minter

	// {listenPort}가 nodeId로 쓰이게됩니다.
	NodeId = fmt.Sprintf("%d", listenPort)
	// chain을 전역변수에 저장
	Chain = blockchain.ContinueBlockChain(NodeId)
	go CloseDB(Chain.Database) // 하드웨어 인터럽트를 대기하고 있다가 안전하게 DB를 닫는 함수
	defer Chain.Database.Close()

	// P2P host를 만듭니다.
	host, err := makeBasicHost(listenPort, secio, randseed)
	if err != nil {
		log.Panic(err)
	}

	// {host}를 전역변수 {ha}에 저장합니다.
	ha = host
	// {nodePeerId}: 이 노드의 peer ID 입니다.
	// 통신에 Peer Id 가 사용됩니다.
	nodePeerId = peer.Encode(host.ID())

	if len(KnownPeers) == 0 {
		// KnownPeers[0]는 자기 자신입니다.
		KnownPeers = append(KnownPeers, nodePeerId)
	}

	fullAddr := getHostAddress(ha)
	log.Printf("I am %s\n", fullAddr)

	ha.SetStreamHandler("/p2p/1.0.0", handleStream)

	// 저장되어 있는 peer들을 불러옵니다.
	peers, err := GetPeerDB(NodeId)
	if err != nil {
		log.Println(err)
	}
	go CloseDB(peers.Database)
	defer peers.Database.Close()

	// 저장되어 있는 피어에 우선 접속해봅니다.
	connected := connectToKnownPeer(host, peers)
	// 저장되어 있는 피어와 연결되지 않았다면
	if !connected {
		peerDiscovery(ctx, host, peers, rendezvous, bootstrapPeers)
	}

	// Wait forever
	select {}
}
```

StartHost 코드 마지막에 부르는 connectToKnownPeer 함수와 peerDiscovery 함수 구현을 살펴보겠습니다.

```go

// DB에 저장된 Peer들에게 연락합니다.
func connectToKnownPeer(host host.Host, peers *Peers) bool {
	// 저장되어 있는 peer들을 출력합니다.
	peerAddrInfos := peers.FindAllAddrInfo()
	log.Println("\033[1;36mIn peers DB:\033[0m")
	for _, peerAddrInfo := range peerAddrInfos {
		fmt.Printf("%s\n", peerAddrInfo)
	}

	// 먼저 저장되어 있는 peer들에게 연결합니다.
	for _, peerinfo := range peerAddrInfos {
		// {host} => {peer} 의 Stream을 만듭니다.
		// 이 Stream은 {peer}호스트의 steamHandler에 의해 처리될 것입니다.
		s, err := host.NewStream(context.Background(), peerinfo.ID, "/p2p/1.0.0")
		if err != nil {
			log.Printf("%s is \033[1;33mnot reachable\033[0m\n", peerinfo.ID)

			// 연결할 수 없다면 peer DB에서 삭제합니다.
			peers.DeletePeer(peerinfo.ID)
			log.Printf("%s => %s deleted\n", peerinfo.ID, peerinfo.Addrs)

			// TODO: 통신이 되지 않는 {peer}를 KnownPeers에서 삭제합니다.
			var updatedPeers []string

			// 통신이 되지 않는 {addr}를 KnownPeers에서 삭제합니다.
			for _, node := range KnownPeers {
				if node != peer.Encode(peerinfo.ID) {
					updatedPeers = append(updatedPeers, node)
				}
			}

			KnownPeers = updatedPeers
		} else {
			// 연결되었으면 Version 메세지를 보낸다.
			SendVersion(peer.Encode(peerinfo.ID), Chain)
			s.Close()
			return true
		}
	}

	return false
}

// rendezvous point에서 다른 peer들의 정보를 알아와서 연결합니다.
func peerDiscovery(ctx context.Context, host host.Host, peers *Peers, rendezvous string, bootstrapPeers []ma.Multiaddr) {
	kademliaDHT, err := dht.New(ctx, host)
	if err != nil {
		panic(err)
	}

	log.Println("Bootstrapping the DHT")
	if err = kademliaDHT.Bootstrap(ctx); err != nil {
		panic(err)
	}

	// Bootstrap 노드들은 네트워크에 속한 다른 노드들의 정보를 알려줍니다.
	// 물론 우리의 정보도 접속하는 다른 노드에게 전달합니다.
	var wg sync.WaitGroup
	for _, peerAddr := range bootstrapPeers {
		peerinfo, _ := peer.AddrInfoFromP2pAddr(peerAddr)
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := host.Connect(ctx, *peerinfo); err != nil {
				log.Fatalln(err)
			} else {
				log.Println("Connection established with bootstrap node:", *peerinfo)
			}
		}()
	}
	wg.Wait()

	// rendezvous point에 우리의 정보를 적습니다.
	log.Println("Announcing ourselves...")
	routingDiscovery := discovery.NewRoutingDiscovery(kademliaDHT)
	discovery.Advertise(ctx, routingDiscovery, rendezvous)
	log.Println("Successfully announced!")
	log.Println("Searching for other peers...")
	log.Printf("Now run \"go run main.go startp2p -rendezvous %s\" on a different terminal\n", rendezvous)

	// peer들을 찾습니다. []peer.AddrInfo를 리턴합니다.
	peerChan, err := routingDiscovery.FindPeers(ctx, rendezvous)
	if err != nil {
		panic(err)
	}

	for p := range peerChan {
		if p.ID == host.ID() {
			continue
		}

		// 유효한 Addrs를 가지고 있으면
		if len(p.Addrs) > 0 {
			log.Println("\033[1;36mConnecting to:\033[0m", p)
			// 이 정보를 Peer DB에 저장합니다
			peers.AddPeer(p)

			// Stream을 엽니다.
			s, err := ha.NewStream(context.Background(), p.ID, "/p2p/1.0.0")
			if err != nil {
				log.Printf("%s is \033[1;33mnot reachable\033[0m\n", p.ID)

				// Stream 생성에 에러가 생기면 PeerDB에서 Peer를 삭제합니다.
				peers.DeletePeer(p.ID)
				log.Printf("%s => %s \033[1;33mdeleted\033[0m\n", p.ID, p.Addrs)
			} else {
				s.Close()
				// {p}에게 {Chain}의 Version을 보냅니다.
				SendVersion(peer.Encode(p.ID), Chain)
			}

		} else {
			// 유효하지 않은 Peer입니다. 혹시 DB에 저장되어 있을 수 있으니 삭제합니다.
			peers.DeletePeer(p.ID)
			log.Println("\033[1;31mINVAILD ADDR\033[0m", p)
		}
	}
}
```

또한 이제 중앙 노드는 없기 때문에 HandleTx함수에서 중앙 노드관련 구문을 삭제해주세요.

```go
-       // 중앙 노드이면
-       if nodePeerId == KnownNodes[0] {
-              ...
-       }
```

이외에도 SendData 함수에서 연결되지않는 노드를 Peer DB에서 삭제하는 등의 수정사항이 있습니다. 자세한 수정사항은 12 branch에 가서 확인해주세요.

## network/peers.go

Peer의 정보를 저장하는 Peer 데이터베이스 코드를 구현하겠습니다. 전반적인 구조는 blockchain과 거의 동일합니다. Peer ID를 key값으로 하고 AddrInfo를 벨류로 합니다.

```go
package network

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/dgraph-io/badger"
	"github.com/libp2p/go-libp2p-core/peer"
)

const (
	peerDBPath = "./tmp/peers_%s"
	peerDBFile = "MANIFEST"
)

type Peers struct {
	Database *badger.DB
}

func PeerDBexist(path string) bool {
	if _, err := os.Stat(path + "/" + peerDBFile); os.IsNotExist(err) {
		return false
	}
	return true
}

// Peers를 만듭니다.
func GetPeerDB(nodeId string) (*Peers, error) {
	path := fmt.Sprintf(peerDBPath, nodeId)

	// File명을 통해 DB를 엽니다.
	opts := badger.DefaultOptions(path)
	// log 무시
	//	opts.Logger = nil
	db, err := openDB(path, opts)
	if err != nil {
		log.Panic(err)
	}

	peers := Peers{db}

	return &peers, err
}

// Peers에 정보를 추가합니다.
// []byte(peer.ID) => peer.AddrInfo
func (pa *Peers) AddPeer(info peer.AddrInfo) {
	err := pa.Database.Update(func(txn *badger.Txn) error {
		if _, err := txn.Get([]byte(info.ID)); err == nil {
			return nil
		}

		infoData, _ := info.MarshalJSON()
		err := txn.Set([]byte(info.ID), infoData)

		return err
	})
	if err != nil {
		log.Panic(err)
	}
}

// Peers에서 {pid}정보를 삭제합니다..
func (pa *Peers) DeletePeer(pid peer.ID) {
	err := pa.Database.Update(func(txn *badger.Txn) error {
		if err := txn.Delete([]byte(pid)); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		log.Panic(err)
	}
}

func (pa Peers) FindAllAddrInfo() []peer.AddrInfo {
	db := pa.Database
	var addrInfos []peer.AddrInfo

	err := db.View(func(txn *badger.Txn) error {
		opts := badger.DefaultIteratorOptions

		it := txn.NewIterator(opts)
		defer it.Close()

		for it.Rewind(); it.Valid(); it.Next() {
			item := it.Item()
			//			k := item.Key()
			err := item.Value(func(v []byte) error {
				tmp := peer.AddrInfo{}
				tmp.UnmarshalJSON(v)
				log.Println(tmp)
				addrInfos = append(addrInfos, tmp)
				return nil
			})
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Panic(err)
	}
	return addrInfos
}

func retry(dir string, originalOpts badger.Options) (*badger.DB, error) {
	lockPath := filepath.Join(dir, "LOCK")
	if err := os.Remove(lockPath); err != nil {
		return nil, fmt.Errorf(`removing "LOCK": %s`, err)
	}
	retryOpts := originalOpts
	retryOpts.Truncate = true
	db, err := badger.Open(retryOpts)
	return db, err
}

func openDB(dir string, opts badger.Options) (*badger.DB, error) {
	if db, err := badger.Open(opts); err != nil {
		if strings.Contains(err.Error(), "LOCK") {
			if db, err := retry(dir, opts); err == nil {
				log.Println("database unlocked, value log truncated")
				return db, nil
			}
			log.Println("could not unlock database:", err)
		}
		return nil, err
	} else {
		return db, nil
	}
}
```

## cli/cli.go

크게 변한 코드는 없습니다. 임시로 mint 함수를 추가합니다. 

```go
func (cli *CommandLine) mint(to string, nodeId string) {
	wallets, _ := wallet.CreateWallets(nodeId)
	to = wallets.GetAddress(to)
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

	cbTx := blockchain.CoinbaseTx(to, "") // 코인베이스 트랜잭션을 생성하고
	txs := []*blockchain.Transaction{cbTx}
	block := chain.MintBlock(txs)
	UTXOset.Update(block)

	fmt.Println("Success!")
}
```

## 실행

지갑을 만들고 rendezvous 문자열을 "tuto"로 하여 P2P 호스트를 실행하겠습니다. 

```text
export NODE_ID=3000
go run main.go createwallet -alias w1
go run main.go startp2p -rendezvous tuto
```

![startp2p](../.gitbook/assets/image%20%28115%29.png)

다른 터미널을 열어서 NODE\_ID를 3001로 하여 호스트를 실행해봅시다.

```text
export NODE_ID=3001
go run main.go startp2p -rendezvous tuto 
```

{% hint style="warning" %}
Bootstrap노드에 정보가 아직 전파 되지 않아 접속이 안될 수도 있습니다. 잠시 시간을 두고 다시 커맨드를 실행하면 접속이 될 것입니다.
{% endhint %}

접속이 된 것을 확인하면 3001번 노드의 접속을 끊고\(ctrl-c\) 블록을 추가한 후 다시 접속합니다.

```text
go run main.go mint -minter w2
go run main.go startp2p -rendezvous tuto
```

![](../.gitbook/assets/image%20%28124%29.png)

새로 추가된 블록을 3000번 노드로 전송하는 것을 확인할 수 있습니다.



{% hint style="success" %}
여기 까지의 구현은  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step12 브랜치에 있습니다 . 
{% endhint %}

Last updated: May 21, 2021

