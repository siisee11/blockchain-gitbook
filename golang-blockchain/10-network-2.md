---
description: Network에서 구현하지 않았던 함수들을 마저 구현합니다.
---

# \#10 Network 2

이번 파트에서는 이전 파트에서 구현한 네트워크 뼈대에 살을 붙혀보겠습니다.

이번 파트에서 완성할 네트워크 코드는 탈중앙화된 P2P 방식의 네트워크가 아닙니다. 중앙 노드\(central node\)가 있고 네트워크에 참여하고자하는 노드는 이 노드의 주소를 알고 있다는 가정으로 구현합니다.

 파트를 더 진행해 나가면서 보완해 나갈 것입니다.

## 시나리오

네트워크의 시나리오를 먼저 생각해보고 진행해보도록 하겠습니다.

네트워크를 구성해야하는데 컴퓨터\(IP\)는 한 개 이므로 각 노드를 포트번호로 구별해서 네트워킹을 구현하도록 하겠습니다.  터미널 마다 환경 변수로 NODE언더바ID를 다르게 세팅하고 \(3000, 3001, 3002\) 노드는 `localhost:NODE언더바ID` 를 주소로하여 네트워킹을 진행할 것입니다.

한 컴퓨터에서 노드 3개를 돌릴 것이기  때문에 wallet.data 파일과 block DB 이름이 겹치게 됩니다. 노드아이디를 postfix로 붙혀서 구별하도록 하겠습니다. \(ex. tmp/block\_3000\)

앞서 말했듯이 이 구현의 네트워크에는 **중앙 노드**가 존재합니다. 중앙 노드는 **localhost:3000**으로 하드코딩 되어 있습니다. 네트워크를 참여하고자 하는 노드는 이 중앙 노드를 통해 블록체인을 받아오거나 네트워크에 속한 참여자들을 받아올 수 있습니다.

##  































## Test

드디어 완성된 네트워크를 실험해봅시다. 먼저 터미널을 3개 열어서 아래와 같이 환경변수를 설정한 후 지갑을 만들고 3000번 노드에서는 createblockchain까지 실행해줍니다. 

![NODE\_ID&#xB97C; &#xC124;&#xC815;&#xD558;&#xACE0; &#xC9C0;&#xAC11; &#xBC0F; &#xBE14;&#xB85D;&#xCCB4;&#xC778; &#xC0DD;&#xC131;](../.gitbook/assets/image%20%2881%29.png)

현재 구현상 GenesisBlock은 cp를 통해 직접 복사해야합니다. \(StartNode가 ContinueBlockChain으로 실행하기 때문\) cp 커맨드를 이용해서 아래와 같이 복사해줍니다.

```text
cd tmp && ls
cp -r blocks_3000 blocks_3001
cp -r blocks_3000 blocks_3002
cp -r blocks_3000 blocks_3003
cp -r blocks_3000 blocks_gen
cd ..
```

![&#xBE14;&#xB85D; &#xCD08;&#xAE30; &#xC124;&#xC815;](../.gitbook/assets/image%20%2878%29.png)

이제 3 노드 모두 Genesis Block만 존재하는 Blockchain을 가지게 되었습니다. 3000번 노드에서 send 함수를 -mint 옵션을 추가해서 실행시켜서 블록을 추가해줍니다. 3000번 노드만 2개의 블록을 가지게 되었습니다. 

![send with &quot;-mint&quot; option](../.gitbook/assets/image%20%2874%29.png)

이제 3000번 노드를 실행시키고 3001번에서도 노드를 실행시킵니다.

```text
go run main.go startnode
```

{% hint style="info" %}
3000번 노드가 중앙 노드이므로 3000번 부터 실행해야합니다.
{% endhint %}

3001번이 실행되면 3000번 노드에게 Version 정보를 보내고, 3001 번의 Height가 더 낮기 때문에 3000번에서 블록을 가지고와 로컬 DB에 저장합니다.

![&#xB2EC;&#xB77C;&#xC9C4; 3000&#xBC88;&#xC758; block&#xC744; 3001&#xBC88; &#xB178;&#xB4DC;&#xAC00; &#xAC00;&#xC838;&#xC628;&#xB2E4;.](../.gitbook/assets/image%20%2882%29.png)

이제 3002번 노드를 -minter 옵션을 주어서 실행시킵니다. minter는 3002번 노드의 지갑 주소 입니다. 이제 3002번은 트랜잭션을 모으고 새로운 블록을 채굴하여 블록체인에 연결하는 채굴 노드 역할을 합니다.

![3002&#xBC88;&#xC744; -minter &#xC635;&#xC158;&#xC744; &#xC8FC;&#xC5B4; &#xC11C;&#xBC84; &#xC2E4;&#xD589;](../.gitbook/assets/image%20%2879%29.png)

3001번에서 `ctrl-c` 로 빠져나온 후 "-mint" 옵션을 주지 않고 send 커맨드를 실행시켜 보겠습니다. -mint 옵션이 없으면 send 트랜잭션을 네트워크 참여자들에게 보내기만 합니다.

![&quot;-mint&quot; &#xC635;&#xC158;&#xC5C6;&#xC774; send&#xB97C; &#xC2E4;&#xD589;&#xD558;&#xBA74; &#xD2B8;&#xB79C;&#xC7AD;&#xC158;&#xC744; &#xBCF4;&#xB0B4;&#xAE30;&#xB9CC; &#xD55C;&#xB2E4;.](../.gitbook/assets/image%20%2875%29.png)

3001번에서 "-mint" 옵션없이 하나의 send를 더 보내보세요. 3002번 노드가 2개의 트랜잭션을 memoryPool에 모았기 때문에 Mint함수를 실행하여 블록을 채굴합니다.

![3002&#xBC88;&#xC774; 2&#xAC1C;&#xC758; &#xD2B8;&#xB79C;&#xC7AD;&#xC158;&#xC744; &#xBAA8;&#xC544;&#xC11C; &#xCC44;&#xAD74;](../.gitbook/assets/image%20%2876%29.png)

이로서 적당히\(?\) 동작하는 블록체인을 구현하고 실행해보았습니다.

##  세션을 마치며...

이 코드까지가 [Tensor Programming](https://www.youtube.com/channel/UCYqCZOwHbnPwyjawKfE21wg) 의 강의가 다루는 내용이었습니다. 저는 블록체인의 기본 개념들을 코드로 직접 구현하는 것이 블록체인을 이해하는데 많은 도움이 되었습니다. 하지만 여기까지의 구현은 아직 여러 문제들이 존재합니다. 아마 여기까지 코드를 잘 따라 왔다면 이런 의문이 들었을 것입니다.

### 중앙 노드의 존재

위에서 설명했듯이 지금 구현은 중앙 노드가 존재합니다. 노드들은 이 중앙 노드를 통해야만 새로이 네트워크에 참여할 수 있습니다. 또 트랜잭션도 중앙 노드를 통해 전파됩니다. 이는 실제 블록체인들과 다른 점 입니다.

다음 세션에서 P2P 방식의 네트워크를 사용하여 이를 해결할 것 입니다.

### 블록체인 다운로드

새로 블록체인 네트워크에 접속하면 중앙 노드로 부터 전체 블록을 모두 받아옵니다. 실제 블록체인에서는 Full 노드만 전체 블록체인을 저장합니다.

### 난이도 조절

\#2 에서 언급했듯 지금 구현에서 difficulty 조절이 불가능합니다.

### 



위의 문제점\(의문점\)들을 다음 세션에서 수정할 것입니다. 다음 세션부터는 저자 스스로 구현할 것이니 시간이 오래 걸릴 수도 있습니다.





{% hint style="success" %}
여기 까지의 구현은  [https://github.com/siisee11/golang-blockchain](https://github.com/siisee11/golang-blockchain) 의 step10 브랜치에 있습니다 . 
{% endhint %}



Last updated: May 10, 2021

