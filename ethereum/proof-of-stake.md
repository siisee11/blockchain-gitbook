---
description: Eth2의 컨센서스 알고리즘
---

# \(ETH2\) Proof of Stake

## What is Proof-of-Stake \(PoS\)

Proof-of-Stake는 이더리움 커뮤니티에서 Eth2를 위해 개발하고 있는 컨센서스 알고리즘이다.

네트워크 참여자는 ETH를 모아서 Validator가 된다. Validator는 Proof-of-Work의 채굴자\(Miner\)와 같은 역할을 한다.

Proof-of-stake는 proof-of-work에서 몇 가지를 개선하였다.

* 에너지 효율성 - 블록을 채굴하는데 소요되는 에너지를 줄였다.
* 낮은 채굴 진입장벽 - 채굴 기회를 얻기 위해서 특별한 하드웨어가 필요하지 않다.
* 중앙화 면역 - PoS는 더 많은 노드를 네트워크에 둔다.
* **shard chain**을 지원 - 이더리움 네트워크의 확장성을 늘려줌 

### Terms

**Proof-of-stake**는 충분한 **stake**\(지분 혹은 주권\)을 가지고 있는 **validator**에 의해 동작하는 방식이다. 이더리움에서는 32개의 ETH를 stake\(걸다\)하면 validator가 될 수 있다. Validator는 랜덤으로 선택되어 블록을 만들고, 블록을 만들지 않을 때는 만들어진 블록을 확인하고 승인하는 역할을 한다. 사용자가 걸어놓은\(stake한\) ETH은 validator가 옳은 행동을 하게한다. 만약 validator가 offline이 되거나 악의적인 결정을 하면 그들이 stake한 ETH를 일부 또는 전부 잃는다. 

### How it works?

Proof-of-work와 다르게 PoS에서 Validator는 많은 컴퓨팅 자원을 요구하지 않는다. PoW에서는 블록 생성의 기회를 얻기 위해 많은 양의 연산을 필요로하는 퍼즐을 풀어야했지만, PoS에서는 랜덤으로 선출되기 때문이다. 블록 만드는 일에 선출되지 못했을 때는 validation을 진행한다. Validation은 attesting이라고도 부르는데, 블록을 보고 "내가 보기엔 이 블록은 괜찮을 것 같아" 라고 말해주는 것으로 생각할 수 있다. Validator는 블록을 생성하거나 attesting하는 것으로 보상을 받을 수 있다.

만약 malicious block을 attest한다면 stake를 잃는다.

### The Beacon Chain

PoS는 shard chains을 지원한다. Shard chains은 서로 분리되 체인이고 각각 새로운 블록을 추가하고 트랜잭션을 수행해줄 validators를 필요로한다. 네트워크의 상태를 공유하는 총 64개의 shard chains를 만들 계획이다. 결론적으로, shard chains이 잘 동작하기 위해 추가적인 조정이 필요한데 이들 수행하는 것이 the beacon chain이다.

Beacon chain은 shard로 부터 state information을 전달받고 다른 shard가 이를 활용할 수 있게 하여 네트워크의 동기화를 유지한다. Beacon chain은 또한 validator를 등록하고 인센티브와 페널티를 주는 등 validator 관리하는 역할을 한다.

{% hint style="info" %}
Shard 혹은 Sharding은 데이터베이스에서 자주 사용하는 용어인데, 기본적으로 partitioning과 같은 의미로 쓰인다. 하나의 큰 데이터베이스를 사용하면 나타나는 문제점들을 해결하기 위해 sharding을 수행한다. 보통 sharding을 하게 되면 데이터가 분산되어 scalability가 증가하지만, 프로그래밍 난이도 또한 증가한다.
{% endhint %}

### How validation works?

트랜잭션이 특정 shard에 발생하면, validator는 해당 트랜잭션을 shard block에 추가해야 한다. Validator는 beacon chain의 알고리즘에 의해서 선정되면 블록을 추가한다.

### Attestation

Validator가 새로운 블록을 추가하도록 선택받지 못했다면, 다른 Validator가 추가하려는 블록을 attest하는 역할을 맡는다. 새로 생성될 블록을 attest하는 것을 **attestation\(증명\)**이라고 한다.

여기서부터 용어들이 등장하는데, 아마 컴퓨터 쪽을 공부했다면 어떤 의미인지 쉽게 알 수 있는 단어들이다.

각 shard block은 최소 128명의 validator에 의해 attest된다. 이들을 **"committee"**라고 부른다. Committee는 일정 시간 동안 활동하는데 이 기간\(단위\)을 **"slot"**이라고 부른다. 슬롯 당 하나의 유효한 블록만이 생성되며 **"epoch"**당 32개의 슬롯이 있다. Epoch마다 committee는 해산되고 다시 새로운 임의의 참여자로 구성된 commitee가 생성된다.

### Crosslink

새로운 shard block 제안이 많은 attestations을 받으면, 랜잭션과 블록을 beacon chain에 넣는 것을 승인하는 **"crosslink"**가 생성된다.  

Crosslink가 생성되면 블록을 제안한 validator는 보상을 받는다.

### Finality

**Finality**는 더 이상 변경될 수 없는 특성을 말한다. 트랜잭션이 finality를 갖는다는 것은 변경할 수 없는 블록에 적혔다는 것을 의미한다.

PoS에서는 특정 checkpoint에 블록의 상태에 대해 validator들의 동의를 구한다. 만약 validator의 2/3이상이 블록의 상태에 동의한다면, 해당 블록은 finalised된다.

## Pros and Cons

### Pros

* Node를 수행하는데 있어서, 하드웨어나 에너지에 큰 비용을 쏟을 필요가 없다. 만약 충분한 ETH가 없다면 staking pool에 참여할 수 있다.
* Staking이 더 탈중앙적이다. 노드가 많다고 보상이 많은 것이 아니기 때문에 더 많은 참여를 유도한다.
* Staking은 secure sharding을 가능케한다. Shard chains은 여러개의 블록을 동시에 만들 수 있게 해주며 이는 트랜잭션의 전체 Throughput을 증가시킨다. 

### Cons

* Proof-of-stake는 아직 초기 단계이고, 테스트가 덜 진행되었다.

###  



참고:  
[https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/](https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/)



Last update: 04/21/2021

