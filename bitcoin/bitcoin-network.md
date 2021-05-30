---
description: P2P로 동작하는 네트워크
---

# Bitcoin Network

본문은 아래 링크의 내용을 의역한 것입니다. 

{% embed url="https://developer.bitcoin.org/devguide/p2p\_network.html" %}

비트코인 네트워크 프로토콜은 full nodes\(peers\)들이 서로 협력하여 peer-to-peer\(P2P\) 네트워크를 유지하여 블록과 트랜잭션의 교환\(통신\)을 가능하게한다.

## Introduction

Full node \(풀 노드\)는 모든 블록과 트랜잭션을 다른 노드로 전달하기 전에 다운로드하고 검증하는 노드이다. Archival node 는 풀 노드 중 모든 블록체인을 다 저장하고 있는 노드로 과거의 블록들을 다른 노드들에게 전달할 수 있다. Pruned node는 전체 블록체인을 다 저장하지는 않는 풀 노드이다. 많은 SPV 클라이언트 역시 블록체인 네트워크 프로토콜을 이용해서 풀 노드에 접속한다.

컨샌서스 알고리즘은 네트워킹에 의해 영향을 받지 않습니다. 따라서, 비트코인 프로그램들은 상황에 맞는 네트워크와 프로토콜을 사용할 수 있는데, 예를 들어서 miner들은 블록을 빨리 전달하는 네트워크를 사용할 수 있고 지갑이 사용하는 트랜잭션 정보를 담당하는 서버들은 SPV 레벨의 보안성을 제공한다. 

비트코인의 P2P 네트워키의 예시를 들기 위해서 풀노드를 Bitcoin Core, SPV 클라이언트를 BitcoinJ라고 사용하겠다.

## Peer Discovery

비트코인 프로그램을 처음 시작할 때, 프로그램은 활성화된 풀 노드의 IP 주소를 알지 못한다. 풀 노드의 IP 주소를 얻기 위해서 Bitcoin Core와 BitcoinJ에 하드코딩되어 있는 DNS들\(DNS seeds라 불림\)한테 쿼리를 날린다. 이에 대한 응답으로 커낵션을 맺어줄 가능성이 있는 풀 노드들의 IP주소와 함께 DNS A record를 받는다.

DNS seeds는 Bitcoin 커뮤니티에 의해 유지된다. DNS seed 중 몇몇은 네트워크를 스캔하여 활성화된 노드들의 IP 주소를 동적으로 업데이트하고, 나머지는 정적으로 IP주소를 제공하여 비활성화된 노드의 IP 주소를 반환할 수 있다.

DNS seed의 결과는 인증된 것이 아니고 악의적인 seed 제공자나 네트워크 중간에서 공격자가 제어하는 노드들의 IP 주소만 전달하는 공격자가 있을 수 있기 때문에 프로그램은 DNS seed에 전적으로 의지하면 안된다.

한번 프로그램이 네트워크에 접속했다면, 네트워크의 다른 peer들이 네트워크의 다른 peer들의 IP 주소와 port 번호를 제공해줄 것이다. 이로서 탈중앙화된 peer discovery가 진행된다. Bitcoin Core는 이 known peers를 영구 저장장치에 저장하여 다음 접속에 DNS seeds를 사용하지 않고 바로 네트워크에 접속할 수 있도록 한다.

##  Connecting To Peers

클라이언트가 Peer에 접속하는 것은 "version" 메세지를 보내는 것으로 완료된다. Version 메세지는 버전 넘버, 블록, 현재시간 정보를 담는다. Version 메세지를 받은 원격 노드는 자신의 Version 메세지를 회신한다. 그 후 노드들은 "verack" 메세지 \(Version Acknowledge\)를 보내 커낵션이 성공적으로 생성되었음을 알린다.

연결되면 클라이언트는 원격 노드에게 "getaddr", "addr" 메세지를 보내 다른 피어들의 정보를 알아온다.

피어와의 커낵션을 유지하기 위해서 비활성 상태가 30분을 넘기 전에 메세지를 보내고, 90분 동안 피어로 부터 메세지를 받지 못했다면 커낵션이 끊어졌다고 가정한다.

## Initial Block Download

 풀 노드가 트랜잭션이나 블록을 검증하기전에 블록 1\(Genesis 다음 블록\)부터 best blockchain의 가장 마지막 블록까지 모두 다운로드 받아야한다. 이 작업을 Initial Block Download\(IBD\) 혹은 initial sync라고 한다.

Inital이라는 말이 "처음 딱 한번"이라는 의미를 가지긴 하지만 IBD는 블록을 받아오는 일을 총칭한다. 오프라인이 되었다가 다시 연결되거나, Bitcoin Core의 경우 최신 블록의 헤더 시간이 24시간 이전이라면 IBD 방법을 사용하여 블록을 받아온다.

## Blocks-First

Bitcoin Core 0.9.3 버전\(27 September 2014 released\)까지 blocks-first라고 불리는 심플한 IBD 메소드를 사용하였다. 이 방법의 목적은 best blockchain으로 부터 모든 블록을 순서대로 다운로드 받는 것이다.

![](../.gitbook/assets/image%20%28122%29.png)

위 그림은 Blocks-First IBD의 개략적인 동작을 보여줍니다. 처음에는 아무것도 없으므로 No-No 루트를 따라 인벤토리를 받아오고 이를 통해서 블록을 요청하여 받아옵니다. 

노드가 처음 시작할 때, local best block chain은 하나의 블록\(Hardcode되어 있는 Genesis 블록\)만 가지고 있습니다. 이 노드는 sync node라고 부르는 peer에 접속하여 아래 그림과 같은 "getblocks" 메세지를 보냅니다.

![IBD&#xC758; &#xCCAB; GetBlocks &#xBA54;&#xC138;&#xC9C0;](../.gitbook/assets/image%20%28120%29.png)

getblocks 메세지의 header hashes 필드에는 IBD 노드가 가지고 있는 유일한 블록인 Genesis 블록의 헤더 해시\(6fe2…0000\)가 적힙니다.

getblocks 메세지를 받으면 sync노드는 첫번째\(이자 유일한\) 헤더 해시를 local best block chain에서 찾습니다. Sync노드는 Block 0을 찾게되고 block 1부터 500개의 인벤토리들을 "inv" 메세지에 실어서 보냅니다.

![IBD&#xC758; &#xCCAB; Inv &#xBA54;&#xC138;&#xC9C0;](../.gitbook/assets/image%20%28123%29.png)

인벤토리는 네트워크의 어떤 정보에 대한 유일한 식별자 입니다. 예를 들어 블록이라는 정보에 대해서는 블록 헤더 해시가 식별자로 사용됩니다.

inv 메세지에 적힌 블록 인벤토리들은 block chain에 적힌 순서대로 입니다. 즉, 첫번째 inv 메세지는 1번 블록부터 501번 블록의 인벤토리를 담고 있습니다. \(예를 들어, 위 그림의 4860…0000는 1번 블록의 헤더 해시 입니다.\)

IBD 노드는 받은 인벤토리를 참고해서 sync node에게 128개의 블록에 대해 요청하는 "getdata" 메세지를 보냅니다.

![IBD&#xC758; &#xCCAB; Getdata &#xBA54;&#xC138;&#xC9C0;](../.gitbook/assets/image%20%28119%29.png)

Blocks-First 방식에서 블록들이 순서대로 요청되고 보내지는게 중요합니다. 왜냐하면 각 블록의 헤더는 이전 블록의 헤더 해시를 참조하기 때문입니다. 이 것은 IBD 노드가 부모 블록를 받지 못한 블록을 검증할 수 없다는 것을 의미합니다. 부모 블록을 못받았기 때문에 검증할 수 없는 블록을 Orphan 블록이라고 부르면 본문 끝에서 다룹니다.

getdata 메세지를 받으면 sync node는 요청된 블록에 대해 하나하나 블록을 회신합니다. 각 블록은 serialized 되어 "block" 메세지에 담겨서 보내집니다. 블록 1에 대한 block메세지의 예시는 아래와 같습니다.

![IBD&#xC758; &#xCCAB; Block &#xBA54;&#xC138;&#xC9C0;](../.gitbook/assets/image%20%28114%29.png)

IBD 노드는 블록을 하나하나 다운로드 받고 검증합니다. 그리고 아직 요청되지 않은 블록을 128개 씩 요청합니다. 이전에 받아온 인벤토리의 블록들을 모두 다운로드 받았으면 두번째 getblocks 메세지를 보내서 새로운 인벤토리를 요청합니다. 아래는 두번째 getblocks 메세지 입니다. 여러개의 헤더 해시를 포함합니다.

![IBD&#xC758; &#xB450;&#xBC88;&#xC9F8; getblocks &#xBA54;&#xC138;&#xC9C0;](../.gitbook/assets/image%20%28111%29.png)

Sync 노드는 두번째 getblocks 메세지를 받고 헤더 해시를 순서대로 local best block chain에서 찾습니다. \(여러개의 헤더 해시가 있는 것은 fork 때문인것 같음\) 일치하는 블록을 찾으면 그 다음 블록부터 500개의 블록의 헤더 해시를 inv 메세지에 담아 회신합니다. 만약 이중에 일치하는 블록이 없다면 공통적으로 가지고 있는 블록은 Genesis 블록 뿐이라고 판단하여 다시 1번 블록부터 500개의 인벤토리를 보냅니다.

이렇게 여러 헤더 해시를 반복적으로 찾는 것은 fork detection을 가능하게 합니다.

Inv, getdata, block, getblocks 메세지들을 통해서 IBD 노드는 block chain을 모두 다운로드 합니다. 이 때부터 노드는 block을 받고 본문 마지막 부분에 설명할 regular block broadcasting으로 블록을 보낼 수 있습니다.

### Advantage & Disadvantages

가장 중요한 장점은 Blocks-first IBD 방법이 매우 간단하다는 것이고 단점은 IBD 노드가 블록을 다운로드 받는데 하나의 sync node를 사용한다는 것 입니다. 이에 의한 단점은 아래와 같습니다.

* **Speed limit:** Sync 노드 하나에게서 다운로드가 진행되므로 sync node의 upload bandwidth에 의해 다운로드 속도가 영향을 받습니다.  
* **Download Restart:** Sync 노드가 non-best block chain을 보내줄 수 있습니다. IBD 노드는 그것이 non-best 인지를 다운로드가 거의 끝나가기 전까지 알 수 없습니다. 이는 IBD 노드가 다른 노드에서 다시 다운로드 받게합니다. Bitcoin Core는 이를 해결하기 위해 checkpoint같은 방법으로 최대한 빠르게 Download restart가 일어나게 합니다. 
* **Disk Fill attacks:** 다운로드 재시작과 관련되어 있는데, 만약 sync node가 non-best block chain을 보내면 그것은 쓸모없는 데이터이지만 디스크의 공간을 차지 하게됩니다. 
* **High Memory Use:** 악의적으로든 오류에 인해서든, sync 노드가 순서대로 블록을 보내지 않으면 Orphan 블록이 생기게된다. Orphan 블록은 validation이 되기 전까지 메모리에 저장되는데, 이것은 메모리 사용량을 증가시킨다.

위의 모든 단점들은 Bitcoin Core 0.10.0\(16 February 2015 released\) 부터 Headers-first IBD 방벙을 사용함으로서 완전히 혹은 부분적으로 해결되었습니다. 

## Headers-First

Bitcoin Core 0.10.0 은 headers-first라고 불리는 IBD 메소드를 사용합니다. 이 것의 목적은 best header chain에서 header들을 다운로드 받고, 이를 이용해 최대한 검증하며, 헤더에 해당하는 블록을 병렬적으로 다운로드 받는 것 입니다. 이것은 Blocks-first의 여러 단점을 극복합니다.

![](../.gitbook/assets/image%20%28110%29.png)

노드가 처음 시작되면 역시 Block 0 \(하드 코드된 Genesis block\)만 가지고 있습니다. 원격 노드를 하나 골라 아래 그림과 같은 "getheaders" 메세지를 보냅니다. 

![&#xCCAB; getheaders &#xBA54;&#xC138;&#xC9C0;](../.gitbook/assets/image%20%28112%29.png)

getheaders 메세지를 받은 원격 노드는 Header Hashes에 적혀있는 헤더 해시를 local best block chain에서 찾습니다. 그 다음 블록부터 2000개의 블록의 헤더 해시를 "headers" 메세지에 담아서 돌려 보냅니다.

![&#xCCAB; headers &#xBA54;&#xC138;&#xC9C0;](../.gitbook/assets/image%20%28117%29.png)

Full validation은 블록의 정보가 필요하지만, partial validation은 가능합니다. 블록의 헤더들을 검사하여 헤더의 field가 컨샌서스를 따르고 있는지 판단합니다. 이렇게 partially validate된 블록 헤더를 가진 후에 IBD 노드는 아래 2개의 일을 병렬적으로 진행합니다.

1. **더 많은 헤더 다운로드:** IBD 노드는 다른 "getheaders" 메세지를 sync 노드에게 보내서 다음 2000개의 헤더들을 요청합니다. 받아온 헤더들은 다시 즉각적으로 검증되고 반복적으로 또 다음 헤더를 요청합니다. 이 반복은 headers 메세지에 담긴 헤더의 개수가 2000보다 작을 때 끝나게 됩니다. 이 글을 적는 시점 \(May 16 2021\)에 약 350번의 Round trip이 소요되고 총 용량은 약 55MB 정도됩니다.  IBD 노드가 2000개 보다 적은 headers 메세지를 받게되면, IBD 노드는 다른 피어들에게 getheaders 메세지를 보내고 응답을 비교합니다. 이를 통해서 헤더가 best header chain에서 다운로드된 것인지 판별할 수 있고, dishonest sync 노드를 쉽게 찾아낼 수 있습니다. 
2.  **블록 다운로드:** IBD 노드가 블록헤더를 다운로드 받는 동안, IBD 노드는 블록 또한 요청합니다. IBD 노드는 블록 헤더를 이용해서 getdata 메세지를 만들어 요청합니다. 블록 요청은 sync 노드에게 할 필요가 없고 어떠한 full 노드에게 요청해도 상관없습니다. 이 것은 블록 다운로드를 여러 노드에게서 병렬적으로 수행할 수 있음을 의미합니다. 이로 인해 sync node의 upload 속도에 제한을 받지 않습니다.



![](../.gitbook/assets/image%20%28113%29.png)

Bitcoin Core의 Headers-first 방법은 1024개의 block moving download window 를 사용해서 download speed를 최대화 합니다. \(moving window는 네트워크에서 packet 전송할 때 사용하는 window와 유사합니다.\) 윈도우의 가장 왼쪽 \(height가 제일 작은\) 블록이 다음 검증될 블록입니다. Bitcoin Core가 해당 블록을 검증할 준비가 완료되고 나서, 최대 2초안에 블록이 도착하지 않는다면 노드와 연결이 끊어진 것이라 간주하고 다른 노드에게 블록을 다시 요청합니다. 위의 그림을 예로들면, 3번 블록이 다음 검증될 블록이고 아직 받지 못한 블록입니다.

IBD 노드가 최신 블록체인과 싱크가 되면, block을 받고 다음에 설명할 regular block broadcasting으로 블록을 보내는 일을 합니다.

## Block Broadcasting

채굴자가 블록을 발견하면, 새로운 블록을 아래의 방법 중 하나를 이용하여 피어들에게 전송합니다.

* Unsolicited Block Push: 채굴자가 그의 풀 노드 피어에게 "block"메세지를 보냅니다.  
* Standard Block Relay: 마이너가 기본적인 relay node\(전달 노드\)역할을 합니다. 새로운 블록를 가르키는 inventory를 담은 "inv" 메세지를 모든 피어들에게 보냅니다. "inv" 메세지를 받는 피어의 종류에 따라 다른 응답을 보입니다. 
  * Block-First\(BF\) 피어들은 "getdata"로 full block 데이터를 요청합니다. 
  * Header-First\(HF\) 피어들은 "getheaders" 메세지로 full header에 대한 정보를 요청합니다. 이는 best header chain의 가장 height가 높은 헤더의 해시를 포함하고, fork detection을 위해서 이전의 몇개의 블록 헤더 또한 포함합니다. 이 후에 "getdata"로 full block을 요청합니다. 
  * Simplified Payment Verification \(SPV\) 클라이언트는 "getdata" 메세지로 머클 블록을 요청합니다.     
* Direct Headers Announcement: 새로운 블록의 full header를 담고있는 "headers" 메세지를 곧 바로 보내는 방법입니다. 이는 Standard Block Relay 방식에서 HF노드들이 쓸대없이 "inv"메세지를 받고 "getheaders"메세지를 다시 요청하는 round trip overhead를 줄여줍니다. HF 노드는 메세지를 받고 header를 검증한 후 "getdata"로 full block을 요청할 것입니다. 커낵션 핸드쉐이크 단계\(네트워크 접속 단계\)에서 HF 노드들은 "sendheaders"라는 특수 메세지를 보내서 "inv" 메세지보다 "headers" 메세지를 선호함을 미리 알려줍니다. 

기본적으로, Bitcoin Core는 "sendheaders" 메세지를 보낸 노드들에게는 direct header announcment 방식으로, 그렇지 않은 노드들에게는 standard block relay 방식으로 블록을 전파합니다. 아래는 메세지 종류에 대한 표입니다.

![](../.gitbook/assets/image%20%28125%29.png)

## Orphan Blocks

단어에서 강력하게 뜻이 전해지듯이, orphan block은 부모 블록이 알려지지않은 블록을 말합니다. Previous block header hash 필드가 가르키는 블록이 아직 다운로드 되지 않은 경우입니다. Orphan블록은 부모 블록이 있지만 best block chain에 속하지 못하는 블록인 stale block과는 다른 개념입니다.

![Difference Between Orphan And Stale Blocks](../.gitbook/assets/image%20%28126%29.png)

###  Block First Node

BF 노드가 orphan block을 다운로드 받았을 때, BF 노드는 그것을 validate 시킬 수 없습니다. 대신에 노드는 "getblocks" 메세지를 orphan block을 보낸 노드\(전송 노드\)에게 보냅니다. 전송 노드는 miss된 블록들의 인벤토리를 담아서 "inv" 메세지를 반환하고 "getdata", "block" 메세지가 추가적으로 발생하여 miss된 블록을 다운로드 받아 orphan block을 유효화 합니다.

### Header First Node

HF 노드는 실제 블록을 가져오기 전에 헤더를 먼저 다운로드 받아서 검증하므로 이런 복잡한 프로세스를 스킵할 수 있습니다.

## Transaction Broadcasting

피어에게 트랜잭션을 보내기 위해서 먼저 "inv" 메세지를 보냅니다. "getdata" 메세지로 응답이 온다면 "tx" 메세지를 통해 트랜잭션을 보냅니다. 트랜잭션을 받은 노드는 트랜잭션이 유효하다면 같은 방법으로 트랜잭션을 전달합니다.

## Memory Pool

Full peer\(풀 피어\)는 다음 블록에 포함될 수 있는 아직 승인되지 않은\(unconfirmed\) 트랜잭션을 추적할 수 있습니다. 이 것은 트랜잭션을 실제로 블록에 적는 채굴자에게도 필수적이지만, unconfirmed 트랜잭션을 관리하고자하는 노드 \(SPV 클라이언트에게 unconfirmed 트랜잭션 정보를 전달해주는 노드 같은\)에게도 유용합니다.

Uncomfirmed 트랜잭션은 Bitcoin에서 영구적인 지위를 갖지 않습니다. 따라서 Bitcoin Core에서도 이들은 Memory pool 혹은 mempool이라고 불리는 비영구 저장장치에 저장합니다. 노드가 종료되면 wallet에 저장되어 있는 트랜잭션을 제외하고 memory pool의 모든 트랜잭션은 없어집니다\(비영구적이라는 말은 전원이 차단되면 데이터가 유실된다는 뜻입니다\). 이는 unconfirmed transaction은 네트워크의 피어들이 재시작되고, memory 공간을 만들기위해 몇몇 트랜잭션을 삭제하는 작업을 하면서 서서히 없어지는 것을 의미합니다.

채굴되어 블록에 기록되었던 트랜잭션이라도 이 블록이 stale block으로 바뀌면 다시 메모리 풀로 돌아옵니다. 대체 블록이 생성되면 다시 메모리 풀에서 삭제되어 블록에 기록됩니다. 

SPV 클라이언트는 메모리 풀이 존재하지않습니다. 그들은 블록에 포함되지 않은 트랜잭션을 스스로 검증할 수 없으며 그저 UTXO를 소모하는 역할을 합니다.

## Misbehaving Nodes

잘못된 정보를 네트워크에 흘려서 up bandwith나 컴퓨팅 리소스를 소모하게하는 노드들은 banscore를 받습니다. banscore가 일정 이상 되면 bantime 만큼의 시간을 네트워크에서 쫒겨납니다. 이 bantime은 보통 24시간으로 설정되어 있습니다. 



Last updated: May 30, 2021

