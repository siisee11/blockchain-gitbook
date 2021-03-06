---
description: 줄여서 UTXO
---

# Unspent Transaction Output

Unspent Transaction Output\(UTXO\)는 한국어로 미사용 트랜잭션 출력값이라고 부른다. 단어가 복잡해서 어렵게 느껴지는데 간단하게 _금액이 적혀 있는 지폐_ 라고 생각할 수 있다.

## Bitcoin에서 잔고

사실 **비트코인에서 잔고는 실제로 존재하지 않는다**. 지갑 어플리케이션을 켜서 비트코인을 확인해보면 내가 가진 비트코인의 수량이 나타난다. 하지만 이는 어플리케이션이 나에게 속한 UTXO를 모아서 보여주는 것으로, 실제로 내 계좌에 비트코인의 수량\(잔고\)이 기록되어 있는 것은 아니다.

## UTXO는 무엇인가?

UTXO는 위에서 말했듯이 금액이 적혀 있는 지이다. 1.3 BTC짜리 UTXO 객체, 0.003 BTC짜리 UTXO 객체 등의 다양한 UTXO 객체들이 거래의 결과 생성된다.

### 일반적인 거래 \(은행 거래\)

은행을 통해 Alice가 Bob에게 돈 만원을 송금하는 과정을 생각해보자. 은행은 Alice의 계좌에 만원 이상이 존재하는 지 확인하고 Alice의 잔고에서 만원을 차감한 후 Bob의 잔고에 만원을 추가할 것이다.

### 비트코인 거래

비트코인은 계좌 잔고를 수정함으로써 거래를 하는 시스템이 아니다. 비트코인의 거래 과정을 따르면 Alice가 Bob에게 만원을 송금하는 과정은 다음과 같다. 먼저 Alice의 계좌에는 8250원 짜리 지폐, 1500원 짜리 지폐, 550원 짜리 지폐가 있다. 세 지폐의 합이 만원이 넘으므로 세 지폐 모두 은행에 보낸다. 은행은 총액 10300원인 지폐 세장을 태워버리고 10000원 짜리 지폐와, 300원 짜리 지폐를 새로 발행한다. 이중 만원 지폐를 Bob에게 전달하고 남은 300원 짜리 지폐를 다시 Alice에게 돌려준다.

위에서 "x원 짜리 지폐" 가 UTXO, 은행이 비트코인 네트워크에 대응된다.

### UTXO를 사용한 트랜잭션

비트코인 백서에는 UTXO라는 표현은 없다. 다만 세션 9\(Combining and Splitting Value\)에 아래와 같은 그림이 나온다. 즉 트랜잭션은 여러 개의 UTXO-IN을 받아서 합치고 2개의 UTXO-OUT\(하나는 지불을 위한 UTXO이고 다른 하나는 거스름돈을 위한 UTXO\)으로 나누어 출력하는 것이다.

![Combining and Splitting Value](../.gitbook/assets/image%20%2832%29.png)

### UTXO의 특징

UTXO는 트랜잭션이 일어나면 소멸되고 다시 생성된다. 즉, UTXO는 일회성이기 때문에 익명성과 보안성이 강하다.



### 이더리움에서의 Account

이더리움은 UTXO를 사용하지 않고 account를 이용해서 계좌 잔고를 추적한다. 자세한 내용은 [Ethereum세션의 Accounts](../ethereum/accounts.md)를 참고하자.



Last update: 04/20/2021

