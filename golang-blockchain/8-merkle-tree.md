---
description: Storage size optimization
---

# \#8 Merkle Tree

비트코인의 모든 블록의 트랜잭션 데이터를 저장하려면 큰 space가 필요합니다. 검증인들은 이 데이터를 모두 저장할 필요가 있지만, 비트코인을 사용하는 모든 사람이 모든 트랜잭션 데이터\(수백 GB\)를 저장해야 한다면 아무도 비트코인 거래를 이용하지 않을 것 입니다.

비트코인은 이러한 비효율성을 줄이기위해 Merkle Tree를 도입하여 사용합니다. 

## Before merkle

Merkle Tree를 추가하기전에 **새로운 블록이 생성될 때 코인베이스 트랜잭션이 발생하도록** 코드를 수정합니다.

일단 `transaction.go`파일을 열어 CoinbaseTx의 데이터를 랜덤하게 생성되도록 바꿉니다.

```go
// mining하면 to에게 코인을 보상으로 주는 Coinbase Transaction.
func CoinbaseTx(to, data string) *Transaction {
	if data == "" {
		randData := make([]byte, 24)
		_, err := rand.Read(randData)
		Handle(err)
		data = fmt.Sprintf("%x", randData)
	}

	txin := TxInput{[]byte{}, -1, nil, []byte(data)}
	txout := NewTXOutput(20, to)

	tx := Transaction{nil, []TxInput{txin}, []TxOutput{*txout}}
	tx.ID = tx.Hash()

	return &tx
}
```

send에서 블록을 추가할 때 Coinbase 트랜잭션을 추가하여 블록을 추가하는 주소에게 보상 20 코인을 주도록 합니다. `cli/cli.go`

```go
// {from}에서 {to}로 {amount}만큼 보냅니다.
func (cli *CommandLine) send(from, to string, amount int) {
	if !wallet.ValidateAddress(from) {
		log.Panic("Address is not Valid")
	}
	if !wallet.ValidateAddress(to) {
		log.Panic("Address is not Valid")
	}
	chain := blockchain.ContinueBlockChain("") // blockchain을 DB로 부터 받아온다.
	UTXOset := blockchain.UTXOSet{chain}
	defer chain.Database.Close()

	cbTx := blockchain.CoinbaseTx(from, "")  // 코인베이스 트랜잭션을 생성하고
	tx := blockchain.NewTransaction(from, to, amount, &UTXOset) // send 트랜잭션도 생성하여
	block := chain.AddBlock([]*blockchain.Transaction{cbTx, tx}) // 새로운 블록에 추가합니다.
	UTXOset.Update(block)
	fmt.Println("Success!")
}
```

`blockchain/blockchain.go`파일을 열어서 VerifyTransaction을 다음과 같이 수정합니다.

```go
// 트랜잭션을 검증합니다.
func (chain *BlockChain) VerifyTransaction(tx *Transaction) bool {
	// Coinbase 트랜잭션은 유효하다고 판단합니다.
	if tx.IsCoinbase() {
		return true
	}

	prevTXs := make(map[string]Transaction)

	for _, in := range tx.Inputs {
		prevTX, err := chain.FindTransaction(in.ID)
		Handle(err)
		prevTXs[hex.EncodeToString(prevTX.ID)] = prevTX
	}

	// 이전 거래 기록을 이용해서 검증합니다.
	return tx.Verify(prevTXs)
}
```

##  blockchain/merkle.go

Merkle Tree는 해시들의 해시로 생각할 수 있습니다. 리프노드\(Leaf node\)는 하나의 트랜잭션의 해시를 저장하며, 두개의 리프노드의 해시값을 합하여 새로운 부모노드를 만들어냅니다. 같은 방식으로 루트노드까지 만들고 Merkle Tree는 이 루트노드를 포인팅합니다.

```go
package blockchain

import (
	"crypto/sha256"
)

// MerkleTree의 루트를 저장하는 스트럭쳐
type MerkleTree struct {
	RootNode *MerkleNode
}

// MerkleTree의 개별 노드
type MerkleNode struct {
	Left  *MerkleNode // 왼쪽 자식
	Right *MerkleNode // 오른쪽 자식
	Data  []byte      // hash 값
}

// MerkleNode를 생성하는 함수
func NewMerkleNode(left, right *MerkleNode, data []byte) *MerkleNode {
	node := MerkleNode{}

	// {left}, {right}가 없다면 leaf node
	if left == nil && right == nil {
		hash := sha256.Sum256(data)
		node.Data = hash[:]
	} else {
		// 자식들의 해시를 이어서 다시 Hash를 구함
		prevHashes := append(left.Data, right.Data...)
		hash := sha256.Sum256(prevHashes)
		node.Data = hash[:]
	}

	// 자식 연결
	node.Left = left
	node.Right = right

	return &node
}

// MerkleTree를 생성하는 과정
func NewMerkleTree(data [][]byte) *MerkleTree {
	var nodes []MerkleNode

	// 자식 노드의 수를 짝수로 만들어야함
	// 마지막 자식을 복사한다.
	if len(data)%2 != 0 {
		data = append(data, data[len(data)-1])
	}

	// Leaf node를 만드는 과정
	for _, dat := range data {
		node := NewMerkleNode(nil, nil, dat)
		nodes = append(nodes, *node)
	}

	// Tree height 만큼 순회
	for i := len(data); i > 1; i /= 2 {
		var level []MerkleNode

		// 순서대로 2개씩 합쳐서 노드 생성
		for j := 0; j < len(nodes); j += 2 {
			node := NewMerkleNode(&nodes[j], &nodes[j+1], nil)
			level = append(level, *node)
		}
		// 다음 iteration은 새로 만들어진 노드들로 진행
		nodes = level
	}

	// Root 노드 반환
	tree := MerkleTree{&nodes[0]}

	return &tree
}
```

## blockchain/block.go

HashTransactions 코드를 바꾸어 머클트리를 구성하고 루트의 Hash값을 반환하도록 변경합니다.

```go
// Block의 Transaction들을 합쳐서 하나의 해시를 만듭니다.
// Merkle Tree를 이용합니다.
func (b *Block) HashTransactions() []byte {
	var txHashes [][]byte

	for _, tx := range b.Transactions {
		txHashes = append(txHashes, tx.Serialize())
	}
	tree := NewMerkleTree(txHashes)

	// merkle tree를 구성하고 루트노드의 데이터 값이 최종 해시값
	return tree.RootNode.Data
}
```

## Test

Send 시에 블록을 추가하기 때문에 코인베이스 트랜잭션이 발생하여 20코인이 더 주어진다.

![](../.gitbook/assets/image%20%2880%29.png)

`printchain` 으로 자세한 내용을 보면,

![](../.gitbook/assets/image%20%2883%29.png)

2번째 블록 \(프린트 상에서는 위에서 첫번째\)에 2개의 transaction이 적혀있고, 그 중 첫번째 트랜잭션은 Coinbase 트랜잭션임을 알 수 있다.





{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step8 브랜치에 있습니다 . 
{% endhint %}



Last updated: May 8, 2021

