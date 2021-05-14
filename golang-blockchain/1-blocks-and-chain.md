---
description: 가장 기초가 되는 block과 blockchain 만들기
---

# \#1 Blocks and Chain

본 튜토리얼은 [https://github.com/tensor-programming/golang-blockchain](https://github.com/tensor-programming/golang-blockchain) 레파지토리를 100% 참고하여 만들었습니다. 

한글로 주석을 단 코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step1 브랜치에 있습니다 . 

{% hint style="danger" %}
Go languague를 기본적으로 익혔다는 가정하에 시작되는 튜토리얼 입니다. 이전 문서인 Golang에서 언급한 튜토리얼들을 먼저 공부하길 바랍니다.
{% endhint %}

## Setup workspace

`$GOPATH/src` 에서 아래 커맨드를 입력하여 코딩을 시작할 workspace를 구성한다. module 초기화를 하는데 배포를 위해서 깃허브 링크와 동일하게 작성해야한다.

```text
mkidr golang-blockchain && cd golang-blockchain
go mod init github.com/<user-name>/golang-blockchain
```

## main.go

`main.go` 파일을 열어 아래와 같이 작성합니다. 코드는 단순하기 때문에 설명은 주석으로 대체하겠습니다. step 1의 관한 이론적 지식은 [blockchain structure](../blockchain-overview/blockchain-structure.md)에서 찾아볼 수 있습니다.

```go
package main

import (
	"bytes"
	"crypto/sha256"
	"fmt"
)

type BlockChain struct {
	blocks []*Block
}

type Block struct {
	Hash     []byte
	Data     []byte
	PrevHash []byte
}

func (b *Block) DeriveHash() {
	info := bytes.Join([][]byte{b.Data, b.PrevHash}, []byte{})
	hash := sha256.Sum256(info)
	b.Hash = hash[:]
}

func CreateBlock(data string, prevHash []byte) *Block {
	block := &Block{[]byte{}, []byte(data), prevHash}
	block.DeriveHash()
	return block
}

func (chain *BlockChain) AddBlock(data string) {
	prevBlock := chain.blocks[len(chain.blocks)-1]
	new := CreateBlock(data, prevBlock.Hash)
	chain.blocks = append(chain.blocks, new)
}

func Genesis() *Block {
	return CreateBlock("Genesis", []byte{})
}

func InitBlockChain() *BlockChain {
	return &BlockChain{[]*Block{Genesis()}}
}

func main() {
	chain := InitBlockChain()

	chain.AddBlock("First Block after Genesis")
	chain.AddBlock("Second Block after Genesis")
	chain.AddBlock("Third Block after Genesis")

	for _, block := range chain.blocks {
		fmt.Printf("Previous Hash: %x\n", block.PrevHash)
		fmt.Printf("Data in Block: %s\n", block.Data)
		fmt.Printf("Hash: %x\n", block.Hash)
	}
}
```

실행 시키면 아래와 같은 결과가 나옵니다.

```go
Previous Hash:
Data in Block: Genesis
Hash: 81ddc8d248b2dccdd3fdd5e84f0cad62b08f2d10b57f9a831c13451e5c5c80a5
Previous Hash: 81ddc8d248b2dccdd3fdd5e84f0cad62b08f2d10b57f9a831c13451e5c5c80a5
Data in Block: First Block after Genesis
Hash: 50493b76a2b7bec8d33620d6310d5578b1dda079684405ed5e6bd55510146daf
Previous Hash: 50493b76a2b7bec8d33620d6310d5578b1dda079684405ed5e6bd55510146daf
Data in Block: Second Block after Genesis
Hash: 213e91a4ae1be45a651695ede0e75cba50818dce027dd4f0fe35742dc90158e1
Previous Hash: 213e91a4ae1be45a651695ede0e75cba50818dce027dd4f0fe35742dc90158e1
Data in Block: Third Block after Genesis
Hash: e22b76962d23ed3e327b9ababac19270b56c4d70d8878446609b13fa72ebc0e1
```

 두번째 블록 데이터의 대문자 S를 소문자 s로 바꿔보겠습니다. 

```go
Previous Hash:
Data in Block: Genesis
Hash: 81ddc8d248b2dccdd3fdd5e84f0cad62b08f2d10b57f9a831c13451e5c5c80a5
Previous Hash: 81ddc8d248b2dccdd3fdd5e84f0cad62b08f2d10b57f9a831c13451e5c5c80a5
Data in Block: First Block after Genesis
Hash: 50493b76a2b7bec8d33620d6310d5578b1dda079684405ed5e6bd55510146daf
Previous Hash: 50493b76a2b7bec8d33620d6310d5578b1dda079684405ed5e6bd55510146daf
Data in Block: second Block after Genesis
Hash: 96b1901ef75d2eb2bd72e88f7fc0eb20033fa3b5fb3642039b7a134c25a661da
Previous Hash: 96b1901ef75d2eb2bd72e88f7fc0eb20033fa3b5fb3642039b7a134c25a661da
Data in Block: Third Block after Genesis
Hash: 11d3638e0a922ea6da0bbdfdb875cd8da34ee63e39c3269975373154561373f2
```

암호화 함수 특성에 따라 두번째와 세번째 블럭의 Hash값이 크게 바뀌게 됩니다. 값을 바꾸면 이어진 모든 블럭의 해시가 바뀌는 특성 덕분에 blockchain의 데이터를 수정하는 것이 매우 어렵게 됩니다. 



## blockchain/block.go

블록에 관련된 코드를 `blockchain/block.go` 로 옮깁니다. main을 제외한 type Block부터 옮기면 됩니다. 또, BlockChain의 Block을 외부에서 사용할 것이기 때문에 관습상 첫 문자를 대문자로 바꿔줍니다.

```go
// blockchain/block.go
package blockchain

import (
	"bytes"
	"crypto/sha256"
)

type BlockChain struct {
	// BlockChain은 Block포인터 슬라이스를 가진다.
	Blocks []*Block
}

// Block의 구조
type Block struct {
	Hash     []byte // 현재 블록의 해시
	Data     []byte // 블록에 기록된 data
	PrevHash []byte // 이전 블록의 해시
}

func (b *Block) DeriveHash() {
	// block의 데이터와 이전 해시를 concatenate한다.
	info := bytes.Join([][]byte{b.Data, b.PrevHash}, []byte{})
	// concatenate한 값을 해시함수에 넣어서 새로운 해시값을 얻어낸다.
	hash := sha256.Sum256(info)
	// 결과값을 블록에 저장.
	b.Hash = hash[:]
}

// Block을 생성하는 함수
// data와 이전 해시값을 인자로 받는다.
func CreateBlock(data string, prevHash []byte) *Block {
	// data와 이전 해시값으로 block을 만들고
	block := &Block{[]byte{}, []byte(data), prevHash}
	// 이번 블록의 해시값을 찾아낸다.
	block.DeriveHash()
	return block
}

// 새로운 블록을 만들어서 블록체인에 연결하는 함수
func (chain *BlockChain) AddBlock(data string) {
	prevBlock := chain.Blocks[len(chain.Blocks)-1]
	new := CreateBlock(data, prevBlock.Hash)
	chain.Blocks = append(chain.Blocks, new)
}

// Chain의 첫 블록을 Genesis Block이라고 한다.
// Genesis Block은 이전 해시가 없으므로 예외처리한다.
func Genesis() *Block {
	return CreateBlock("Genesis", []byte{})
}

func InitBlockChain() *BlockChain {
	return &BlockChain{[]*Block{Genesis()}}
}
```

main.go 도 import를 진행해주고 B를 대문자로 바꿔줍니다.

```go
// main.go
package main

import (
	"fmt"

	"github.com/siisee11/golang-blockchain/blockchain"
)

func main() {
	// Blockchain을 초기화 한다. 이는 Genesis block을 만드는 작업을 포함한다.
	chain := blockchain.InitBlockChain()

	// 예시로 3개의 블록을 추가한다.
	chain.AddBlock("First Block after Genesis")
	chain.AddBlock("second Block after Genesis")
	chain.AddBlock("Third Block after Genesis")

	// Block을 iterate하며 출력한다.
	for _, block := range chain.Blocks {
		fmt.Printf("Previous Hash: %x\n", block.PrevHash)
		fmt.Printf("Data in Block: %s\n", block.Data)
		fmt.Printf("Hash: %x\n", block.Hash)
	}
}

```



{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step1 브랜치에 있습니다 . 
{% endhint %}



Last update: 04/26/2021

