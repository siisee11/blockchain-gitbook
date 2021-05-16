---
description: Rendezvous를 이용해 P2P 네트워크 구축
---

# \#12 Peer Discovery

이번 스텝에서는 Rendezvous\(랑데부\)를 사용해서 P2P 네트워크에서 peer 노드를 찾아 네트워크에 접속할 수 있도록 할 것이다. 프로그램이 처음 네트워크에 접속하는 것을 bootstrapping이라고 부른다.

Bootstrap을 하기위해 네트워크에 참여하고 있는 peer node의 IP 주소를 알아와야한다. 이를 Peer Discovery 라고 부른다. Peer Discovery를 위한 방법은 여러가지가 있다. 비트코인은 아주 초기에[ IRC](https://namu.wiki/w/IRC)에 의존하여 Peer 정보를 공유하여 모든 노드가 공유된 Peer 노드에 접속했다. 지금의 비트코인 클라이언트는 DNS seed를 이용하여 peer discovory를 한다. 자세한 내용은 [네트워크](../bitcoin/bitcoin-network.md) 문서를 참고하길 바란다.

우리는 rendezvous 방법을 이용해 Peer Discovery를 구현할 것이다.



    

