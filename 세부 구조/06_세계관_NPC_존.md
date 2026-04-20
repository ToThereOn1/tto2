# 06. 세계관, NPC, 존 시스템

## 개요

ToThereOn은 반려동물이 보호자와 재회할 때까지 머무는 중계 세계입니다.
4+1개의 존, 10명의 가디언, 10명의 이벤트 NPC, 반사 연못 등으로 구성됩니다.

**파일**: `lib/worldview-constants.ts`

---

## 우주 구조 (Universe Layers)

```
┌─────────────────────────────────────┐
│          Human Heaven               │  ← 최종 목적지
│    (Final Destination)              │
├─────────────────────────────────────┤
│          ToThereOn                  │  ← 펫 세계 (중계 정거장)
│    (Pet World - Transit Station)    │
├─────────────────────────────────────┤
│          Earth                      │  ← 물리적 세계
│    (Physical World)                 │
└─────────────────────────────────────┘
```

### 핵심 규칙

| 규칙 | 설명 |
|------|------|
| TRANSIT_MANDATORY | 보호자가 있는 펫은 반드시 ToThereOn을 거침 |
| REUNION_GUARANTEED | 100% 재회 보장. 시간 문제일 뿐, 확률 아님 |
| DEPARTURE_TOGETHER | 재회 후 3-7일 체류, 함께 Human Heaven으로 출발 |

### 시간 법칙

```
TIME_RATIO = 3
지구 3일 = ToThereOn 1일
지구 50년 ≈ ToThereOn ~16.7년 (길지만 견딜 수 있는 대기)
```

---

## 존 시스템 (5개)

### 존 진행 규칙

```
Day 0-2:   Crystal Meadow    (첫 적응)
Day 3-9:   Eternity Forest   (탐험 시작)
Day 10-29: Crystal Lake      (안정)
Day 30-99: Sunset Hill       (일상)
Day 100+:  순환 (meadow → forest → lake → hill 반복)
```

---

### 1. Central Plaza (중앙 광장) 🏛️

**설명**: 도착 지점, 만남의 장소, 가디언 타워.

| 위치 | 설명 |
|------|------|
| Welcome Plaza | 따뜻한 황금빛이 비추는 넓은 공간. 새로운 도착자들이 여기에 나타남. 차임벨 소리로 환영. 돌바닥에 이전 펫들의 희미한 발자국. |
| Guardian Tower | 광장 중앙의 높은 상아색 탑. 새벽과 황혼에 종이 울려 시간의 흐름을 알림. |
| Bonfire Circle | 연기 없이 타는 영구적 불꽃. 따뜻한 돌로 둘러싸여 있음. 저녁에 펫들이 모여 춤추는 그림자를 봄. |

---

### 2. Crystal Meadow (수정 초원) 🌸

**설명**: 빛을 받아 반짝이는 수정 꽃들이 점점이 있는 끝없는 풀밭. 반투명 날개의 나비들이 느긋하게 날아다님. 따뜻한 꿀과 비 냄새.

**활동**: 달리기, 공 물어오기, 사교, 나비 쫓기

| 위치 | 설명 |
|------|------|
| Crystal Meadow Center | 초원의 심장. 풀이 가장 높고 수정 꽃이 군락을 이룸. 빛이 꽃잎을 통과해 작은 무지개 생성. |
| Butterfly Garden | 반투명 나비들이 소용돌이치는 보호된 움푹한 곳. 프리즘처럼 빛을 산란. |
| Meadow's Edge | 수정 꽃이 얇아지고 긴 풀이 흔들리는 가장자리. 전체 초원이 보이는 조용한 곳. |
| Reflection Pool (Meadow) | 초원 남쪽 가장자리의 완벽히 고요한 연못. 하늘이 아닌 아래 세계를 비춤 — 보호자의 일상 모습. |

---

### 3. Eternity Forest (영원의 숲) 🌲

**설명**: 은빛 껍질의 거대한 고대 나무들. 캐노피가 황금빛을 필터링해 바닥에 변하는 패턴 생성. 이끼가 밤에 파랗게 빛남. 시원하고 삼나무 향.

**활동**: 탐험, 등반, 휴식, 경청

| 위치 | 설명 |
|------|------|
| Northern Grove | 숲의 가장 오래된 부분. 그림자가 짙고 뿌리가 자연 은신처 형성. 호박색 빛줄기. |
| Whispering Hollow | 구부러진 나무들이 만든 자연 원형극장. 소리가 이상하게 전달됨 — 때때로 익숙한 목소리의 메아리. |
| Silver Canopy | 숲의 가장 높은 가지들. 나선형 나무 경로로 접근. 여기서 ToThereOn 전체가 보임. |
| Forest Reflection Pool | 양치식물 덮인 바위 사이에 숨겨진 연못. 수면에 아래 세계 이미지가 일렁임. 주변이 유난히 조용. |

---

### 4. Crystal Lake (수정 호수) 💎

**설명**: 바닥의 매끄러운 돌이 보일 만큼 투명한 물. 완만한 해변이 한쪽을 따라 곡선. 물은 항상 따뜻하고 잔잔한 파도.

**활동**: 수영, 해변 휴식, 물놀이, 돌 관찰

| 위치 | 설명 |
|------|------|
| Lake Shore | 매끈한 자갈과 고운 모래. 석양이 수면을 구리색과 장미색으로. |
| Quiet Cove | 물이 완벽히 고요한 보호된 입구. 늘어진 버드나무가 개인 캐노피 형성. 모래가 유난히 따뜻함. |
| Deep Waters | 호수 중앙. 투명에서 깊은 사파이어로. 햇빛이 바닥까지 투과해 하얀 돌 비춤. |
| Lake's Edge Pool | 호수가 좁아지는 곳. 수면이 지상 세계의 창이 됨. 펫들이 앉아 관찰. |

---

### 5. Sunset Hill (석양 언덕) 🌅

**설명**: ToThereOn 전체가 보이는 탁 트인 전망의 구릉지. 바람은 일정하고 따뜻함. 긴 풀이 바다 파도처럼 물결침. 석양이 몇 시간이나 지속.

**활동**: 바람 목욕, 명상, 석양 감상, 언덕 달리기

| 위치 | 설명 |
|------|------|
| Hilltop Summit | ToThereOn에서 가장 높은 지점. 전체 계곡이 보임. 바람이 모든 존의 냄새를 실어옴. |
| Wind Ridge | 바람이 가장 강한 좁은 능선. 털과 풀이 같은 방향으로 눕힘. 세계의 끝에 선 느낌. |
| Sunset Terrace | 서쪽을 향한 자연 석조 플랫폼. 매일 저녁 액체 금빛이 쏟아짐. 펫들이 빛이 사라지는 것을 봄. |
| Tall Grass Field | 허리 높이 풀이 작은 길과 비밀 쉼터를 숨김. 풀 사이에 작은 꽃. |

---

## Reflection Pool (반사 연못) 규칙

```
규칙: 일방향 시각 관찰.
     펫은 보호자를 볼 수 있지만, 상호작용이나 인식은 불가능.

표현 방식:
  ✓ 관찰을 사실로 진술 ("Guardian was reading")
  ✗ 추측 금지 ("wondered if", "maybe", "perhaps")

위치: 각 존에 1개씩 (Central Plaza 제외)
  - reflection_pool_meadow
  - reflection_pool_forest
  - reflection_pool_lake
  - lake_shore (Edge Pool)

보호자에게 전달되는 느낌: "Warmth" (따뜻함)으로 근사
```

---

## Guardians (가디언 10명)

ToThereOn 세계를 관리하는 상위 존재들.

| ID | 이름 | 종 | 역할 | 특성 | 존 |
|----|------|-----|------|------|----|
| galaxy | Galaxy | Golden Retriever | 총괄 관리 | Warm, Leader | central_plaza, crystal_meadow |
| baize | Baize | Mythical White Lion | 지혜/교육 | Wise, Calm | eternity_forest, sunset_hill |
| serena | Serena | Unicorn | 치유 | Empathetic, Gentle | crystal_lake, crystal_meadow |
| kitsune | Kitsune | 9-Tailed Fox | 이벤트/놀이 | Playful, Mischievous | crystal_meadow, eternity_forest |
| luna_npc | Luna | Silver Wolf | 야간 보호 | Mysterious, Quiet | eternity_forest, sunset_hill |
| aria | Aria | Phoenix | 노래/표현 | Artistic, Inspiring | sunset_hill, central_plaza |
| terra | Terra | Giant Turtle | 안정/인내 | Slow, Steady | crystal_lake, crystal_meadow |
| sol | Sol | White Deer | 안내 | Hopeful, Radiant | crystal_meadow, sunset_hill |
| nero | Nero | Black Panther | 용기 | Brave, Protective | eternity_forest, sunset_hill |
| mira | Mira | White Cat | 연결 | Social, Matchmaker | central_plaza, crystal_lake |

---

## Event NPCs (이벤트 NPC 10명)

일상 이벤트에서 등장하는 펫 동행자들.

| ID | 이름 | 종 | 성격 | 특성 | 존 |
|----|------|-----|------|------|----|
| happy | Happy | Golden Retriever | Extroverted | Social Butterfly | crystal_meadow, central_plaza, crystal_lake |
| choco | Choco | Poodle | Cautious | Deep Thinker | eternity_forest, crystal_lake |
| tory | Tory | Corgi | Curious | Explorer | crystal_meadow, eternity_forest, sunset_hill |
| cloud | Cloud | Samoyed | Gentle | Peacemaker | eternity_forest, crystal_lake, sunset_hill |
| lightning | Lightning | Beagle | Mischievous | Prankster | crystal_meadow, central_plaza |
| star | Star | Chihuahua | Sensitive | Picky but Loyal | sunset_hill, crystal_lake |
| mong | Mong | Persian Cat | Lazy | Relaxed Master | crystal_lake, eternity_forest |
| ruby | Ruby | Russian Blue | Elegant | Classy | central_plaza, sunset_hill |
| wind | Wind | Shiba Inu | Independent | Free Spirit | sunset_hill, crystal_meadow, eternity_forest |
| bokshil | Bokshil | Maltese | Innocent | Pure Soul | crystal_meadow, crystal_lake |

---

## NPC 선택 로직

### 일반 이벤트 NPC

```
1. 내러티브 연속성: 이전 이벤트의 NPC가 있으면 60% 확률로 재선택
2. 현재 존에 배치된 NPC만 후보
3. 성격 매칭:
   - social_energy < 50 → Gentle, Cautious, Calm NPC
   - playfulness > 70 → Extroverted, Curious, Mischievous NPC
   - anxiety > 60 → Gentle, Sensitive, Steady NPC
4. 매칭 실패 시 → 랜덤 선택
```

### 학습 이벤트 선생님 NPC

```
1. 전체 NPC + Guardian 풀에서 선택
2. 불안 높은 펫 → 양육적 선생님 (Gentle, Empathetic, Warm)
3. 소극적 펫 → 조용한 선생님 (Cautious, Calm, Lazy)
4. 기본 → 인내심 있는 선생님 (Wise, Steady, Sensitive)
```

---

## 위치 선택 로직 (selectLocation)

```
1. 존별 위치 목록 로드
2. 이벤트 타입에 적합한 위치 필터링

특수 규칙:
  arrival → Welcome Plaza (Central Plaza)
  learning_* → edge/hollow/grove/center (조용하고 열린 곳)
  letter_response → reflection_pool/quiet/edge
  anxiety 높은 펫 → quiet/edge/hollow (안전한 곳)
  playfulness 높은 펫 → center/garden/shore (열린 곳)
  curiosity 높은 펫 → grove/canopy/deep (탐험 곳)

3. 기본 → 랜덤 선택
```

---

## 시간대 시스템

```
morning (6-12시):   "The first light crept across the horizon, soft gold."
afternoon (12-17시): "The sun hung high, casting sharp shadows."
evening (17-21시):   "The sky deepened to copper and violet, and grew quiet."
night (21-6시):      "Stars appeared one by one, blue-glowing moss illuminated paths."
```

---

## 세계관 금지 사항 (Admin Configs)

### 금지어 목록

```
death, corpse, burial, cremation, smartphone, internet, AI, algorithm,
suicide, follow you, medical, doctor, hospital,
heaven, hell, reincarnation, sin, punishment
```

### 안전 가이드라인

- 자해/자살을 조장하는 언어 엄격 금지
- 사후세계에서의 물리적 고통 (추위, 배고픔, 두려움) 묘사 금지
- 엄격한 종교적 중립성 유지
- 의학적/심리학적 진단이나 처방 금지

### 물리적 제한

- 죽는 순간이나 의학적 고통 묘사 금지
- 유골, 납골, 묘지 언급 금지
- 영적 연결에 집중

### 몰입 규칙

- 현대 기술 언급 금지 (폰, 앱, 디지털)
- AI 정체 절대 드러내지 않음
- 동물의 자연스러운 행동 유지 (정치, 직업 등 과도한 의인화 금지)

### 감정 경계

- 죄책감 유발 금지 ("Why don't you write more?")
- 독성 긍정주의 금지 ("Time heals all wounds")
- 건강한 현실 생활 격려

---

## 세계관 보완 필요 사항 (검토용)

### 현재 부족한 점

1. **가디언 배경 스토리**: 각 가디언의 origin story가 없음. 왜 가디언이 되었는지.
2. **NPC 간 관계**: NPC들 사이의 관계 설정이 없음 (친구, 라이벌 등).
3. **존 간 이동 이벤트**: 존을 이동할 때 특별한 이벤트나 의식이 없음.
4. **계절 시스템**: ToThereOn에 계절이 있는지 불명확.
5. **새로운 도착자 환영 의식**: Central Plaza에서의 환영 프로토콜 미정의.
6. **Reflection Pool 상세**: 관찰 가능 조건, 빈도, 제한 등이 불명확.
7. **Human Heaven 묘사**: 최종 목적지에 대한 힌트나 설명 부족.
8. **펫 간 우정 시스템**: 반복 상호작용으로 우정이 쌓이는 메커니즘 미구현.
9. **특별 이벤트/축제**: 마일스톤 외 세계적 이벤트 없음.
10. **밤 시스템**: Luna의 야간 보호 역할이 이벤트에 반영되지 않음.
