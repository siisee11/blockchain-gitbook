---
description: 블록체인을 DB에 저장하자.
---

# \#3 Save blockchain persistently

\#2 까지의 블록체인은 프로그램이 돌아가는 동안만 메모리에 존재합니다. 매 실행마다 블록이 Genesis부터 다시 생성되고, 어디에도 영구적으로 저장되지 않습니다.

\#3에서는 BadgerDB를 이용해서 블록체인을 영구적으로 저장할 것입니다. 블록을 생성하면 DB에 저장하며,  프로그램을 다시 시작하면 DB에서 블록체인을 불러옵니다.

## BadgerDB

BadgerDB는 LSMTree 자료구조를 사용한 Key-Value 스토어 입니다. 전공 분야가 등장해서 기쁜 마음에 설명을 하고 싶지만, 사실 DB의 내부 동작 방식까지 학습하는 것은 이 문서의 목표와 어긋나므로 생략하겠습니다. 

**Key-Value 스토어**라는 단어는 그래도 알아두어야 합니다. Key와 Value를 한 쌍으로 데이터베이스에 저장하는 데이터베이스 구조를 말합니다. Key-Value 스토어는 Query를 주로 사용하는 데이터베이스들과는 다르게 Key를 통해서만 Value에 접근 할 수 있습니다.

Key-Value 스토어에는 크게 두가지의 연산이 존재합니다. Set, Get \(혹은 Insert, Search\)가 그것입니다. **Set**은 Key를 통해 접근할 수 있는 공간에 Value를 저장하는 일을 말합니다. **Get**은 Key를 통해 Value에 접근해서 그 값을 가져옵니다.

마지막으로 데이터베이스에는 **트랜잭션**이라는 용어가 자주 등장합니다. 한 번에 일어나야되는 작업의 묶음이라고 생각하면 됩니다. 예를 들어서 엘리스가 밥에게 1000원을 보내는 일이라면 엘리스의 잔고에서 1000원을 빼고 밥의 잔고에 1000원을 더하는 작업이 하나의 트랜잭션이 됩니다. 

아래 문서는 Badger의 get stared 문서입니다. 막히는게 있으면 참고하세요.

{% embed url="https://dgraph.io/docs/badger/get-started/\#managing-transactions-manually" caption="Badger document" %}

## blockchain/blockchain.go

새로운 파일\(`blockchain/blockchain.go` \)을 생성합니다. 블록을 저장하고 접근할 수 있게 해주는 Blockchain structure를 새로운 파일에 따로 다시 정의하였습니다.

```go
package blockchain

import (
	"fmt"

	"github.com/dgraph-io/badger"
)

const (
	dbPath = "./tmp/blocks"
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

// Blockchain이 DB에 저장되어 있다면 불러오고,
// 없다면 새로 만들어 반환하는 함수
func InitBlockChain() *BlockChain {
	var lastHash []byte

	// File명을 통해 DB를 엽니다.
	db, err := badger.Open(badger.DefaultOptions(dbPath))
	Handle(err)

	// db.Update는 Read/Write함수, View는 Read Only 함수입니다.
	// 수정사항(Genesis 생성)이 있기 때문에 Update함수를 사용합니다.
	err = db.Update(func(txn *badger.Txn) error {
		// Txn(transaction) closure

		// "lh"(lash hash)로 검색했는데 키가 발견되지 않았다면 저장이 안되어 있는것.
		if _, err := txn.Get([]byte("lh")); err == badger.ErrKeyNotFound {
			fmt.Println("No existing blockchain found")
			genesis := Genesis()
			fmt.Println("Genesis proved")

			// Key{genesis.Hash}, Value{genesis.Serialize()}를 넣습니다.
			// Serialize()함수로 block을 []byte로 바꾸어 저장합니다.
			err = txn.Set(genesis.Hash, genesis.Serialize())
			Handle(err)

			// "lh" (마지막 해시)도 저장합니다.
			err = txn.Set([]byte("lh"), genesis.Hash)
			lastHash = genesis.Hash

			return err
		} else {
			// "lh"가 검색이되면 블록체인이 저장되어 있는 것.
			item, err := txn.Get([]byte("lh"))
			Handle(err)
			lastHash, err = item.ValueCopy(nil)
			return err
		}
	})

	Handle(err)

	// 마지막 해시와 db pointer를 인자로하여 블록체인을 생성합니다.
	blockchain := BlockChain{lastHash, db}
	return &blockchain
}

// 새로운 블록을 만들어서 블록체인에 연결하는 함수
func (chain *BlockChain) AddBlock(data string) {
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
	newBlock := CreateBlock(data, lastHash)

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

// 아래 함수들은 Block을 iteration할 수 있도록 도와주는
// Iterator 관련 함수입니다.
// 아래 함수는 BlockChainIterator를 생성하여 반환합니다.
func (chain *BlockChain) Iterator() *BlockChainIterator {
	iter := &BlockChainIterator{chain.LastHash, chain.Database}
	return iter
}

// Iterator는 순회를 목적으로 하기때문에
// 다음 객체를 반환하는 것이 중요합니다.
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

## blockchain/block.go

Block 객체가 BadgerDB에 저장될 수 있도록 \[\]byte화 시키는 함수와 다시 \[\]byte를 Block으로 돌리는 함수의 추가 구현이 필요합니다. 또, 에러 핸들링이 빈번하니 함수로 만들겠습니다.

```go
// Badger DB가 arrays of byte 밖에 수용하지 못하기 때문에
// Block data structure를 serialize, deserialize해줄
// Util함수가 필요하다.
func (b *Block) Serialize() []byte {
	var res bytes.Buffer
	encoder := gob.NewEncoder(&res)

	err := encoder.Encode(b)
	Handle(err)

	return res.Bytes()
}

func Deserialize(data []byte) *Block {
	var block Block

	decoder := gob.NewDecoder(bytes.NewReader(data))

	err := decoder.Decode(&block)
	Handle(err)

	return &block
}

func Handle(err error) {
	if err != nil {
		log.Panic(err)
	}
}
```

## main.go

이제 블록체인에 명령을 전달할 수 있도록 Cli\(Command Line Interface\)를 제공하도록 하겠습니다. \(아직은 인터페이스라하기는 그렇지만...\)

```go
// main.go
package main

import (
	"flag"
	"fmt"
	"os"
	"runtime"
	"strconv"

	"github.com/siisee11/golang-blockchain/blockchain"
)

// CommandLine은 BlockChain과 상호작용을 해야합니다.
type CommandLine struct {
	blockchain *blockchain.BlockChain
}

// Cli help 메세지 입니다.
func (cli *CommandLine) printUsage() {
	fmt.Println("Usage: ")
	fmt.Println(" add -block BLOCK_DATA - Add a block to the chain ")
	fmt.Println(" print - Prints the blocks in the chain")
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

// AddBlock을 데이터를 담아 호출하여 새로운 블록을 만듭니다.
func (cli *CommandLine) addBlock(data string) {
	cli.blockchain.AddBlock(data)
	fmt.Println("Added Block!")
}

// Chain을 순회하며 블록을 출력합니다.
// LastHash 부터 Genesis순으로 출력합니다. (Iterator 구현을 기억!)
func (cli *CommandLine) printChain() {
	iter := cli.blockchain.Iterator()

	for {
		block := iter.Next()

		fmt.Printf("Previous Hash: %x\n", block.PrevHash)
		fmt.Printf("Data in Block: %s\n", block.Data)
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

func (cli *CommandLine) run() {
	cli.validateArgs()

	// Go의 option 처리하는 함수들.
	addBlockCmd := flag.NewFlagSet("add", flag.ExitOnError)
	printChainCmd := flag.NewFlagSet("print", flag.ExitOnError)
	addBlockData := addBlockCmd.String("block", "", "Block data")

	switch os.Args[1] {
	case "add":
		err := addBlockCmd.Parse(os.Args[2:])
		blockchain.Handle(err)
	case "print":
		err := printChainCmd.Parse(os.Args[2:])
		blockchain.Handle(err)
	default:
		cli.printUsage()
		runtime.Goexit()
	}

	if addBlockCmd.Parsed() {
		if *addBlockData == "" {
			addBlockCmd.Usage()
			runtime.Goexit()
		}
		cli.addBlock(*addBlockData)
	}

	if printChainCmd.Parsed() {
		cli.printChain()
	}
}

func main() {
	defer os.Exit(0)
	// Blockchain을 초기화 한다. 이는 Genesis block을 만드는 작업을 포함한다.
	chain := blockchain.InitBlockChain()
	defer chain.Database.Close()

	cli := CommandLine{chain}
	cli.run()
}
```

## Go run main.go

main을 실행합니다. 디펜던시가 자동으로 설치되어 실행됩니다.

```text
mkdir tmp/
go run main.go print
```

Badger에 대한 Dependency 문제가 발생한다면 아래 내용을 입력하세요.

```text
go get github.com/dgraph-io/badger/v3
go mod tidy
```

## Result

print를 진행하면 아래와 같은 결과물이 출력됩니다. badger로 시작하는 라인은 badger의 로그가 출력되는 것이니 신경쓰지 않아도 됩니다.

```text
go run main.go print

badger 2021/04/27 00:49:17 DEBUG: Value log discard stats empty
Previous Hash:
Data in Block: Genesis
Hash: 00031a02a972efd4fa6ea999407149b85b03ccecb8c2bb8eb5a1d068862309d0
PoW: true
```

이제 새로운 블록을 추가합니다.

```text
go run main.go add -block "first blocks"
badger 2021/04/27 00:51:41 INFO: All 1 tables opened in 3ms
badger 2021/04/27 00:51:41 INFO: Replaying file id: 0 at offset: 280
badger 2021/04/27 00:51:41 INFO: Replay took: 3.792µs
badger 2021/04/27 00:51:41 DEBUG: Value log discard stats empty
00002cfd26b0fad5ed42c55d33aae5046cf3d0e822c3b9c159462cf2a1905eba
Added Block!
```

위의 블록의 해시값을 보면 유추할 수 있듯이, "first blocks"을 추가할 때 코드의 Difficulty를 수정하였습니다. 이 상태에서 print를 호출하면 아래와 같은 결과가 나옵니다.

```text
Previous Hash: 00031a02a972efd4fa6ea999407149b85b03ccecb8c2bb8eb5a1d068862309d0
Data in Block: first blocks
Hash: 00002cfd26b0fad5ed42c55d33aae5046cf3d0e822c3b9c159462cf2a1905eba
PoW: true

Previous Hash:
Data in Block: Genesis
Hash: 00031a02a972efd4fa6ea999407149b85b03ccecb8c2bb8eb5a1d068862309d0
PoW: false

```

Genesis block의 Validation이 실패하였습니다. 이는 지금 코드가 Validation과정에서 해당 블록이 생성될 때 Difficulty를 고려하지 않고 상수로 선언되어 있는 Difficulty를 사용해서 검증을 진행하기 때문입니다. 이 부분은 추후에 수정하도록 하겠습니다.



{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step3 브랜치에 있습니다 . 
{% endhint %}





Last update: 2021/04/27 

