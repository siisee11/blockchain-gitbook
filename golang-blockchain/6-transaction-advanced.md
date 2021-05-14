---
description: Transaction에 서명을 추가하여 보안을 강화한다.
---

# \#6 Transaction Advanced

Transaction\(basic\)에서는 보안이 전혀 없는 형태의 트랜잭션을 구현하였습니다. 이제 Wallet에서 생성한 private key, public key, address을 이용하여 signature과 validation을 진행하여 트랜잭션의 보안을 강화할 것입니다.

이 실습 내용은 Bitcoin 섹션의 [Wallet](../bitcoin/wallet.md), [Signature & Verification](../bitcoin/signature-and-verification.md) 파트의 이론적 지식을 요구합니다. 

아래 그림들을 통해서 코드를 이해해보세요.

Key와 Hash, Address 관계도 입니다. 이탤릭체로 예시로 사용할 값을 적어 놓았습니다.

![Key, Hash, Address](../.gitbook/assets/image%20%2897%29.png)

먼저 Coinbase 트랜잭션 입니다.

![Coinbase &#xD2B8;&#xB79C;&#xC7AD;&#xC158;](../.gitbook/assets/image%20%28104%29.png)

이어지는 일반 트랜잭션 입니다.

![jy -&amp;gt; ht 30 &#xD2B8;&#xB79C;&#xC7AD;&#xC158;](../.gitbook/assets/image%20%2898%29.png)

Signature와 verification의 간략한 도식입니다.

![Sign and verify](../.gitbook/assets/image%20%2893%29.png)

## blockchain/tx.go

Sign, Verify과정을 위해 Tx 구조를 수정하고 Util 함수를 추가합니다.

```go
// tx.go
package blockchain

import (
	"bytes"

	"github.com/siisee11/golang-blockchain/wallet"
)

type TxOutput struct {
	Value int // 잔액

	// address를 decode하여 얻을 수 있는 값입니다.
	// 좀더 raw한 형태의 주소라고 생각하면됩니다.
	// 자세한 내용은 wallet문서를 참조하세요.
	PubKeyHash []byte
}

// Input으로 사용하고자 하는 UTXO를 가르킵니다.
type TxInput struct {
	ID        []byte // UTXO가 생성된 트랜잭션의 ID
	Out       int    // 그 트랜잭션에서 몇번째 UTXO였는 지
	Signature []byte // UTXO를 사용하려는 사람의 서명
	PubKey    []byte // UTXO에 적혀있는 PublicKeyHash 값
}

// {value}와 {address}를 사용해 TXO를 만듭니다.
func NewTXOutput(value int, address string) *TxOutput {
	txo := &TxOutput{value, nil}
	txo.Lock([]byte(address))

	return txo
}

// Pubkey를 이용해 소유권 판별.
func (in *TxInput) UsesKey(pubKeyHash []byte) bool {
	lockingHash := wallet.PublicKeyHash(in.PubKey)

	return bytes.Equal(lockingHash, pubKeyHash)
}

// {address}를 통해 pubKeyHash를 구해 TXO에 적습니다.
func (out *TxOutput) Lock(address []byte) {
	// Base58 Decode를 하고
	pubKeyHash := wallet.Base58Decode(address)
	// version byte와 checksum byte를 뺍니다.
	pubKeyHash = pubKeyHash[1 : len(pubKeyHash)-4]
	out.PubKeyHash = pubKeyHash
}

// TXO의 pubKeyHash를 보고 소유권을 판단합니다.
func (out *TxOutput) IsLockedWithKey(pubKeyHash []byte) bool {
	// 인자로 받은 pubKeyHash와 TXO의 pubKeyHash를 비교합니다.
	return bytes.Equal(out.PubKeyHash, pubKeyHash)
}
```

## blockchain/transaction.go

Transaction에 서명\(Sign\)하고 검증\(Verify\)하는 함수를 추가합니다.

```go
package blockchain

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/gob"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"strings"

	"github.com/siisee11/golang-blockchain/wallet"
)

// Transaction은 Input, Output으로 구성되어있습니다.
type Transaction struct {
	ID      []byte
	Inputs  []TxInput
	Outputs []TxOutput
}

// Transaction structure를 []byte로 인코딩하는 함수
func (tx Transaction) Serialize() []byte {
	var encoded bytes.Buffer

	enc := gob.NewEncoder(&encoded)
	err := enc.Encode(tx)
	if err != nil {
		log.Panic(err)
	}

	return encoded.Bytes()
}

// Serialized Transaction을 이용해서 Hash값 계산
func (tx *Transaction) Hash() []byte {
	var hash [32]byte

	txCopy := *tx
	txCopy.ID = []byte{}

	hash = sha256.Sum256(txCopy.Serialize())

	return hash[:]
}

// mining하면 to에게 코인을 보상으로 주는 Coinbase Transaction.
func CoinbaseTx(to, data string) *Transaction {
	if data == "" {
		data = fmt.Sprintf("Coins to %s", to)
	}

	txin := TxInput{[]byte{}, -1, nil, []byte(data)}
	txout := NewTXOutput(100, to)

	tx := Transaction{nil, []TxInput{txin}, []TxOutput{*txout}}
	tx.ID = tx.Hash()

	return &tx
}

// Transaction을 만드는 함수 입니다.
func NewTransaction(from, to string, amount int, chain *BlockChain) *Transaction {
	var inputs []TxInput
	var outputs []TxOutput

	// Wallets에서 {from}의 address갖는 wallet을 가져옵니다.
	wallets, err := wallet.CreateWallets()
	Handle(err)
	w := wallets.GetWallet(from)
	// Public key로 부터 publicKeyHash를 생성합니다.
	pubKeyHash := wallet.PublicKeyHash(w.PublicKey)

	// {from}이 {amount}를 지불하기 위해 필요한 {from}소유의 UTXO를 가지고 옵니다.
	// {from}의 공개키 해시 {pubKeyHash}를 이용합니다.
	acc, validOutputs := chain.FindSpendableOutputs(pubKeyHash, amount)

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
			// 4번째 인자로 {from}의 PublicKey가 추가됩니다.
			input := TxInput{txID, out, nil, w.PublicKey}
			inputs = append(inputs, input)
		}
	}

	// 이제 트랜잭션의 인풋으로 사용될 UTXO를 모두 모았습니다.
	// 그리고 그 가치의 합은 acc가 될 것입니다.
	// 트랜잭션의 아웃풋은 전송될 TXO, 잔금(반환될) TXO
	// 항상 두개로 이루어집니다.

	// 전송될 TXO을 만듭니다.
	outputs = append(outputs, *NewTXOutput(amount, to))

	// 반환될 TXO
	if acc > amount {
		outputs = append(outputs, TxOutput{acc - amount, pubKeyHash})
	}

	// 인풋과 아웃풋을 바탕으로 Transaction이 생성됩니다.
	tx := Transaction{nil, inputs, outputs}
	tx.ID = tx.Hash()
	chain.SignTransaction(&tx, w.PrivateKey)

	return &tx
}

// 해당 트랜잭션이 Coinbase 인가?
func (tx *Transaction) IsCoinbase() bool {
	return len(tx.Inputs) == 1 && len(tx.Inputs[0].ID) == 0 && tx.Inputs[0].Out == -1
}

// 소비하려는 UTXO(UTXO-IN)가 자신의 소유임을 Sign하는 과정
// 이는 Verity함수에서 Validator에 의해 검증된다.
func (tx *Transaction) Sign(privKey ecdsa.PrivateKey, prevTXs map[string]Transaction) {
	if tx.IsCoinbase() {
		return
	}

	for _, in := range tx.Inputs {
		if prevTXs[hex.EncodeToString(in.ID)].ID == nil {
			log.Panic("ERROR: Previous transaction is not corret")
		}
	}

	// Signature와 PubKey field가 비어있는 트랜잭션을 복사해 만든다.
	txCopy := tx.TrimmedCopy()

	// 트랜잭션의 각 인풋에 서명함.
	// 각 인풋에 대해 아래 과정을 거침.
	// 1. 인풋의 이전 트랜잭션을 확인하여 PubKeyHash를 가져와 저장.
	// 2. 트랜잭션과 private key를 이용해 signature를 구함.
	// 3. Signature를 트랜잭션에 추가함.
	for inId, in := range txCopy.Inputs {
		prevTX := prevTXs[hex.EncodeToString(in.ID)]
		txCopy.Inputs[inId].Signature = nil
		txCopy.Inputs[inId].PubKey = prevTX.Outputs[in.Out].PubKeyHash

		dataToSign := fmt.Sprintf("%x\n", txCopy)

		r, s, err := ecdsa.Sign(rand.Reader, &privKey, []byte(dataToSign))
		Handle(err)
		signature := append(r.Bytes(), s.Bytes()...)

		tx.Inputs[inId].Signature = signature
		txCopy.Inputs[inId].PubKey = nil
	}

	// 모든 UTXO-IN에 서명을 완료 후 종료.
}

// 해당 트랜잭션이 유효한 트랜잭션인지 확인하는 함수.
func (tx *Transaction) Verify(prevTXs map[string]Transaction) bool {
	if tx.IsCoinbase() {
		return true
	}

	for _, in := range tx.Inputs {
		if prevTXs[hex.EncodeToString(in.ID)].ID == nil {
			log.Panic("ERROR: Previous transaction is not corret")
		}
	}

	// Signature와 PubKey field가 비어있는 트랜잭션을 복사해 만든다.
	txCopy := tx.TrimmedCopy()
	// P-256(secp256r1) elliptic curve를 사용. (비트코인에서는 secp256k1을 사용한다.)
	curve := elliptic.P256()

	// Public key로 각 Input에 포함되어있는 Signature가 유효한지 판별.
	for inId, in := range tx.Inputs {
		// Sign 할때와 같은 Hash값을 얻기 위해서 똑같은 과정을 거친다.
		prevTx := prevTXs[hex.EncodeToString(in.ID)]
		txCopy.Inputs[inId].Signature = nil
		txCopy.Inputs[inId].PubKey = prevTx.Outputs[in.Out].PubKeyHash

		// signature는 S값과 R값으로 나뉘어진다.
		r := big.Int{}
		s := big.Int{}
		sigLen := len(in.Signature)
		r.SetBytes(in.Signature[:(sigLen / 2)])
		s.SetBytes(in.Signature[(sigLen / 2):])

		x := big.Int{}
		y := big.Int{}
		KeyLen := len(in.PubKey)

		x.SetBytes(in.PubKey[:(KeyLen / 2)])
		y.SetBytes(in.PubKey[(KeyLen / 2):])

		dataToVerify := fmt.Sprintf("%x\n", txCopy)

		rawPubKey := ecdsa.PublicKey{Curve: curve, X: &x, Y: &y}
		// Public Key와 트랜잭션의 해시값, Signature(R,S)를 가지고 유효성을 판별한다.
		if ecdsa.Verify(&rawPubKey, []byte(dataToVerify), &r, &s) == false {
			return false
		}
		txCopy.Inputs[inId].PubKey = nil
	}

	// 모든 인풋(UTXO-IN)에 대해 검사를 통과하였으면 검증 성공
	return true
}

// TxInput의 pubkey와 signature를 nil로 초기화하며 복사
func (tx *Transaction) TrimmedCopy() Transaction {
	var inputs []TxInput
	var outputs []TxOutput

	for _, in := range tx.Inputs {
		inputs = append(inputs, TxInput{in.ID, in.Out, nil, nil})
	}

	for _, out := range tx.Outputs {
		outputs = append(outputs, TxOutput{out.Value, out.PubKeyHash})
	}

	txCopy := Transaction{tx.ID, inputs, outputs}

	return txCopy
}

// Transaction information을 출력할 때 사용하는 함수.
func (tx Transaction) String() string {
	var lines []string

	lines = append(lines, fmt.Sprintf("+- Transaction %x", tx.ID))
	lines = append(lines, fmt.Sprintf("|"))
	for i, input := range tx.Inputs {
		lines = append(lines, fmt.Sprintf("+--- Input %d:", i))
		lines = append(lines, fmt.Sprintf("|  +-- TXID: 		%x", input.ID))
		lines = append(lines, fmt.Sprintf("|  +-- Out: 		%d", input.Out))
		lines = append(lines, fmt.Sprintf("|  +-- Signature: 	%x", input.Signature))
		lines = append(lines, fmt.Sprintf("|  +-- PubKey: 		%x", input.PubKey))
	}

	for i, output := range tx.Outputs {
		if i == len(tx.Outputs)-1 {
			lines = append(lines, fmt.Sprintf("|"))
			lines = append(lines, fmt.Sprintf("+--- Output %d:", i))
			lines = append(lines, fmt.Sprintf("   +- Value: 		%d", output.Value))
			lines = append(lines, fmt.Sprintf("   +- Script:		%x", output.PubKeyHash))
			break
		}
		lines = append(lines, fmt.Sprintf("|"))
		lines = append(lines, fmt.Sprintf("+--- Output %d:", i))
		lines = append(lines, fmt.Sprintf("|  +- Value: 		%d", output.Value))
		lines = append(lines, fmt.Sprintf("|  +- Script:		%x", output.PubKeyHash))
	}

	return strings.Join(lines, "\n")
}
```

## blockchain/blockchain.go

blockchain에 transaction을 서명하고 검증하는 함수를 추가합니다. 나머지 부분은 이전 코드에서 새로운 함수, 구조 정의에 따라 수정해줍니다. \(코드가 너무 길어 생략하였습니다.\)

```go
// Block을 순회하면서 Transaction ID를 가진 Transaction을 검색합니다.
func (chain *BlockChain) FindTransaction(ID []byte) (Transaction, error) {
	iter := chain.Iterator()

	for {
		block := iter.Next()

		for _, tx := range block.Transactions {
			if bytes.Compare(tx.ID, ID) == 0 {
				return *tx, nil
			}
		}

		if len(block.PrevHash) == 0 {
			break
		}
	}

	return Transaction{}, errors.New("Transaction does not exist")
}

// 트랜잭션을 Private Key를 이용해 Sign합니다.
func (chain *BlockChain) SignTransaction(tx *Transaction, privKey ecdsa.PrivateKey) {
	prevTXs := make(map[string]Transaction)

	// 트랜잭션의 인풋에 대하여 for loop
	for _, in := range tx.Inputs {
		// input에 적힌 정보로 해당 UTXO의 이전 거래를 검색한다.
		prevTX, err := chain.FindTransaction(in.ID)
		Handle(err)
		prevTXs[hex.EncodeToString(prevTX.ID)] = prevTX
	}

	// 이전 거래 기록과 Private Key를 이용해 서명합니다.
	tx.Sign(privKey, prevTXs)
}

// 트랜잭션을 검증합니다.
func (chain *BlockChain) VerifyTransaction(tx *Transaction) bool {
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

## cli/cli.go

Cli 프로그램의 명령어를 수정합니다.

```go
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
		for _, tx := range block.Transactions {
			fmt.Println(tx)
			if !tx.IsCoinbase() {
				fmt.Printf("Transcation verification: %s\n", strconv.FormatBool(chain.VerifyTransaction(tx)))
			}
		}
		fmt.Println()

		// if Genesis
		if len(block.PrevHash) == 0 {
			break
		}
	}
}

func (cli *CommandLine) getBalance(address string) {
	if !wallet.ValidateAddress(address) {
		log.Panic("Address is not Valid")
	}
	chain := blockchain.ContinueBlockChain("") // blockchain을 DB로 부터 받아온다.
	defer chain.Database.Close()

	balance := 0
	// Human readable Address를 PubKeyHash로 다시 변환.
	pubKeyHash := wallet.Base58Decode([]byte(address))
	pubKeyHash = pubKeyHash[1 : len(pubKeyHash)-4]
	UTXOs := chain.FindUTXO(pubKeyHash)

	for _, out := range UTXOs {
		balance += out.Value
	}

	fmt.Printf("Balance of %s: %d\n", address, balance)
}
```

## Testing

시작전에 기존에 생성되어 있는 DB와 지갑 정보들을 삭제합니다.

```text
rm tmp/wallet.data
rm tmp/blocks/*
```

다시 지갑 두개를 생성합니다. 

![create 2 wallets](../.gitbook/assets/image%20%2864%29.png)

첫 지갑의 주소로 blockchain을 생성합니다.

```text
go run main.go createblockchain -address <A1>
```

![createblockchain](../.gitbook/assets/image%20%2860%29.png)

printchain 커맨드로 체인을 출력해봅시다. 아래와 같이 Genesis Block과 coinbase transaction에 대한 정보가 출력됩니다.

```text
go run main.go printchain
```

![printchain](../.gitbook/assets/image%20%2885%29.png)

1번째 주소에서 2번째 주소로 30을 송금해보고, printchain으로 결과를 확인합니다. 두번째 블록에 기록된 트랜잭션의 상세 내용을 확인할 수 있습니다. Verification이 성공했음을 출력합니다.

```text
go run main.go send -from <A1> -to <A2> -amount 30
go run main.go printchain
```

![Transaction verification: true](../.gitbook/assets/image%20%2884%29.png)

{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step6 브랜치에 있습니다 . 
{% endhint %}



Last updated: May 1, 2021

