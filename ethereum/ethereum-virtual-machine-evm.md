---
description: JVM과 유사하게 btyecode를 실행시켜주는 EVM
---

# Ethereum Virtual Machine \(EVM\)

Ethereum Virtual Machine \(EVM\)은 이더리움의 smart contract를 위한 런타임 환경\(runtime environment\)이다. 이더리움 블록체인의 모든 \(state\)상태 변화와 smart contract는 트랜잭션에 의해 실행된다. EVM은 이더리움 네트워크에서 모 트랜잭션을 처리한다.

EVM은 컴퓨터\(머신\)과 코드 사이의 추상화 계층을 만들어준다. 어떠한 머신에서도 동작할 수 있는 오퍼레이션들을 미리 정의해놓고 해당 오퍼레이션으로 이루어진 코드는 어떠한 머신에서도 동작가능하다는 뜻이다. 이는 JAVA Virtual Machine\(JVM\)과 유사한 개념이며, Java 코드가 JVM이 동작하는 모든 머신에서 수행 가능한 것과 같다. 더 자세하게 EVM은 140개의 opcode를 제공한다. 이 opcode는 EVM이 자원만 충분하다면 거의 모든 계산을 다 할 수 있는 Turing-complete이도록 해준다.

{% hint style="info" %}
dapp 개발자라면 EVM에 대해서 자세하게 알 필요는 없다. EVM은 이더리움 노드에 존재하며 이더리움의 모든 어플리케이션을 안정적으로 동작시키고 있다.
{% endhint %}



