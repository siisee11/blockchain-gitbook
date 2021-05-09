---
description: 비트코인의 주인이될 wallet을 만들어봅시다.
---

# \#5 Wallet

Wallet에 대한 코드를 작성하기전에 [Wallet](../bitcoin/wallet.md)에 대한 문서를 읽고 오시는 것을 추천드립니다.

Wallet은 거래를 위해 사용하는 address와 보안을 위해 Public/Private Key쌍으로 이루어져있습니다. 이를 구현해 보도록하겠습니다.

## blockchain/tx.go

먼저 코드 리팩토링을 진행합니다. `transcation.go`에서 txIn과 txOut에 관련된 코드를 `blockchain/tx.go` 로 옮김니다.

```go
// tx.go
package blockchain

// 트랜잭션의 인풋은 이전 트랜잭션에서의 아웃풋을 사용하는 것임을 기억해야합니다.
// {ID}를 가지는 트랜잭션의 {OUT}번째 {Sig} 소유의 아웃풋으로 생각할 수 있습니다.
type TxInput struct {
	ID  []byte
	Out int
	Sig string // 소유자의 서명
}

// 이것이 TXO(Transaction Output)입니다.
// "트랜잭션의 아웃풋"과 TXO라는 표현을 병행해서 사용합니다.
type TxOutput struct {
	Value int // 잔액

	// 소유자의 공개키
	// 여기서는 쉽게 소유자의 주소를 사용합니다.
	PubKey string
}

// Signature를 확인해서 같으면 풀 수 있는 (소유의) Input입니다.
func (in *TxInput) CanUnlock(data string) bool {
	return in.Sig == data
}

// 공개키를 확인해서 같으면 풀 수 있는 (소유의) Input입니다.
func (out *TxOutput) CanBeUnlocked(data string) bool {
	return out.PubKey == data
}
```

## wallet/wallet.go

Wallet을 만들기 위한 코드 입니다. 암호학을 기반으로 하므로 여러 암호화 함수들이 대거 등장합니다. 복잡해보이지만 어렵지 않습니.

```go
package wallet

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"log"

	"golang.org/x/crypto/ripemd160"
)

// Wallet 생성에 사용될 상수 입니다.
const (
	checksumLength = 4
	version        = byte(0x00)
)

// Wallet은 PublicKey와 PrivateKey로 이루어져있습니다.
// Wallet 문서 참고
type Wallet struct {
	PrivateKey ecdsa.PrivateKey
	PublicKey  []byte
}

// Wallet의 Address를 구하는 전체 과정입니다.
func (w Wallet) Address() []byte {
	pubHash := PublicKeyHash(w.PublicKey)

	versionedHash := append([]byte{version}, pubHash...)
	checksum := CheckSum(versionedHash)

	fullHash := append(versionedHash, checksum...)
	address := Base58Encode(fullHash)

	fmt.Printf("pub key: %x\n", w.PublicKey)
	fmt.Printf("pub hash: %x\n", pubHash)
	fmt.Printf("address: %s\n", address)

	return address
}

// 새로운 Pub/Priv Key pair를 만듭니다.
func NewKeyPair() (ecdsa.PrivateKey, []byte) {
	curve := elliptic.P256()

	private, err := ecdsa.GenerateKey(curve, rand.Reader)
	if err != nil {
		log.Panic(err)
	}

	pub := append(private.PublicKey.X.Bytes(), private.PublicKey.Y.Bytes()...)
	return *private, pub
}

// Pub/Priv Key pair를 만들고 이를 이용해 Wallet을 초기화합니다.
func MakeWallet() *Wallet {
	private, public := NewKeyPair()
	wallet := Wallet{private, public}

	return &wallet
}

// PublicKeyHash를 구합니다.
func PublicKeyHash(pubKey []byte) []byte {
	pubHash := sha256.Sum256(pubKey)

	hasher := ripemd160.New()
	_, err := hasher.Write(pubHash[:])
	if err != nil {
		log.Panic(err)
	}

	publicRipMD := hasher.Sum(nil)

	return publicRipMD
}

// {checksumLength}길이의 CheckSum 을 구합니다.
func CheckSum(payload []byte) []byte {
	firstHash := sha256.Sum256(payload)
	secondHash := sha256.Sum256(firstHash[:])

	return secondHash[:checksumLength]
}

// Checksum을 확인해서 {address}에 에러가 없는지 확인한다.
func ValidateAddress(address string) bool {
	pubKeyHash := Base58Decode([]byte(address))
	actualChecksum := pubKeyHash[len(pubKeyHash)-checksumLength:]
	version := pubKeyHash[0]
	pubKeyHash = pubKeyHash[1 : len(pubKeyHash)-checksumLength]
	targetChecksum := Checksum(append([]byte{version}, pubKeyHash...))

	return bytes.Equal(actualChecksum, targetChecksum)
}
```

wallet.go에 사용된 Base58관련 코드는 따로 `wallet/utils.go` 에 저장합니다.

```go
package wallet

import (
	"log"

	"github.com/mr-tron/base58"
)

// Base64에서 6개의 문자를 제외한 Base58의 encoding
// 0 O l I + / 제외
func Base58Encode(input []byte) []byte {
	encode := base58.Encode(input)

	return []byte(encode)
}

// Base58의decoding
func Base58Decode(input []byte) []byte {
	decode, err := base58.Decode(string(input[:]))
	if err != nil {
		log.Panic(err)
	}

	return decode
}

```

## wallet/wallets.go

Wallets는 Wallet들을 관리합니다. 직관적인 함수들로 구성되어 있습니다. Wallet을 영구적으로 저장하기위해 DB를 사용하지는 않고 파일에 인코딩하여 저장합니다.

```go
// wallet/wallets.go
package wallet

import (
	"bytes"
	"crypto/elliptic"
	"encoding/gob"
	"fmt"
	"io/ioutil"
	"log"
	"os"
)

// wallet을 저장할 파일의 이름
const walletFile = "./tmp/wallets.data"

// Wallets는 Wallet들의 매핑을 가진다.
type Wallets struct {
	Wallets map[string]*Wallet
}

// Wallets를 만듭니다.
func CreateWallets() (*Wallets, error) {
	wallets := Wallets{}
	wallets.Wallets = make(map[string]*Wallet)

	// 파일에 저장된 wallets를 불러옵니다.
	err := wallets.LoadFile()

	return &wallets, err
}

// Wallets에 Wallet을 추가합니다.
func (ws *Wallets) AddWallet() string {
	// wallet을 만들고
	wallet := MakeWallet()
	// wallet의 주소를 string형태로 저장합니다.
	address := fmt.Sprintf("%s", wallet.Address())

	// address => wallet 을 매핑에 넣습니다.
	ws.Wallets[address] = wallet

	return address
}

// Wallets에 저장된 모든 address값을 반환합니다.
func (ws Wallets) GetAllAddresses() []string {
	var addresses []string

	for address := range ws.Wallets {
		addresses = append(addresses, address)
	}

	return addresses
}

// address에 해당하는 wallet을 반환합니다.
func (ws Wallets) GetWallet(address string) Wallet {
	return *ws.Wallets[address]
}

// 파일에 저장된 Wallets를 읽어오는 함수
func (ws *Wallets) LoadFile() error {
	if _, err := os.Stat(walletFile); os.IsNotExist(err) {
		return err
	}

	var wallets Wallets

	fileConent, err := ioutil.ReadFile(walletFile)
	if err != nil {
		return err
	}

	gob.Register(elliptic.P256())
	decoder := gob.NewDecoder(bytes.NewReader(fileConent))
	err = decoder.Decode(&wallets)

	if err != nil {
		return err
	}

	ws.Wallets = wallets.Wallets

	return nil
}

// Wallets을 파일에 저장하는 함수
func (ws *Wallets) SaveFile() {
	var content bytes.Buffer

	gob.Register(elliptic.P256())

	encoder := gob.NewEncoder(&content)
	err := encoder.Encode(ws)
	if err != nil {
		log.Panic(err)
	}

	err = ioutil.WriteFile(walletFile, content.Bytes(), 0644)
	if err != nil {
		log.Panic(err)
	}
}
```

## cli/cli.go

마지막으로 Cli 프로그램에 명령어를 추가해줍니다. 비슷한 내용이므로 따로 설명은 달지 않았습니다.

```go
package cli

import (
	"flag"
	"fmt"
	"log"
	"os"
	"runtime"
	"strconv"

	"github.com/siisee11/golang-blockchain/blockchain"
	"github.com/siisee11/golang-blockchain/wallet"
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
	fmt.Println(" createwallet - Creates a new Wallet")
	fmt.Println(" listaddresses - Lists the addresses in our wallet file")
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

// Wallet을 생성합니다.
func (cli *CommandLine) createWallet() {
	wallets, _ := wallet.CreateWallets()
	address := wallets.AddWallet()
	wallets.SaveFile()

	fmt.Printf("New address is: %s\n", address)
}

// Wallets에 저장된 Wallet의 address를 출력합니다.
func (cli *CommandLine) listAddresses() {
	wallets, _ := wallet.CreateWallets()
	addresses := wallets.GetAllAddresses()

	for _, address := range addresses {
		fmt.Println(address)
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
	if !wallet.ValidateAddress(address) {
		log.Panic("Address is not Valid")
	}
	chain := blockchain.InitBlockChain(address)
	chain.Database.Close()
	fmt.Println("Finished!")
}

func (cli *CommandLine) getBalance(address string) {
	if !wallet.ValidateAddress(address) {
		log.Panic("Address is not Valid")
	}
	chain := blockchain.ContinueBlockChain("") // blockchain을 DB로 부터 받아온다.
	defer chain.Database.Close()

	balance := 0
	UTXOs := chain.FindUTXO(address)

	for _, out := range UTXOs {
		balance += out.Value
	}

	fmt.Printf("Balance of %s: %d\n", address, balance)
}

// {from}에서 {to}로 {amount}만큼 보냅니다.
func (cli *CommandLine) send(from, to string, amount int) {
	if !wallet.ValidateAddress(from) {
		log.Panic("Address is not Valid")
	}
	if !wallet.ValidateAddress(to) {
		log.Panic("Address is not Valid")
	}
	chain := blockchain.ContinueBlockChain("") // blockchain을 DB로 부터 받아온다.
	defer chain.Database.Close()

	tx := blockchain.NewTransaction(from, to, amount, chain)
	chain.AddBlock([]*blockchain.Transaction{tx})
	fmt.Println("Success!")
}

func (cli *CommandLine) Run() {
	cli.validateArgs()

	// Go의 option 처리하는 함수들.
	getBalanceCmd := flag.NewFlagSet("getbalance", flag.ExitOnError)
	createBlockchainCmd := flag.NewFlagSet("createblockchain", flag.ExitOnError)
	sendCmd := flag.NewFlagSet("send", flag.ExitOnError)
	printChainCmd := flag.NewFlagSet("printchain", flag.ExitOnError)
	createWalletCmd := flag.NewFlagSet("createwallet", flag.ExitOnError)
	listAddressesCmd := flag.NewFlagSet("listaddresses", flag.ExitOnError)

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
	case "createwallet":
		err := createWalletCmd.Parse(os.Args[2:])
		if err != nil {
			log.Panic(err)
		}
	case "listaddresses":
		err := listAddressesCmd.Parse(os.Args[2:])
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

	if createWalletCmd.Parsed() {
		cli.createWallet()
	}

	if listAddressesCmd.Parsed() {
		cli.listAddresses()
	}
}
```

## 실행

 Wallet을 만들고 Wallet들의 address를 출력해봅시다.

![createwallet](../.gitbook/assets/image%20%2856%29.png)

Address가 만들어지는 과정과 이론을 비교해보세요.

몇 개의 wallet을 더 만들고 출력해보겠습니다.

![listaddresses](../.gitbook/assets/image%20%2857%29.png)

각기 다른 주소가 출력됩니다.



{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step5 브랜치에 있습니다 . 
{% endhint %}





Last update: 2021/04/29 

