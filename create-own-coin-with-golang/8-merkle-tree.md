---
description: Storage size optimization
---

# \#8 Merkle Tree

비트코인의 모든 블록의 트랜잭션 데이터를 저장하려면 큰 space가 필요하다. 검증인들은 이 데이터를 모두 저장할 필요가 있지만, 비트코인을 사용하는 모든 사람이 모든 트랜잭션 데이터\(수백 GB\)를 저장해야 한다면 아무도 비트코인 거래를 이용하지 않을 것이다.

비트코인은 이러한 비효율성을 줄이기위해 Merkle Tree를 도입하여 사용한다. 

##  blockchain/merkle.go

Merkle Tree는 해

