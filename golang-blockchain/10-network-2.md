---
description: Network에서 구현하지 않았던 함수들을 마저 구현합니다.
---

# \#10 Network 2

이번 파트에서는 이전 파트에서 구현한 네트워크 뼈대에 살을 붙혀보겠습니다.

이번 파트에서 완성할 네트워크 코드는 탈중앙화된 P2P 방식의 네트워크가 아닙니다. 중앙 노드\(central node\)가 있고 네트워크에 참여하고자하는 노드는 이 노드의 주소를 알고 있다는 가정으로 구현합니다.

 파트를 더 진행해 나가면서 보완해 나갈 것입니다.

## 시나리오

네트워크의 시나리오를 먼저 생각해보고 진행해보도록 하겠습니다.

네트워크를 구성해야하는데 컴퓨터\(IP\)는 한 개 이므로 각 노드를 포트번호로 구별해서 네트워킹을 구현하도록 하겠습니다.  터미널 마다 환경 변수로 NODE언더바ID를 다르게 세팅하고 \(3000, 3001, 3002\) 노드는 `localhost:NODE언더바ID` 를 주소로하여 네트워킹을 진행할 것입니다.

한 컴퓨터에서 노드 3개를 돌릴 것이기  때문에 wallet.data 파일과 block DB 이름이 겹치게 됩니다. 노드아이디를 postfix로 붙혀서 구별하도록 하겠습니다. \(ex. tmp/block\_3000\)

앞서 말했듯이 이 구현의 네트워크에는 **중앙 노드**가 존재합니다. 중앙 노드는 **localhost:3000**으로 하드코딩 되어 있습니다. 네트워크를 참여하고자 하는 노드는 이 중앙 노드를 통해 블록체인을 받아오거나 네트워크에 속한 참여자들을 받아올 수 있습니다.

##  코드 수정 및 구현

이번 파트에서는 여러 파일에 거쳐서 구현 및 수정을 하기 때문에 복잡해서 모든 코드를 여기에 적지 않겠습니다. 깃허브 step10 브랜치에 코드를 올려놓았으니 깃허브에서 코드를 확인해주세요.

수정한 부분 중 중요한 부분만 코드를 삽입하겠습니다.

* blockchain/blockchain.go : AddBlock, GetBestHeight, GetBlock, GetBlockHashes, MintBlock, retry, openDB 함수

```go
// {chain}에 {block}을 추가합니다.
// {block}이 이미 blockchain에 기록되어 있다면 skip합니다.
func (chain *BlockChain) AddBlock(block *Block) {
	err := chain.Database.Update(func(txn *badger.Txn) error {
		// 블록이 이미 있다면 그냥 리턴
		if _, err := txn.Get(block.Hash); err == nil {
			return nil
		}

		blockData := block.Serialize()
		// 새로운 블록을 DB에 추가
		err := txn.Set(block.Hash, blockData)
		Handle(err)

		item, err := txn.Get([]byte("lh"))
		Handle(err)
		lastHash, _ := item.ValueCopy(nil)

		item, err = txn.Get(lastHash)
		Handle(err)
		lastBlockData, _ := item.ValueCopy(nil)

		// local에 저장되어 있는 가장 최신블록 {lastBlock}
		lastBlock := Deserialize(lastBlockData)

		// 새로 받은 block의 Height가 더 높다면
		if block.Height > lastBlock.Height {
			// lh를 받은 블록의 해시값으로 업데이트합니다.
			err = txn.Set([]byte("lh"), block.Hash)
			Handle(err)
			chain.LastHash = block.Hash
		}

		return nil
	})
	Handle(err)
}

// lh에 해당하는 블록의 Height 반환.
func (chain *BlockChain) GetBestHeight() int {
	var lastBlock Block

	err := chain.Database.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte("lh"))
		Handle(err)
		lastHash, _ := item.ValueCopy(nil)

		item, err = txn.Get(lastHash)
		Handle(err)
		lastBlockData, _ := item.ValueCopy(nil)

		lastBlock = *Deserialize(lastBlockData)

		return nil
	})
	Handle(err)

	return lastBlock.Height
}

// Block의 Hash값으로 블록 객체를 검색
func (chain *BlockChain) GetBlock(blockHash []byte) (Block, error) {
	var block Block

	err := chain.Database.View(func(txn *badger.Txn) error {
		if item, err := txn.Get(blockHash); err != nil {
			return errors.New("Block is not found")
		} else {
			blockData, _ := item.ValueCopy(nil)

			block = *Deserialize(blockData)
		}
		return nil
	})
	if err != nil {
		return block, err
	}

	return block, nil
}

// {chain}의 모든 블록의 해시값을 배열로 리턴합니다.
func (chain *BlockChain) GetBlockHashes() [][]byte {
	var blocks [][]byte

	iter := chain.Iterator()

	for {
		block := iter.Next()

		blocks = append(blocks, block.Hash)

		if len(block.PrevHash) == 0 {
			break
		}
	}

	return blocks
}

// 새로운 블록을 채굴하여 블록체인에 연결하는 함수
// 새로 추가된 블록을 리턴함.
func (chain *BlockChain) MintBlock(transactions []*Transaction) *Block {
	var lastHash []byte
	var lastHeight int

	for _, tx := range transactions {
		if !chain.VerifyTransaction(tx) {
			log.Panic("Invalid Transaction")
		}
	}

	// 가장 최근 블록의 Hash가져옴
	err := chain.Database.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte("lh"))
		Handle(err)
		lastHash, err = item.ValueCopy(nil)
		Handle(err)

		item, err = txn.Get(lastHash)
		Handle(err)
		lastBlockData, _ := item.ValueCopy(nil)

		lastBlock := Deserialize(lastBlockData)

		lastHeight = lastBlock.Height

		return err
	})
	Handle(err)

	// lashHash를 토대로 다음 문제를 풀어 새로운 블록을 생성.
	newBlock := CreateBlock(transactions, lastHash, lastHeight+1)

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

	return newBlock
}

// "LOCK"파일을 없애고 Truncate 옵션을 주어 다시 시도
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

// 비정상 종료 혹은 여러 노드가 동시 접근 등 예외 상황을 처리한 Open helper 함수
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

* cli/cli.go : send 함수 

```go
// {from}에서 {to}로 {amount}만큼 보냅니다.
// {mintNow}가 true이면 send트랜잭션을 담은 블록을 생성하고
// {mintNow}가 false이면 트랜잭션을 만들어 중앙 노드(localhost:3000)에게 보냅니다.
func (cli *CommandLine) send(alias, to string, amount int, nodeId string, mintNow bool) {
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
		network.SendTx(network.KnownNodes[0], tx)
		fmt.Println("send tx")
	}

	fmt.Println("Success!")
}
```

* wallet/wallets.go \(Alias 추가\)

```go
// Wallets에 Wallet을 추가합니다.
func (ws *Wallets) AddWallet(alias string) string {
	// wallet을 만들고
	wallet := MakeWallet()
	// wallet의 주소를 string형태로 저장합니다.
	address := fmt.Sprintf("%s", wallet.Address())

	// address => wallet 을 매핑에 넣습니다.
	ws.Wallets[address] = wallet
	if alias != "" {
		ws.Alias[alias] = address
	} else {
		ws.Alias[address] = address
	}

	return address
}

func (ws Wallets) GetAddress(alias string) string {
	address, exists := ws.Alias[alias]
	if exists {
		return address
	}
	return alias
}

// Wallets에 저장된 모든 alias값을 반환합니다.
func (ws Wallets) GetAllAliases() []string {
	var aliases []string

	for alias := range ws.Alias {
		aliases = append(aliases, alias)
	}

	return aliases
}
```

다른 파일들의 자잘한 에러등은 쉽게 처리할 수 있을 것입니다. 

## Test

드디어 완성된 네트워크를 실험해봅시다. 먼저 터미널을 3개 열어서 아래와 같이 환경변수를 설정한 후 지갑을 만듭니다.

 3000번 노드에서는 createblockchain까지 실행해줍니다. 

![&#xD658;&#xACBD;&#xBCC0;&#xC218; &#xC124;&#xC815; &#xBC0F; &#xC9C0;&#xAC11; &#xC0DD;&#xC131;](../.gitbook/assets/image%20%2888%29.png)

현재 구현상 GenesisBlock은 cp를 통해 직접 복사해야합니다. \(StartNode가 ContinueBlockChain으로 실행하기 때문\) cp 커맨드를 이용해서 아래와 같이 복사해줍니다.

```text
cd tmp && ls
cp -r blocks_3000 blocks_3001
cp -r blocks_3000 blocks_3002
cp -r blocks_3000 blocks_3003
cp -r blocks_3000 blocks_gen
cd ..
```

![&#xBE14;&#xB85D; &#xCD08;&#xAE30; &#xC124;&#xC815;](../.gitbook/assets/image%20%2878%29.png)

이제 3 노드 모두 Genesis Block만 존재하는 Blockchain을 가지게 되었습니다. 3000번 노드에서 send 함수를 -mint 옵션을 추가해서 실행시켜서 블록을 추가해줍니다. 3000번 노드만 2개의 블록을 가지게 되었습니다. 

![send with &quot;-mint&quot; option](../.gitbook/assets/image%20%2874%29.png)

이제 3000번 노드를 실행시키고 3001번에서도 노드를 실행시킵니다.

```text
go run main.go startnode
```

{% hint style="info" %}
3000번 노드가 중앙 노드이므로 3000번 부터 실행해야합니다.
{% endhint %}

3001번이 실행되면 3000번 노드에게 Version 정보를 보내고, 3001 번의 Height가 더 낮기 때문에 3000번에서 블록을 가지고와 로컬 DB에 저장합니다.

![startnode](../.gitbook/assets/image%20%2890%29.png)

이제 3002번 노드를 -minter 옵션을 주어서 실행시킵니다. minter는 3002번 노드의 지갑 주소 입니다. 이제 3002번은 트랜잭션을 모으고 새로운 블록을 채굴하여 블록체인에 연결하는 채굴 노드 역할을 합니다.

![startnode 3002 as minter](../.gitbook/assets/image%20%2887%29.png)

3001번에서 `ctrl-c` 로 빠져나온 후 "-mint" 옵션을 주지 않고 send 커맨드를 실행시켜 보겠습니다. -mint 옵션이 없으면 send 트랜잭션을 네트워크 참여자들에게 보내기만 합니다.

3002번 노드가 1개의 트랜잭션을 memoryPool에 모았기 때문에 Mint함수를 실행하여 블록을 채굴합니다.

![3001&#xC774; &#xBCF4;&#xB0B8; tx&#xB97C; 3002&#xAC00; &#xBC1B;&#xACE0;, &#xBE14;&#xB85D;&#xC744; &#xC0DD;&#xC131;&#xD574; &#xC801;&#xB294;&#xB2E4;.](../.gitbook/assets/image%20%2886%29.png)

이로서 적당히\(?\) 동작하는 블록체인을 구현하고 실행해보았습니다.

##  세션을 마치며...

이 코드까지가 [Tensor Programming](https://www.youtube.com/channel/UCYqCZOwHbnPwyjawKfE21wg) 의 강의가 다루는 내용이었습니다. 저는 블록체인의 기본 개념들을 코드로 직접 구현하는 것이 블록체인을 이해하는데 많은 도움이 되었습니다. 하지만 여기까지의 구현은 아직 여러 문제들이 존재합니다. 아마 여기까지 코드를 잘 따라 왔다면 이런 의문이 들었을 것입니다.

### 중앙 노드의 존재

위에서 설명했듯이 지금 구현은 중앙 노드가 존재합니다. 노드들은 이 중앙 노드를 통해야만 새로이 네트워크에 참여할 수 있습니다. 또 트랜잭션도 중앙 노드를 통해 전파됩니다. 이는 실제 블록체인들과 다른 점 입니다.

다음 세션에서 P2P 방식의 네트워크를 사용하여 이를 해결할 것 입니다.

### 블록체인 다운로드

새로 블록체인 네트워크에 접속하면 중앙 노드로 부터 전체 블록을 모두 받아옵니다. 실제 블록체인에서는 Full 노드만 전체 블록체인을 저장합니다.

### UTXO 중복 사용

cli의 send 함수에서 mintNow가 아니라면 UTXO를 업데이트하지 않아 이미 사용한 UTXO에서 중복사용이 일어납니다.

이로인해서 만약  트랜잭션의 내용 \(from, to, amount\)이 같다면 완전히 일치하는 TxID가 만들어집니다. 

### 난이도 조절

\#2 에서 언급했듯 지금 구현에서 difficulty 조절이 불가능합니다.

### 



위의 문제점\(의문점\)들을 다음 세션에서 수정할 것입니다. 다음 세션부터는 저자 스스로 구현할 것이니 시간이 오래 걸릴 수도 있습니다.





{% hint style="success" %}
여기 까지의 구현은  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step10 브랜치에 있습니다 . 
{% endhint %}



Last updated: May 11, 2021

