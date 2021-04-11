---
description: 이더리움 개요
---

# Ethereum

이더리움은 블록체인 기술을 이용한 하나의 응용사례이다. 이더리움 공식 웹사이트를 참고하였다. 

{% embed url="https://ethereum.org/en/developers/docs/intro-to-ethereum/" %}

## What is ETHEREUM?

이더리움 네트워크에서는 이더리움 참여자가 인정하는 하나의 공식 컴퓨터가 있다. 공식 컴퓨터의 이름은 Ethereum Virtual Machine 줄여서 EVM이라고 부른다. 이더리움 네트워크 참여자\(이더리움 노드\)들은 EVM의 복사본을 가지고 있다. 이더리움 노드들은 EVM을 위한 작업 요청을 전파할 수 있다. 전파된 작업 요청은 다른 이더리움 노드들에 의해서 유효성이 확인되고 요청된 작업이 실행된다. 이런 작업들은 EVM의 상태 변화\(state change\)를 일으키고 이 상태 변화 또한 네트워크를 통해 전파된다.

이런 작업 요청을  Transaction request라고 부른다. 거래\(transcation\)와 EVM의 상태는 블록체인의 형태로 저장된다.

## What is ETHER?

Ether는 암호화폐로서 시장\(market\)을 형성한다. 시장은 거래의 유효성을 판별하거나 작업 요청을 실행할 계산 자원을 이더리움 네트워크에 제공하기 위해서 경제적인 인센티브를 제공한다.

거래 요청을 전파하는 참여자들은 네트워크에게 일종의 수수료로써 일정량 Ether를 제공해야한다. 이 Ether는 해당 거래를 검수하고 실행하고 블록체인에 적고 네트워크에 전파하는데 참여하는 노드에게 보상으로 주어진다.

지출해야하는 Ether의 양은 계산량에 비례한다. 이는 악의적인 사용자가 무한 루프 같은 계산 자원을 많이 소비하는 작업을 요청하여 네트워크를 장악하는 것을 막는다.  

## What are DAPPs?

이더리움 참여자들은 EVM에서 계산을 수행하기 위하여 코드를 사용하여 작업을 요청해야 한다. 매번 새로운 코드를 작성하여 작업을 요청하기 보다는 개발자들이 EVM storage에 업로드 해놓은 재사용 가능한 code snippets\(혹은 프로그램\)을 사용한다. 사용자는 다양한 파라메터를 사용해서 이 code snippets의 실행을 요청한다. 이더리움에서 네트워크에 업로드되고 실행되는 code snippet\(프로그램\)을 [smart contract](smart-contract.md)라고 부른다.

간단하게 code snippet을 자판기라고 생각할 수 있다. 자판기에 돈을 넣고 코카콜라를 클릭하면 코카콜라가 나오듯이, code snippet에 일정 비용을 지불하고 파라메터를 입력하여 작업을 요청하면 요청이 수행된다. 

모든 개발자가 smart contract를 만들 수 있으며, 이를 네트워크에 공개할 수 있다. 이는 블록체인을 데이터 레이어로 사용되어 저장되고 따라서 네트워크에 요금을 지불해야한다. 모든 유저는 이 smart contract를 이용해 코드를 실행할 수 있으며, 이 또한 네트워크의 계산 자원을 사용하므로 네트워크에 요금을 지불해야한다.

Smart contracts를 통해서 개발자들은 marketplaces, financial Instruments, games 등 복잡한 유저 어플리케이션을 개발하여 배포할 수 있다.

## Terminology

앞으로 자주 쓰일 단어들에 대하여 간략하게 정리하고 넘어가자.

### Blockchain

블록체인은 이더리움 네트워크에 추가되어 저장완료된 블록들의 연속\(sequence of blocks\)이다. 블록체인은 네트워크의 수많은 컴퓨터가 공유하고 업데이트하는 public database로 설명할 수 있다.

### ETH\(Ether\)

Ethereum에서 사용되는 암호화폐이다. 사용자들은 그들의 코드 수행 요청을 실행하기 위해 다른 네트워크 참여자에게 ETH를 지불해야한다.

### [EVM](ethereum-virtual-machine-evm.md)

EVM은 Ethereum Virtual Machine의 약자이다. EVM은 이더리움 네트워크의 참여자들이 상태\(state\)를 업데이트하고 동의하는 global virtual computer이다. 참여자는 EVM에서 어떤 코드가 동작하도록 요청할 수 있고, EVM에서 동작한 코드는 EVM의 상태를 업데이트한다.

### Nodes

EVM은 가상 컴퓨터이고 실제로 EVM state를 저장하는 머신을 Node\(노드\)라고 한다. 노드는 서로 EVM의 상태나 업데이트에 대한 정보를 전파한다. 이더리움 네트워크는 노드들과 그들간의 통신의 집합체로 볼 수 있다. 

### Accounts

ETH가 저장되는 곳이다. 사용자는 accounts\(계좌\)를 초기화한 후에 그곳에 ETH를 저장하거나 다른 유저의 계좌로 ETH를 전송할 수 있다. 계좌와 계좌 잔고는 EVM의 big table에 저장되는데 이는 EVM state 중 일부이다. 

### Transactions

"Transaction request"는 EVM에 코드 실행을 요청하는 것, "Transaction"은 완료된 transaction request와 그것에 관련된 EVM state 변화를 말한다. Transaction의 종류는 아래와 같다.

* X ether를 내 계좌에서 엘리스의 계좌로 보내는 것.
* Smart contract 코드를 EVM memory에 배포하는 것.
* EVM 주소 X에 있는 smart contract 코드를 argument Y를 입력하여 실행하는 것.

### Blocks

Transaction의 양이 매우 크기 때문에 이를 하나하나 확인하여 저장하는 것은 비효율적이다. 따라서 수백개의 transaction 묶여서 수행되는데 이를 block이라고 한다.

### [Smart contracts](smart-contract.md)

개발자가 EVM memory에 배포한 재사용가능한 snippet of code를 Smart contract라고 부른다. 개발자들이 Smart contract를 통해 자유롭게 EVM에서 실행가능한 어플리케이션을 작성할 수 있기 때문에 dapps 혹은 Decentralized App이라고 부른다.





Last update: 04/11/0201

