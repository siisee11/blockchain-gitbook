---
description: 'Blockchain의 꽃, PoW를 벌써 코딩해봅시다.'
---

# \#2 Proof-of-Work

## blockchain/proof.go

이전 코드에서 AddBlock함수를 부르면 무한으로 블록을 추가할 수 있었습니다. 이제 작업증명 방식을 도입해서 AddBlock함수가 불렸을 때 작업을 진행하고 작업이 완료되어야 블록을 추가할 수 있도록 바꾸겠습니다. 

`blockchain/proof.go` 파일을 생성하고 아래 내용을 붙혀넣습니다. 자세한 내용은 주석을 참고하세요.

```go
package blockchain

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"math/big"
)

// 우리가 찾고자하는 정답을 정의하겠습니다.
// 우리는 256bit중 왼쪽 {Difficulty}만큼의 bit가 0인 답을 원합니다.
const Difficulty = 12

type ProofOfWork struct {
	Block  *Block
	Target *big.Int // 문제의 답 (Difficulty로 부터 얻어낸다.)

	// big.Int에 관한 내용 참고 https://golang.org/pkg/math/big/
}

// Block을 받아서 ProofOfWork struct를 반환한다.
// Difficulty로 Target을 만든다.
func NewProof(b *Block) *ProofOfWork {
	target := big.NewInt(1)
	// 1을 왼쪽으로 256-Difficulty 만큼 이동시킨다.
	// PoW에서 target보다 작은 수가 나오는 것을 정답으로 할 것이다.
	// ** 작다는 뜻을 잘 생각해보자 왼쪽에 0이 Difficulty만큼 나오는 것과 같은 뜻이다.
	target.Lsh(target, uint(256-Difficulty))

	pow := &ProofOfWork{b, target}

	return pow
}

// Block의 데이터, 이전 해시, nonce, Difficulty 값을 모두 합쳐서 데이터를 만든다.
// 이 데이터를 sha256한 값이 정답이라면 이 데이터가 적힌 블록이 추가된다.
func (pow *ProofOfWork) InitData(nonce int) []byte {
	data := bytes.Join(
		[][]byte{
			pow.Block.PrevHash,
			pow.Block.Data,
			ToHex(int64(nonce)),
			ToHex(int64(Difficulty)),
		},
		[]byte{}, // seperator
	)
	return data
}

// PoW를 계산하여 nonce와 정답 hash값을 반환하는 함수
func (pow *ProofOfWork) Run() (int, []byte) {
	var intHash big.Int
	var hash [32]byte
	nonce := 0

	// 사실상 무한루프
	for nonce < math.MaxInt64 {
		// nonce를 포함하여 계산된 데이터를 가져온다.
		data := pow.InitData(nonce)
		// 데이터의 해시값.
		hash = sha256.Sum256(data)

		fmt.Printf("\r%x", hash)
		// 해시값으로 big.Int만듬
		intHash.SetBytes(hash[:])

		if intHash.Cmp(pow.Target) == -1 {
			// Target보다 intHash가 작다는 뜻, 즉 정답.
			break
		} else {
			// 다음 논스를 시도하자
			nonce++
		}
	}
	fmt.Println()

	// nonce와 결과 hash값을 반환
	return nonce, hash[:]
}

// 정답이 맞는지 검사하는 과정이다.
// Run에 비해 얼마나 쉬운지 알 수 있다. (단방향성)
func (pow *ProofOfWork) Validate() bool {
	var intHash big.Int
	// 블록에 포함된 Nonce를 통해 데이터 재현
	data := pow.InitData(pow.Block.Nonce)
	hash := sha256.Sum256(data)
	intHash.SetBytes(hash[:])

	return intHash.Cmp(pow.Target) == -1
}

// int64를 받아서 바이트로 변환하는 유틸리티 함수
func ToHex(num int64) []byte {
	buff := new(bytes.Buffer)
	err := binary.Write(buff, binary.BigEndian, num)
	if err != nil {
		log.Panic(err)
	}

	return buff.Bytes()
}
```

## blockchain/block.go

블록을 만드는 방식을 바꿔야합니다. 블록에 Nonce가 추가되었고, deriveBlock이 아닌 작업 증명 방식으로 Block을 생성하도록 코드를 수정합니다.

```go
// blockchain/block.go
package blockchain

type BlockChain struct {
	// BlockChain은 Block포인터 슬라이스를 가진다.
	Blocks []*Block
}

// Block의 구조
type Block struct {
	Hash     []byte // 현재 블록의 해시
	Data     []byte // 블록에 기록된 data
	PrevHash []byte // 이전 블록의 해시
	Nonce    int
}

// Block을 생성하는 함수
// data와 이전 해시값을 인자로 받는다.
func CreateBlock(data string, prevHash []byte) *Block {
	// data와 이전 해시값으로 block을 만들고
	block := &Block{[]byte{}, []byte(data), prevHash, 0}
	pow := NewProof(block)
	nonce, hash := pow.Run()

	block.Hash = hash[:]
	block.Nonce = nonce

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

## main.go

main을 수정해서 PoW가 잘 동작하는지 테스트합니다. 미리 만들어진 블록을 받아와서 Validate를 진행해봅니다.

```go
// main.go
package main

import (
	"fmt"
	"strconv"

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

		pow := blockchain.NewProof(block)
		fmt.Printf("PoW: %s\n", strconv.FormatBool(pow.Validate()))
		fmt.Println()
	}
}
```

메인을 실행시키면 아래와 같은 결과물이 나옵니다. //로 시작하는 부분은 추가로 주석 설명한 부분입니다.

```go
// 아래 4줄은 정답으로 찾아진 hash값들 입니다. (proof.go:66)
// Difficulty가 12이기 때문에 12bit => 000000000000(bit) = 0x000
// 즉, 맨 앞 3수가 0이다.

00031a02a972efd4fa6ea999407149b85b03ccecb8c2bb8eb5a1d068862309d0
0004458722d47515269d8ddbe22e2a2b5a260bd9359a3b7d72a9888b14f9f5f5
000765e0734dd46470c85341087e5a5203e80109df4ae0185d6cd9aa04dba4bd
0008a5c131ccd53c60db5797f3513556b6f2ce22df2a07482e0120f3dc2a5953

Previous Hash:
Data in Block: Genesis
Hash: 00031a02a972efd4fa6ea999407149b85b03ccecb8c2bb8eb5a1d068862309d0
PoW: true

Previous Hash: 00031a02a972efd4fa6ea999407149b85b03ccecb8c2bb8eb5a1d068862309d0
Data in Block: First Block after Genesis
Hash: 0004458722d47515269d8ddbe22e2a2b5a260bd9359a3b7d72a9888b14f9f5f5
PoW: true

Previous Hash: 0004458722d47515269d8ddbe22e2a2b5a260bd9359a3b7d72a9888b14f9f5f5
Data in Block: second Block after Genesis
Hash: 000765e0734dd46470c85341087e5a5203e80109df4ae0185d6cd9aa04dba4bd
PoW: true

Previous Hash: 000765e0734dd46470c85341087e5a5203e80109df4ae0185d6cd9aa04dba4bd
Data in Block: Third Block after Genesis
Hash: 0008a5c131ccd53c60db5797f3513556b6f2ce22df2a07482e0120f3dc2a5953
PoW: true
```

 Difficulty를 18로 바꿔서 돌려보자.

블록 추가는 어려운데, 검증은 쉬운것을 바로 체감할 수 있다.





{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step2 브랜치에 있습니다 . 
{% endhint %}



Last update: 04/26/2021

