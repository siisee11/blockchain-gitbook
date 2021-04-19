---
description: 유니스왑이란?
---

# Uniswap

유니스왑은 이더리움 네트워크에 구축된 탈중앙화 거래소 프로토콜이다. 이더리움 참여자들은 유니스왑을 통해서 중앙 주체 없이 거래를 진행할 수 있다.

## Uniswap의 작동 방식

유니스왑은 오더북이 없다. 대신 [AMM](dex.md#automatic-market-maker-amm)의 변형모델인 CPMM을 이용하여 거래 프로토콜을 설계하였다.

유니스왑은 교환 가능한 두 토큰에 대한 유동성 풀을 소요하고 있는 스마트 콘트랙트를 배포한다. 누구나 유동성 공급자가 되어서 해당 스마트 콘트랙트에 유동성 풀을 제공할 수 있다. 

유동성 공급자는 동등한 가치의 두 토큰을 유동성 풀에 공급\(deposit\)한다. 중앙 거래소에 1 ETH가 200 USDT의 가치로 거래되고 있다고 한다면, 1 ETH와 200 USDT를 동시에 유동성 풀에 입금함으로써 유동성 공급자가 될 수 있다. 유동성 공급자들에게는 유동성 토큰 \(Luquidity Provider Token, LP token\)이 인센티브 형태로 제공된다. 이 유동성 토큰은 해당 유동성 풀의 지분을 나타낸다.

### CPMM\(Constant Product Market Maker\)

CPMM은 두 토큰 간의 교환 비율을 산정하여 자동적으로 시장이 형성되도록 한다. 두 변수의 곱\(product\)이 상수\(constant\)가 되도록하는 알고리즘을 사용한다.

$$
x * y = k (constant)
$$

ETH/USDT 유동성 풀을 예로 들면, 위 식에서 x는 풀에서 ETH의 비중, y는 USDT의 비중을 나타낸다. 초기에 유동성 공급자가 두 토큰을 공급하여 유동성 풀에 10 ETH, 3000 USDT가 입금되어 있다고 하자.

![&#xCD08;&#xAE30; &#xC0C1;&#xD0DC;](../.gitbook/assets/image%20%2827%29.png)

이제 구매자 A가 나타나 1 ETH을 지불하여 USDT를 사려고 한다. ETH 1을 담아 위의 스마트 컨트랙트를 실행하면 아래 그림처럼 CPMM에 의해서 272.72 USDT를 받을 수 있다.

![](../.gitbook/assets/image%20%2828%29.png)

이제 유동성 풀에 ETH는 많아지고 USDT는 적어지게 되었다. 이는 USDT의 가격이 상대적으로 높아진 것을 의미한다. 위의 상태에서 1ETH는 약 247 USDT와 동일한 가치를 가진다. 만약 다른 거래소에서 1 ETH가 여전히 300 USDT의 시세로 거래가 되고 있다면, 차익 거래자들은 위 유동성 풀에 다시 USDT를 공급하여 상대적으로 싼 값에 ETH를 구매할 것이 예상된다. 이 과정에서 토큰 간의 교환비는 시장에서 거래되는 가격의 비율로 맞춰지게 된다.

유동성 풀이 충분히 크다면 교환비율의 변화가 크지않아 안정적으로 거래를 할 수 있다.

### LP token \(Liquidity Shares\)

LP 토큰은 Liquidity Pool을 제공한 유동성 공급자에게 주어지는 토큰이다. 입금\(deposit\)시 토큰을 유동성 풀에 넣고 LP 토큰을 부여받고, 출금\(withdraw\) 시에 LP 토큰을 반납하고 LP 토큰에 매핑된 만큼의 토큰을 다시 돌려 받는다. LP 토큰은 또한 해당 유동성 풀에 대한 지분을 나타내는데, 이를 통해 수수료 또한 수령할 수 있다.

### Uniswap의 수수

Uniswap은 유동성 공급자에게 0.3%의 수수료를 제공한다. 만약 유동성 풀의 10%의 지분을 지고 있다면 해당 유동성 풀을 가진 스마트 컨트랙트에서 일어나는 총 거래액의 0.03%의 수수료를 받을 수 있다. 

현재 버전에서 Uniswap 창립자는 어떠한 수수료도 받지 않지만, version 2에서는 수수료를 받을 수도 있다.

### 







참고:   
[https://academy.binance.com/ko/articles/what-is-uniswap-and-how-does-it-work](https://academy.binance.com/ko/articles/what-is-uniswap-and-how-does-it-work)  
[https://blog.chain.link/tag/education/](https://blog.chain.link/tag/education/)

Last update: 04/20/2021

