---
description: 비영구적 손실
---

# Impermanent Loss

유동성을 제공할 때, 비영구적 손실이 발생할 수 있다.

## Impermanent Loss \(IL\)

유동성 공급자가 되기전에 한가지 고려할 사항이 바로 비영구적 손실이다. 유동성 공급자가 되는 것만으로 비영구적 손실을 입을 수 있다.

예를 들어서 설명해 보자. Alice가 ETH-USDT 풀에 1ETH, 100USDT를 입금하여 유동성을 공급하였다. USDT로 환산하면 총 200 USDT를 입금한 것이다. Alice가 입금한 후에 유동성 풀에 10 ETH, 1000USDT가 존재한다고 가정하자. Alice는 전체 유동성 풀의 10%의 지분을 소유하게 된다.

시간이 지나서 ETH의 가격이 상승해서 USDT 400개의 가치와 같아졌다. 시장에서의 가격이 달라졌기 때문에 차익거래자가 USDT를 추가하고 ETH를 획득할 것이기에 유동성 풀에서도 교환 비율이 시장 가격에 맞춰지게 된다. 따라서 이제 풀에는 5 ETH와 2000 USDT가 존재한다. 

이 상황에서 Alice는 자신의 지분 10%에 해당하는 자금을 출금하고자 한다. 지분을 반납하고 0.5 ETH와 200 USDT를 돌려받게 된다. 현재 1ETH는 400 USDT이므로 총 400 USDT를 돌려받게 되는 것이다. 처음에 입금한 200 USDT에 비해 2배의 수익을 올렸다. \(+ 추가적으로 수수료까지\)

하지만 Alice가 1 ETH와 100 USDT를 유동성 풀에 공금하지 않고 그대로 들고 있었다면, 현재 가치는 총 500 USDT가 된다. 유동성 풀에 공급함으로써 토큰의 가치 상승으로 취할 수 있는 이득에 비해 **손실**을 얻는다. 

아래 그림은 위 과정을 설명한다. Alice2 는 유동성 풀에 입금한 평행세계의 Alice이다.

![Impermanent Loss](../.gitbook/assets/image%20%2834%29.png)

마찬가지로 가격이 하락했을 때도 추가적인 손실을 입는다. 아래 그림은 1 ETH가 25 USDT의 가치로 하락했을 때를 보여준다.

![IL 2](../.gitbook/assets/image%20%2831%29.png)

해당 손실이 **비영구적**인 이유는 자산의 가격이 다시 원래대로 돌아오면 사라지는 효과이기 때문이다.



Last update: 04/20/2021

