---
description: Transaction에 서명을 추가하여 보안을 강화한다.
---

# \#6 Transaction Advanced































## Testing

시작전에 기존에 생성되어 있는 DB와 지갑 정보들을 지운다.

```text
rm tmp/wallet.data
rm tmp/blocks/*
```

다시 지갑 두개를 생성한다. 

![create 2 wallets](../.gitbook/assets/image%20%2864%29.png)

첫 지갑의 주소로 blockchain을 생성한다.

```text
go run main.go createblockchain -address <A1>
```

![createblockchain](../.gitbook/assets/image%20%2860%29.png)

printchain 커맨드로 체인을 출력해봅시다. 아래와 같이 Genesis Block과 coinbase transaction에 대한 정보가 출력됩니다.

```text
go run main.go printchain
```

![printchain](../.gitbook/assets/image%20%2861%29.png)

1번째 주소에서 2번째 주소로 30을 송금해보고, printchain으로 결과를 확인합니다. 두번째 블록에 기록된 트랜잭션의 상세 내용을 확인할 수 있습니다.

```text
go run main.go send -from <A1> -to <A2> -amount 30
go run main.go printchain
```

![After first transaction](../.gitbook/assets/image%20%2858%29.png)



{% hint style="success" %}
코드는  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step6 브랜치에 있습니다 . 
{% endhint %}



Last update: 2021/04/29

