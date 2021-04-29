---
description: 내 key를 담는 곳
---

# Wallet

## Wallet

Wallet\(지갑\)이라고 하면 왠지 안에 비트코인이 담겨 있을 것 같은 느낌이다. 하지만 비트코인에서 Wallet은 코인 자체를 담고 있지 않고, 대신 digital key를 가지고 있다. 대신 이 key를 통해 자신 소유의 UTXO를 사용할 수 있다.

### Private/Public Key Pair

Key는 private key, public key 쌍으로 이루어져있다. Public key를 자물쇠, private key는 키라고 생각할 수 있다. 자물쇠는 공개되어도 그 것을 열 수 있는 사람은 키를 가진 자 밖에없다.

비트코인에서 public key는 elliptic curve multiplicaion이라는 일방향 함수와 private key로 부터 만들어진다. 일방향 함수를 사용하므로 반대 방향, 즉 public key로 private키를 유추하는 것은 불가능하다.  

이 개념은 [Asymmetric\(Public\) Key Cryptography ](../common-algorithms/cryptography.md#asymmetric-public-key-cryptography)섹션에 더 자세히 설명되어 있다. 비트코인에서 private/public key pair를 구하는 방법인 Elliptic curve cryptography도 해당 문서에 설명되어 있기 때문에 여기서 자세한 방법을 다루지는 않겠다.

### Private Key, Public Key, Bitcoin Address

아래 그림은 비트코인에서 쓰이는 Key와 주소의 관계를 나타낸 그림이다. 결국 private키가 정해지면 public key와 bitcoin address는 그로부터 계산되어 정적으로 정해진다.

![relation](../.gitbook/assets/image%20%2867%29.png)

### Private Key 

Public Key와 Bitcoin 모두 private key로 부터 정적으로 생성되기 때문에 private key는 사실 계좌를 만들 때 결정해야할 유일한 요소이다. Private Key를 안다는 것은 해당 계좌의 모든 권한을 갖는 것과 같다. 실제로 사용하는 계좌의 Private Key는 절대로 유출해서는 안된다.

Private Key는 랜덤하게 뽑혀진 256bit의 숫자이다. 256bit 크기의 숫자로 나타낼 수 있는 숫자의 수는 아래와 같다.

$$
2^{256} = 1.1579209e+77
$$

 Private Key를 만들 때 가장 중요한 것은 절대로 기존에 존재하는 계좌의 private key와 겹치면 안된다는 점이다. 만약 겹치게 된다면 기존의 존재하던 계좌의 모든 잔고에 대해 통제권을 얻게된다. 예를들어, Binance\(거래소\)의 지갑의 private key와 겹치게 key를 발급받았다면, 지갑 생성과 동시에 수천억원을 얻게될 것이다.

계좌를 한명당 하나만 만들 수 있는 것도 아니고 무한으로 만들다보면 겹치는 private key를 발급 받을 수 있지 않을까? 256개의 0과 1을 잘 조작하면 겹치는거 하나 찾는거는 일도 아닐 것 같아보이기도 한다. 하지만 직관적으로 256비트의 크기를 보여주는 아래 영상을 참고하면 생각이 달라질 것이다.

{% embed url="https://www.youtube.com/watch?v=S9JGmA5\_unY" caption="256bit 숫자는 얼마나 안전한가" %}

{% hint style="danger" %}
필자의 생각. 나에게 많은 컴퓨팅 자원이 주어진다면 기존 계좌와 겹치는 private key를 찾아 나서느니, 그보다 몇 불가사의 배는 쉬운 비트코인 PoW를 풀 것이다. 아마 해커도 마찬가지 생각일거라 안전하다고 생각한다. 
{% endhint %}

256bit의 숫자를 랜덤하게 선택하면 안전하다. 대신 조건이 있다. **"완벽하게"** 랜덤해야한다. 

예를 들어 4자리의 pin번호를 생각해보자. 찍어서 맞출 확률이 1/9999 같지만, 사람은 완벽하게 랜덤하지 않기 때문에 확률은 이보다 올라간다. 4자리하면 생각나는 날짜 즉, 0101 부터 1231의 해당하는 번호에서 찍는다면 맞출 확률이 훨씬 높다.

Bitcoin은 OS에서 제공하는 random number generator를 사용해서 256bit 숫자를 만든다고한다. 사람의 random한 인풋 \(마우스 움직임 등\)을 이용해서 random number를 만든다고 한다. _\(Human source는 어느정도의 non-randomness를 가지기 때문에 잘 사용하지 않는다고 wiki에 적혀있는데 비트코인에서 사용한다니. 이부분은 확실치 않다.\)_

{% hint style="warning" %}
만약 코인을 직접 만든다면 "True" randomness를 부여하는 generator를 사용하였는지 꼭 확인해야한다. 
{% endhint %}



### Public Key

Public Key는 Private Key로 부터 만들 수 있다. Elliptic Curve Cryptography를 이용하는데, 자세한 내용은 생략하고 간단히 요약하면 아래 식으로 계산된다. Public key는 \(K\), Private key는 \(k\), G는 Gerator point라는 상수로 비트코인 전체에서 같은 G를 사용한다.

$$
K = k * G
$$

여기서 k로 K를 계산하기는 쉽지만 K로 k를 계산할 수 는 없다\(매우 어렵다\).

### Bitcoin Address

Bitcoin address는 숫자나 \(특정 문자를 제외한\)문자로 이루어진 문자열이다. 이는 계좌번호와 같은 용도로 사용된다. 세상에 공개해서 이 bitcoin address로 비트코인을 보내달라고 요청할 수 있다. \(참고: 저의 비트코인 주소는 1Laii7Kyu6rSev88VvdV5kCJq9JzkWCDUw 입니다...\)

비트코인 거래에서 이 비트코인 주소는 TXO의 수령인으로 사용된다.

비트코인 주소가 Public key로 부터 만들어지는 과정을 자세하게 알아보자. 먼저, public key는 암호화 함수인 SHA256과 RIPEMD160 함수로 해싱된다. 이는 결과적으로 160bit의 값\(A\)을 만들어낸다.

$$
A = RIPEMD160(SHA256(K))
$$

 이 값 A는 Public Key의 해시값이므로 Public Key Hash 라고 부른다. 

Bitcoin Address는 거의 항상 Base58Check로 인코딩하여 사용한다. Base58Check는 58개의 문자를 사용하고 checksum을 사용하기 때문에 이렇게 불린다. Base58은 Base64에서 사람이 읽기 헷갈리는 문자 \(0, O, I, l\)를 제외하고, 더블 클릭시 전체 선택에 방해되는 문자 \(+, /\)를 제외한 58개의 문자를 사용한 encoding 기법이다. 여기에 주소값 에러\(실수\)를 방지하기위해 checksum을 도입한 것이 Base58Check 인코딩이다. 비트코인에서는 추가로 version number를 Prefix로 추가한다.

$$
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
$$

아래는 public key를 bitcoin address로 변환하는 전체 과정에 대한 그림이다.

![Public key to bitcoin address: conversion of a public key into a bitcoin address](../.gitbook/assets/image%20%2866%29.png)

아래는 Public Key Hash를 Bitcoin address로 변환하는 과정을 자세하게 표현한 그림이다. Version이 Public Key Hash에 Prefix로 붙고 이를 인풋으로 SHA256 해시를 두번한 해시값의 앞 4byte를 Postfix로 붙는다. 이 값을 Base 58 Encoding하면 최종적으로 Bitcoin address를 얻을 수 있다.

![Base58Check encoding: a Base58, versioned, and checksummed format for unambiguously encoding bitcoin data](../.gitbook/assets/image%20%2865%29.png)

### 실습

이 내용은 [wallet](../create-own-coin-with-golang/5-wallet.md) 실습에서 다루고 있습니다.





참고:  
[https://www.oreilly.com/library/view/mastering-bitcoin-2nd/9781491954379/ch04.html](https://www.oreilly.com/library/view/mastering-bitcoin-2nd/9781491954379/ch04.html)



