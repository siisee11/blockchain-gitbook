---
description: 트랜잭션에 서명하고 유효성 평가하기
---

# Signature & Verification

Bitcoin은 화폐시스템이다. 나는 내가 소유한 Bitcoin에 대해서만 처분권이 있으며, 내 소유가 아닌 Bitcoin을 소비할 수 없다.

법정 화폐시스템에서는 내 지갑이나 내 계좌안에 들어 있는 돈에 대해 처분권을 가진다. 내 지갑 안에서 돈을 꺼내는 행위로 그 돈의 소유가 증명되는 것이다.

하지만, 비트코인 시스템에서 비트코인 지갑에는 실제 비트코인이 들어있지 않다. 그저 "내꺼"라고 적힌 UTXO들이 여기저기 퍼져 저장되어 있을 뿐이다. 그렇다면 중요한 것은 "내꺼"라고 서명하는 일과 "소비자"가 "소비자"의 UTXO를 사용한게 맞는지 검증하는 일이다. 전자를 Signature, 후자를 Verification이라고 한다.

다음의 간단한 송금 과정을 예로 들어서 서명과 검증 과정이 어떻게 일어나는지 알아보자.

1. Alice는 블록체인을 새로 만들어서 Coinbase로 부터 10bitcoin을 부여받았다. 
2. Alice는 같이 블록체인을 개발한 개발자 Bob에게 5bitcoin을 전송한다.
3. 검증인은 해당 트랜잭션이 유효한지 검증한다.

## Coinbase transaction

블록을 새로 만들 때 비트코인이 보상으로 제공되는 COINBASE 트랜잭션은 일반 트랜잭션과 달리 송신자가 없다. [Bitcoin 블록 내용](https://www.blockchain.com/btc/block/00000000000000000002e316d3e83ce1c2263600b525671b176271567ba7da6e)을 확인해보면 블록의 가장 첫 트랜잭션은 COINBASE로 부터 발생되는 트랜잭션이다.

![&#xBE44;&#xD2B8;&#xCF54;&#xC778;&#xC774; &#xB9CC;&#xB4E4;&#xC5B4;&#xC9C0;&#xB294; coinbase &#xD2B8;&#xB79C;&#xC7AD;&#xC158;](../.gitbook/assets/image%20%2868%29.png)

새로 생성되는 코인인 만큼 UTXO-IN는 존재하지 않고 UTXO-OUT만 존재한다. UTXO-OUT에는 수신자의 bitcoin address가 기록된다. COINBASE 트랜잭션은 코인이 생성되는 것으로 송신자가 없으므로 서명 또한 없다.

### 예시 상황 

COINBASE 트랜잭션이 발생하여 Alice의 주소와 10 BTC 값이 적힌 UTXO가 생성된다.  

## Normal send transaction

비트코인을 전송하는 보통의 트랜잭션이 일어나는 경우를 살펴보자. 아래 스크린샷을 보면 "1"로 시작하는 일반 지갑 주소에서 "1"로 시작하는 다른 일반 지갑 주소로 비트코인이 전송되는 것을 볼 수 있다.

![Transaction](../.gitbook/assets/image%20%2869%29.png)

### 예시 상황  

Alice는 COINBASE에서 자신의 주소로 주어진 10 BTC를 찾아서 이중 5 BTC를 Bob에게 보낼 것이다. 

1. Alice는 blockchain을 블록체인에서 자기 소유의\(자신의 주소가 적힌\) UTXO를 찾아낸다.
2. 만약 지금까지 찾아낸 UTXO의 담긴 BTC의 합이 보내려는 BTC보다 작다면 1을 반복한다.
3. **소모하려는 UTXO\(UTXO-IN\)에 Alice가 Alice의 private key를 이용해서 서명한다.**
4. 전송할 UTXO에 Bob 주소를 적고, 반환될 UTXO에 Alice 주소를 적는다.
5. 트랜잭션을 네트워크에 알린다.

## Validation

네트워크의 참여자들은 트랜잭션의 유효성을 검증한다. 소비자가 자신의 비트코인을 이용한게 맞는지 Ownership 검증이 필요하다.

### 예시 상황 

Alice가 네트워크에 올린 트랜잭션을 검증자가 유효성 검사를 할 것이다.

1. 검증자는 트랜잭션의 UTXO-IN을 검증할 것이다.
2. **UTXO-IN을 보고 검증자가 알 수 있는 것은 해당 UTXO가 누구의 주소의 소유인지\(Alice의 주소\)와 Alice의 서명을 알 수 있다.**
3. **검증자는 이 두가지 정보로 검증식에 대입해서 유효성을 검사를 완료한다.**

## How sign and verify work?

Sign과 Verify과정은 암호학을 사용하여 디지털 서명이라는 과정으로 진행된다. Bitcoin과 Ethereum은 ECDSA를 이용하여 디지털 서명 및 확인과정을 구현하였다. ECDSA는 수학적으로 복잡한 내용이고 전문 분야가 아니라 잘못된 내용을 전달할 수 있어 자세한 내용은 참조 링크로 대체하겠습니다.

{% embed url="http://blog.somi.me/math/2019/06/10/understanding-ECC-ECDSA/" %}

제가 이해한 정도로 요약하면 아래와 같습니다.

비트코인은 ECDSA\(Elliptic Curve Digital Signature Algorithm\)을 사용하여 서명과 검증을 진행한다. 이 때, secp256k1에 정의된 상수를 대입한 타원 곡선을 사용한다. 서명하고자하는 데이터를 해시하여 private key와 함께 마법의 방정식에 넣으면 S값, R값으로 구성된 서명이 나온다. Public key의 주인과 서명한 사람이 같은 지 확인하려면 Public Key와 서명을 마법의 방정식에 넣고 결과로 나온 값과 서명의 R값이 같은지 비교한다.

{% hint style="info" %}
이 부분에서 가장 찜찜 했던 부분은 공개되어 있는 두 정보를 가지고 유효한 서명인지 판별하는 것이었습니다. 수학적인 내용이 잘 이해가 되지않아 일단 마법의 방정식이 이를 가능케 한다고 생각하도록 하겠습니다.
{% endhint %}

### 예시 상황 

Alice의 트랜잭션에 서명하고 Bob이 검증한다.

Alice는 트랜잭션의 해시값과 자신의 private key를 마법의 방정식에 넣어 서명을 만들고 이를 트랜잭션에 적어 네트워크에 보낸다.

$$
MagicFn(tx.Hash, Alice.privateKey) = signature
$$

Bob은 네트워크에서 Alice의 트랜잭션을 받아 검증한다.

$$
MagicFn(Alice.PublicKey, signature) == signature.R
$$



### 실습 

이 부분에 대한 코드 구현은 [내 코인 만들기 섹션의 \#6 Transaction Advanced](../golang-blockchain/6-transaction-advanced.md) 파트에 있습니다. 



Last updated: May 1, 2021

