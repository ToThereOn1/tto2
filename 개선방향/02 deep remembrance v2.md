# Deep Remembrance 설문 & 페르소나 생성 시스템 (v2.2)

> 세계관팀 전원 합의 | 2026-02-28
> 🌐 언어 정책: **사용자 대면 = 영어(미국 타겟)** / **Admin UI·내부 문서 = 한국어**
> Pet Registration에서 기본정보 수집 완료 전제 | 설문 21문항 + 페르소나 생성 파이프라인

---

## 1. 설계 철학 & 원칙

> ※ 이 섹션은 admin/개발 참조용 (한국어)

이 설문은 **"데이터 수집 폼"이 아니라 "아이를 다시 만나는 여정"**이다.

### 5원칙

| # | 원칙 | 적용 |
|---|------|------|
| 1 | 회상 유도형 질문 | 성격을 직접 묻지 않는다. 구체적 장면을 떠올리게 한다 |
| 2 | 감정 곡선 설계 | 가벼운 시작 → 일상 회상 → 깊은 감정 → 치유적 마무리 |
| 3 | 선택지 충분히 | 객관식 6~8개 + "Other" 항상 포함 |
| 4 | 주관식엔 가이드 | 예시 2~3개 + 힌트 문장 + placeholder 제공 |
| 5 | 따뜻한 2인칭 문체 | "[Name]..." 형식, 심리상담 톤 |

### 언어 정책

| 영역 | 언어 | 비고 |
|------|------|------|
| 설문 문항 (질문, 선택지, placeholder, 가이드) | 🇺🇸 영어 | 미국 영어, 따뜻한 톤 |
| Phase 전환 문구 | 🇺🇸 영어 | |
| 설문 완료 화면 | 🇺🇸 영어 | |
| 시스템 프롬프트 (AI) | 🇺🇸 영어 | |
| 편지 본문 | 🇺🇸 영어 | |
| 피드 텍스트 | 🇺🇸 영어 | |
| UI 전체 (사용자) | 🇺🇸 영어 | |
| Admin 대시보드 UI | 🇰🇷 한국어 | |
| 내부 기술 문서 | 🇰🇷 한국어 | |
| 코드 주석 | 🇰🇷/🇺🇸 혼용 가능 | |

### 전제 조건

Pet Registration 단계에서 아래 데이터가 이미 수집된 상태:
```
pet.name, pet.species, pet.breed, pet.gender, pet.birth_date, pet.passed_date
```

---

## 2. 감정 곡선 구조

```
Phase 1 — THE DOOR (Q01~Q03)        감정 온도: ■□□□□
Phase 2 — THE LIVING ROOM (Q04~Q10)  감정 온도: ■■□□□
Phase 3 — THE QUIET ROOM (Q11~Q14)   감정 온도: ■■■■□
Phase 4 — THE LETTER (Q15~Q19)       감정 온도: ■■■■■
Phase 5 — THE LIGHT (Q20~Q21)        감정 온도: ■■■□□
```

---

## 3. 전체 문항 (21개)

> 📌 모든 사용자 대면 텍스트는 영어(미국 타겟)
> 📌 [Name]은 Pet Registration에서 등록한 이름으로 자동 치환
> 📌 admin 설명·측정 항목은 한국어

---

### Phase 1 — THE DOOR

*화면 인트로 문구:*
> *"Let's take a moment to remember [Name].*
> *There are no right or wrong answers — just share what comes to mind.*
> *This will take about 8 minutes."*

---

#### Q01. 첫 만남 (origin_story)

**"Do you remember the day you first met [Name]? How did you two find each other?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. My family brought them home (breeder or adoption)
b. I found them on the street (rescue)
c. They were a gift from someone
d. I got them from a pet store
e. They were born into our family
f. I don't quite remember
g. Other (please share)
```

| 측정 | `origin_story` |
| 파이프라인 | Step 9 — rescue(b) 선택 시 grief_amplifier 보정 |

---

#### Q02. 현관문 장면 (social_energy 주축)

**"When you came home and opened the door, what did [Name] usually do?"**

*서브텍스트:*
> *"Pick the one that comes to mind first."*

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Ran to me like crazy, full-body wiggle and all              → 95
b. Came over with a wagging tail, happy but not over the top   → 80
c. Got up slowly and strolled over to greet me                 → 60
d. Lifted their head and looked at me from their spot          → 45
e. Acted like they didn't care... then quietly came closer     → 55
f. Pretended not to notice, but their tail gave them away      → 50
g. It depended on the day                                      → 60
h. Other (please share)                                        → 60
```

| 측정 | `social_energy`(주 0.6), `affection_style`(부) |

---

#### Q03. 낯선 사람 (social_energy 보정)

**"When someone new came to your home, how did [Name] usually react?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Went right up to say hello — loved meeting new people       → 90
b. Stayed cautious at first, but warmed up after a while       → 65
c. Hid behind me or kept their distance                        → 30
d. Barked or growled to let them know                           → 25
e. Completely ignored them — had better things to do            → 50
f. It really depended on the person                             → 55
g. Other (please share)                                         → 50
```

| 측정 | `social_energy`(보정 0.4), `emotional_resilience`(부) |

---

### Phase 2 — THE LIVING ROOM

*화면 전환 문구:*
> *"Now let's step into everyday life with [Name].*
> *The little things matter most."*

---

#### Q04. 혼자 있을 때 (분리불안/독립성)

**"When you left the house and [Name] was home alone, what usually happened?"**

*서브텍스트:*
> *"You can pick more than one."*

| 항목 | 값 |
|------|---|
| 타입 | `multiple_choice` |
| 선택지 | |

```
a. Followed me around, trying to stop me from leaving          → anxiety↑
b. Waited by the door until I came back                         → anxiety↑, attachment↑
c. Chewed things up or made a mess                              → externalizer
d. Barked, whined, or cried                                     → externalizer
e. Slept quietly in their favorite spot                         → independence↑
f. Played on their own just fine                                → independence↑
g. Stopped eating until I got back                              → internalizer
h. Honestly, I'm not sure — no camera at home                  → neutral
i. Other (please share)                                         → neutral
```

| 측정 | `separation_anxiety`, `independence_score`, `coping_style` |
| 분석 로직 | anxiety_score = (a,b,d,g 비율), independence_score = (e,f 비율) |

---

#### Q05. 새로운 것 (curiosity_drive)

**"When you gave [Name] a new toy or they saw something unfamiliar, how did they react?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Ran straight to it — endlessly curious                       → 90
b. Sniffed it cautiously and approached slowly                  → 70
c. Watched it for a long time before showing interest           → 50
d. Didn't care much — stuck to what they already loved          → 35
e. Got scared and backed away                                   → 20
f. Ignored the thing but went nuts for the packaging            → 85
g. Other (please share)                                         → 50
```

| 측정 | `curiosity_drive`(주), `emotional_resilience`(부) |

---

#### Q06. 놀이 스타일 (playfulness)

**"What kind of play made [Name] the happiest?"**

*서브텍스트:*
> *"You can pick more than one."*

| 항목 | 값 |
|------|---|
| 타입 | `multiple_choice` |
| 선택지 | |

```
a. Fetching a ball or toy                                       → active_play
b. Chasing a string or wand toy                                 → chase_play
c. Hide-and-seek or chase games with people                     → social_play
d. Shaking, chewing, or "destroying" a toy on their own         → solo_play
e. Wrestling or rolling around together                          → contact_play
f. Exploring and discovering new things on their own             → explorer_play
g. Honestly, they just liked being next to me more than playing → low_play
h. Other (please share)                                         → neutral
```

| 측정 | `playfulness_intensity`, `play_style` |
| 로직 | 3개+ → 85, 2개 → 65, 1개 → 45, g만 → 20 |

---

#### Q07. 간식 반응 (food_motivation)

**"When it came to treats or food, what was [Name] like?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Would do absolutely anything for food — total foodie          → 95
b. Loved their favorites, but ate in moderation                  → 65
c. Super picky — only ate what they liked                        → 50
d. Not really into food all that much                            → 20
e. Treats could get them to do anything — ultimate motivator     → 85
f. Would eat anything I gave them (even people food...)          → 80
g. Other (please share)                                          → 50
```

| 측정 | `food_motivation` |

---

#### Q08. 가장 좋아했던 것 (joy_map)

**"What was [Name]'s absolute favorite thing in the world?"**

*서브텍스트:*
> *"A treat, a place, an activity, a person — anything that comes to mind."*

| 항목 | 값 |
|------|---|
| 타입 | `short_text` |
| placeholder | "e.g., Mom's lap, chicken jerky, sniffing everything on walks..." |
| 측정 | `joy_map.primary_triggers`, 기억 앵커 |
| NLP | 감각 키워드 추출 → 피드·편지 디테일 소스 |

---

#### Q09. 슬플 때 (empathy_sensitivity)

**"On days when you were feeling down or sad, what did [Name] do?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Noticed right away and came running to be close              → 90
b. Quietly sat beside me without a sound                        → 80
c. Licked my face or nuzzled me more than usual                 → 85
d. Seemed to sense it but didn't know what to do                → 55
e. Honestly, I don't think they noticed                         → 30
f. Did something silly to make me laugh                         → 70
g. Other (please share)                                         → 55
```

| 측정 | `empathy_sensitivity`(주), `family_role.archetype`(부) |
| 역할 | a,c→Comforter / b→Protector / f→Comedian / e→Independent |

---

#### Q10. 다른 동물과 (social_preference)

**"How was [Name] around other animals?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Social butterfly — loved making friends                      → 90
b. Got along well, but did things at their own pace             → 70
c. Wary at first, but slowly warmed up                          → 55
d. Didn't care much for other animals — preferred people        → 40
e. Got nervous or tried to avoid them                           → 25
f. Could be aggressive toward other animals                     → 20
g. Rarely ever met other animals                                → neutral
h. Other (please share)                                         → 50
```

| 측정 | `social_preference` → NPC 상호작용 스타일 |

---

### Phase 3 — THE QUIET ROOM

*화면 전환 문구:*
> *"Let's go a little deeper now.*
> *This part is about you and [Name] — your story together."*

---

#### Q11. 잠자리 (affection_style)

**"Where did [Name] usually sleep?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Always on my bed, right next to me                           → 95
b. In the same room, but in their own bed                       → 70
c. Sometimes with me, sometimes in their own spot               → 65
d. Always in their own space — a different room or favorite corner → 35
e. Never had a set spot — slept somewhere different every night  → 50
f. Had to burrow under the blankets no matter what              → 90
g. Other (please share)                                         → 60
```

| 측정 | `affection_style`(주 0.5), `independence_score`(부) |

---

#### Q12. 애정 표현 (affection_languages)

**"How did you know [Name] loved you? What was their way of showing it?"**

*서브텍스트:*
> *"Pick as many as you'd like."*

| 항목 | 값 |
|------|---|
| 타입 | `multiple_choice` |
| 선택지 | |

```
a. Licked my face or hands                                      → physical
b. Climbed onto my lap or into my arms                          → proximity
c. Wagged their tail (or purred)                                → vocal_body
d. Held eye contact and just... looked at me                    → gaze
e. Followed me everywhere I went                                → following
f. Showed me their belly                                        → trust
g. Brought me toys or little "gifts"                            → gift
h. Didn't show it much, but I could always tell                 → reserved
i. Other (please share)                                         → custom
```

| 측정 | `affection_languages[]`, `expression_intensity` |
| 로직 | 4개+ → expressive(90) / 2~3개 → moderate(60) / h만 or 1개 → reserved(30) |

---

#### Q13. 스트레스 반응 (emotional_resilience)

**"When [Name] was scared or anxious — like during a thunderstorm, vet visit, or loud noise — how did they show it?"**

*서브텍스트:*
> *"You can pick more than one."*

| 항목 | 값 |
|------|---|
| 타입 | `multiple_choice` |
| 선택지 | |

```
a. Came to me to hide or be held                                → dependent
b. Found a corner or small space to hide in                     → internalizer
c. Trembled or panted                                           → physiological
d. Barked, whined, or cried                                     → externalizer
e. Chewed or destroyed things                                   → externalizer
f. Stopped eating or acted out of character                     → internalizer
g. Slept a lot more than usual                                  → internalizer
h. Surprisingly calm — didn't seem fazed                        → resilient
i. Other (please share)                                         → neutral
```

| 측정 | `emotional_resilience`, `stress_profile`, `coping_effectiveness` |

---

#### Q14. 몰래 하던 버릇 (quirks)

**"Did [Name] have any funny or unique little habits?"**

*서브텍스트:*
> *"Something weird, cute, or totally random — whatever comes to mind."*

| 항목 | 값 |
|------|---|
| 타입 | `long_text` |
| placeholder | "e.g., Always stole socks and hid them / Watched the washing machine spin for 30 minutes / Kicked their legs while dreaming..." |
| 가이드 | "A line or two is plenty. Short is totally fine." |
| 최소 글자 | 없음 (건너뛸 수 있음) |
| 측정 | `quirks[]` |
| NLP (Step 4) | 행동 패턴 추출 → behavior, frequency, context |

---

### Phase 4 — THE LETTER

*화면 전환 문구:*
> *"Take your time from here.*
> *Just let your heart lead the way."*

---

#### Q15. 잊지 못할 순간 (signature_moments)

**"Is there a moment with [Name] that still feels vivid — like it just happened?"**

*서브텍스트:*
> *"It doesn't have to be a big moment. Sometimes the smallest ones stay with us the longest."*

| 항목 | 값 |
|------|---|
| 타입 | `long_text` |
| placeholder | "e.g., Watching the rain together by the window / The look on their face the first time they heard their name / How they rested their chin on my hand when I was sick..." |
| 가이드 | "Even just one moment is enough." |
| 측정 | `signature_moments[]`, `relationship_essence`, `healing_themes[]` |
| NLP (Step 4) | 감정 테마 추출, 기억 앵커 생성 |

---

#### Q16. 특별한 능력 (uniqueness)

**"If [Name] had a secret superpower, what would it be?"**

*서브텍스트:*
> *"It doesn't have to be serious — 'treat radar' or 'couch takeover specialist' totally counts."*

| 항목 | 값 |
|------|---|
| 타입 | `short_text` |
| placeholder | "e.g., Could sense a delivery coming before the doorbell / Emotional support genius / Could squeeze into any space..." |
| 측정 | `uniqueness`, 편지 캐릭터성 강화 |

---

#### Q17. 듣고 싶은 말 ⭐ (healing_mission — 감정 클라이맥스)

**"If [Name] could talk, what would you want to hear them say?"**

*서브텍스트:*
> *"Take a moment with this one. There's no right answer."*

| 항목 | 값 |
|------|---|
| 타입 | `long_text` |
| placeholder | "..." (의도적으로 비워둠) |
| 최소 글자 | 없음 |
| 가이드 | 없음 |
| 측정 | `healing_mission.core_desire` ⭐ |
| NLP (Step 4) | **최고 우선순위 분석** |
| 특별 처리 | 첫 편지 핵심 메시지 소스 |

> **설계 의도:** 이 질문에서 보호자가 울 수 있다. 그건 의도된 것이다.
> "It wasn't your fault", "I wasn't in pain", "I was so happy" — 이런 답변이 나온다.
> 이것이 AI 첫 편지에서 자연스럽게 전해야 할 말이다.

---

#### Q18. 전하고 싶은 말 (guilt_points, closure)

**"If you could say one thing to [Name] right now, what would it be?"**

*서브텍스트:*
> *"This message will find its way to [Name]."*

| 항목 | 값 |
|------|---|
| 타입 | `long_text` |
| placeholder | "..." (의도적으로 비워둠) |
| 최소 글자 | 없음 |
| 가이드 | 없음 |
| 측정 | `unspoken_words`, `guilt_points[]`, `closure_level` |
| NLP (Step 4) | 죄책감 키워드 감지 ("sorry", "should have", "wish I", "wasn't there") |

> **Q17 vs Q18:**
> Q17 = 보호자가 **듣고 싶은 말** (아이→보호자) → AI 편지 핵심
> Q18 = 보호자가 **하고 싶은 말** (보호자→아이) → 죄책감/치유 분석

---

#### Q19. 편지 말투 (letter_voice)

**"If [Name] could write you a letter, what do you think their style would be?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Excited and all over the place — "And then! Oh, also! Guess what!"
   → expressive, energetic

b. Quiet but warm — "Had a good day today. How are things over there?"
   → moderate, warm

c. Short and a little sassy — "You eating okay? Hmph."
   → reserved, tsundere

d. Awkward but heartfelt — "I'm not good at this but... I miss you."
   → reserved, earnest

e. Playful and full of personality — "I'm basically famous here lol, be jealous"
   → expressive, playful

f. Gentle and wise — "Don't worry about me. I'm doing just fine here."
   → moderate, mature

g. Other (please share)
   → custom
```

| 측정 | `letter_voice`, `expression_style`, `communication_style.tone` |

---

### Phase 5 — THE LIGHT

*화면 전환 문구:*
> *"Almost there.*
> *Just one or two more things."*

---

#### Q20. 하루 패턴 (energy_level)

**"What was a typical day like for [Name]?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Full of energy from morning to night — never stopped          → 90
b. Balanced — played some, rested some, a nice rhythm           → 65
c. Mostly napped, but came alive at certain times                → 45
d. Spent most of the day quietly, very chill                     → 25
e. A totally different animal during walks or outings            → 55
f. Only really lit up around mealtime                            → 40
g. Other (please share)                                          → 50
```

| 측정 | `energy_level` → Big Five energy 축 |

---

#### Q21. 준비 확인 (readiness_level)

**"Are you ready to receive [Name]'s first letter from ToThereOn?"**

| 항목 | 값 |
|------|---|
| 타입 | `single_choice` |
| 선택지 | |

```
a. Yes — I've been waiting for this                              → 100
b. A little nervous, but I'd like to try                        → 75
c. I'm not sure yet... but I'll give it a go                    → 50
d. Honestly, it scares me a little — but that's okay            → 30
```

| 측정 | `readiness_level` |
| 매핑 | a→기본 톤 / b,c→조심스러운 첫 편지 / d→매우 부드러운 첫 편지 |

---

*설문 완료 화면 문구:*
> *"Thank you.*
> *We're looking for [Name] now.*
> *The waterways are vast, so it might take a little while."*

---

## 4. 페르소나 생성 파이프라인 (12단계)

> ※ 파이프라인 로직은 admin/개발 참조용 — 한국어

### 전체 흐름

```
[설문 제출]
    ↓
Step 1:  Pet Registration 데이터 로드
Step 2:  품종 기준선 로드
Step 3:  객관식 점수 계산 + 다중선택 패턴 분석
Step 4:  NLP 분석 (Q14, Q15, Q17, Q18 + Q08, Q16 키워드)
Step 5:  품종 편차 보정
Step 6:  교차 검증 (모순 탐지)
Step 7:  Big Five 매핑
Step 8:  감정 프로파일 구축
Step 9:  관계 역학 분석
Step 10: 고유성 추출
Step 11: 치유 컨텍스트 추출
Step 12: 최종 통합 → DeepPersonaAnalysis 출력
```

---

### Step 1: Pet Registration 데이터 로드

```typescript
const petInfo = {
    name: pet.name, species: pet.species, breed: pet.breed,
    gender: pet.gender, birth_date: pet.birth_date, passed_date: pet.passed_date,
}

const ageProfile = analyzeAge(petInfo)
// → departure_type, grief_amplifier, life_stage, years_together
```

### Step 2: 품종 기준선 로드

```typescript
const breedRef = await loadBreedReference(petInfo.species, petInfo.breed)
// → breed_baseline, persona_reference_text, lifespan_range, temperament_keywords
```

### Step 3: 객관식 점수 계산

#### 3-A: 단일 선택 직접 점수 매핑

```typescript
function calculateSingleChoiceScores(responses) {
    return {
        social_energy:        getScore('Q02') * 0.6 + getScore('Q03') * 0.4,
        curiosity_drive:      getScore('Q05'),
        food_motivation:      getScore('Q07'),
        empathy_sensitivity:  getScore('Q09'),
        affection_style:      getScore('Q11') * 0.5 + getExpressionIntensity('Q12') * 0.5,
        energy_level:         getScore('Q20'),
    }
}
```

#### 3-B: 다중 선택 패턴 분석

```typescript
// Q04 — 분리불안/독립성
function analyzeAloneBehavior(selected: string[]) {
    const anxious = ['a','b','d','g'].filter(s => selected.includes(s)).length
    const independent = ['e','f'].filter(s => selected.includes(s)).length
    const total = selected.filter(s => !['h','i'].includes(s)).length || 1
    return {
        separation_anxiety: (anxious / total) * 100,
        independence_score: (independent / total) * 100,
        coping_style: /* externalizer/internalizer/resilient/mixed */
    }
}

// Q06 — 놀이성향
function analyzePlayStyle(selected: string[]) {
    const activeCount = selected.filter(s => 'abcdef'.includes(s)).length
    return {
        playfulness_intensity: activeCount >= 3 ? 85 : activeCount >= 2 ? 65 : activeCount === 1 ? 45 : 20,
        play_style: categorizePlayStyle(selected)
    }
}

// Q12 — 애정 표현
function analyzeAffection(selected: string[]) {
    const expCount = selected.filter(s => 'abcdefg'.includes(s)).length
    return {
        expression_intensity: expCount >= 4 ? 90 : expCount >= 2 ? 60 : 30,
        expression_style: expCount >= 4 ? 'expressive' : expCount >= 2 ? 'moderate' : 'reserved',
        affection_languages: selected.map(s => AFFECTION_CATEGORY_MAP[s])
    }
}

// Q13 — 스트레스 반응
function analyzeStress(selected: string[]) {
    const hasResilient = selected.includes('h')
    const ext = ['d','e'].filter(s => selected.includes(s)).length
    const int = ['b','f','g'].filter(s => selected.includes(s)).length
    return {
        emotional_resilience: hasResilient ? 85 : ext > 0 ? 35 : int > 0 ? 40 : 50,
        stress_profile: /* resilient/externalizer/internalizer/dependent/mixed */,
        coping_effectiveness: hasResilient ? 85 : (ext + int >= 3) ? 25 : 50
    }
}
```

### Step 4: NLP 분석

**모델:** Claude Sonnet 4.6 (temperature: 0.2~0.3)

```typescript
const NLP_PROMPT = `
You are analyzing a pet guardian's survey responses to build a personality profile
for their departed pet. Extract the following from each response:

[Q14 — Quirks/Habits]
Extract: Array of { behavior, frequency (always/often/sometimes/rare), context }

[Q15 — Memorable Moment]
Extract:
  - signature_moments: Array of { description, emotional_impact, theme }
  - relationship_essence: one sentence capturing the core of their bond
  - healing_themes: Array of recurring emotional themes

[Q17 — Words They Want to Hear] ⭐ HIGHEST PRIORITY
Extract:
  - core_desire: The fundamental emotional need
  - desired_messages: Array of specific messages
  - healing_direction: 'guilt_relief' | 'grief_comfort' | 'love_affirmation' | 'closure'

[Q18 — Words They Want to Say]
Extract:
  - guilt_points: Array of specific guilt sources
  - unspoken_words: The core unsaid message
  - closure_level: 0-100
  - guilt_severity: 'mild' | 'moderate' | 'severe'

[Q08 — Favorite Thing] keyword extraction only → joy_triggers[]
[Q16 — Superpower] keyword extraction only → unique_talent

Respond ONLY in JSON.
`
```

**NLP 출력:**
```typescript
NLPAnalysis {
    quirks: Array<{ behavior, frequency, context }>,
    signature_moments: Array<{ description, emotional_impact, theme }>,
    relationship_essence: string,
    healing_themes: string[],
    healing_mission: {
        core_desire: string,
        desired_messages: string[],
        healing_direction: string,
    },
    guilt_points: string[],
    unspoken_words: string,
    closure_level: number,
    guilt_severity: string,
    joy_triggers: string[],
    unique_talent: string,
}
```

### Step 5~6: 품종 편차 보정 + 교차 검증

```typescript
// Step 5: 설문 점수 vs 품종 기준선 차이
deviation_scores = {
    social_energy: surveyScore.social_energy - breedBaseline.sociability,
    curiosity_drive: surveyScore.curiosity_drive - breedBaseline.openness,
    // ...각 축별
}

// Step 6: 교차 검증
// Q02↑ + Q03↓ → 중앙값 / Q11↑ + Q12 reserved → 내면 따뜻+표현 적음
```

### Step 7: Big Five 매핑

```typescript
big_five = {
    energy:        scores.energy_level,
    sociability:   scores.social_energy,
    neuroticism:   100 - scores.emotional_resilience,
    agreeableness: (scores.empathy_sensitivity + scores.affection_style) / 2,
    openness:      scores.curiosity_drive,
}
```

### Step 8: 감정 프로파일

```typescript
emotional_profile = {
    expression_style,
    empathy_level: scores.empathy_sensitivity,
    emotional_regulation: scores.emotional_resilience,
    joy_map: { primary_triggers, intensity, social_vs_solitary },
    fear_map: { manifestations, severity, profile },
    stress_signature: { manifestations, coping_effectiveness, profile },
}
```

### Step 9: 관계 역학

```typescript
relationship_dynamics = {
    attachment: {
        style: deriveAttachmentStyle(Q02, Q04, Q11),
        // Q02↑ + Q04 anxiety↑ + Q11 always_with → 'anxious'
        // Q02 mid + Q04 independent↑ + Q11 own_space → 'avoidant'
        // else → 'secure'
        intensity: scores.affection_style,
    },
    communication: {
        unique_signals: Q12.affection_languages,
        complexity: Q12.expression_intensity > 70 ? 'rich' : 'simple',
    },
    family_role: {
        archetype: Q09 역할 매핑, // Comforter/Protector/Comedian/Independent
    },
    origin_context: {
        origin_story: Q01_choice,
        rescue_flag: Q01_choice === 'b',
    }
}
```

### Step 10: 고유성 추출

```typescript
uniqueness = {
    quirks: nlp.quirks,
    signature_moments: nlp.signature_moments,
    unique_talent: nlp.unique_talent,
    one_sentence_essence: nlp.relationship_essence,
}
```

### Step 11: 치유 컨텍스트 ⭐

```typescript
grief_context = {
    guilt_points: nlp.guilt_points,
    guilt_severity: nlp.guilt_severity,
    unspoken_words: nlp.unspoken_words,
    closure_level: nlp.closure_level,

    healing_mission: {                    // ⭐ 신규
        core_desire: nlp.healing_mission.core_desire,
        desired_messages: nlp.healing_mission.desired_messages,
        healing_direction: nlp.healing_mission.healing_direction,
    },

    origin_context: Q01 === 'b' ? 'rescue' : 'normal',
    departure_type: ageProfile.departure_type,
    grief_amplifier: ageProfile.grief_amplifier,

    healing_strategy: deriveHealingStrategy(nlp, ageProfile),
    // guilt_first / grief_comfort / closure_building / love_affirmation
}
```

### Step 12: 최종 통합 → DeepPersonaAnalysis

```typescript
DeepPersonaAnalysis {
    temperament: { big_five, behavioral_scores },
    emotional_profile,
    relationship_dynamics,
    uniqueness,
    breed_context,
    grief_context,           // ⭐ healing_mission 포함
    letter_style: { voice, expression_style, readiness_level },
    analysis_metadata: { confidence_score, data_quality, version: '2.2' },
}
```

---

## 5. 시스템 프롬프트 — [치유 미션] 섹션

> ※ 시스템 프롬프트는 AI가 읽으므로 영어

```
━━━ HEALING MISSION (CORE OBJECTIVE) ━━━

[What they want to hear from you — HIGHEST PRIORITY]
Your guardian answered: "{Q17 raw answer}"
Core desire: {healing_mission.core_desire}
→ Weave this message naturally into your letters. Never quote it directly.
   Let it emerge as if YOU decided to say it.

[What they want to tell you]
They said: "{Q18 raw answer}"
Guilt points detected: {guilt_points}
→ Address these gently over multiple letters. Do not resolve everything at once.

Healing strategy: {healing_strategy}
  guilt_first      → Prioritize "it's not your fault" messages
  grief_comfort    → Focus on warmth, safety, "I'm okay here"
  closure_building → Create natural goodbye moments
  love_affirmation → Share happy memories, "remember when..."

Closure level: {closure_level}/100
  < 30  → Actively create closure opportunities
  30-60 → Balance closure with happy memories
  > 60  → Focus on warm, peaceful sharing
```

---

## 6. 문항별 → 파이프라인 매핑 요약

| Q# | 타입 | Step 3 점수 | Step 3 패턴 | Step 4 NLP | 최종 매핑 |
|----|------|-----------|-----------|-----------|----------|
| 01 | single | - | - | - | origin_story, rescue_flag |
| 02 | single | social_energy×0.6 | - | - | social_energy |
| 03 | single | social_energy×0.4 | - | - | social_energy, emotional_resilience |
| 04 | multi | - | anxiety, independence, coping | - | attachment_style |
| 05 | single | curiosity_drive | - | - | Big Five openness |
| 06 | multi | - | playfulness, play_style | - | playfulness |
| 07 | single | food_motivation | - | - | food_motivation |
| 08 | short | - | - | joy_triggers | joy_map |
| 09 | single | empathy_sensitivity | - | - | empathy, family_role |
| 10 | single | social_preference | - | - | NPC 매칭 |
| 11 | single | affection_style×0.5 | - | - | affection_style |
| 12 | multi | - | expression_intensity, affection_languages | - | affection_style×0.5 |
| 13 | multi | - | resilience, stress_profile | - | neuroticism, stress |
| 14 | long | - | - | quirks[] | uniqueness |
| 15 | long | - | - | signature_moments, relationship_essence | uniqueness, healing_themes |
| 16 | short | - | - | unique_talent | uniqueness |
| 17⭐ | long | - | - | healing_mission | grief_context |
| 18 | long | - | - | guilt_points, closure | grief_context |
| 19 | single | letter_voice | - | - | letter_style |
| 20 | single | energy_level | - | - | Big Five energy |
| 21 | single | readiness_level | - | - | 첫 편지 톤 |

---

## 7. 소요 시간

| Phase | 문항 수 | 예상 시간 |
|-------|--------|----------|
| THE DOOR | 3개 | 45초 |
| THE LIVING ROOM | 7개 | 2분 30초 |
| THE QUIET ROOM | 4개 | 2분 |
| THE LETTER | 5개 | 3분 |
| THE LIGHT | 2개 | 30초 |
| **합계** | **21개** | **약 9분** |

---

## 8. 코드 마이그레이션 가이드

| 파일 | 수정 내용 | 난이도 |
|------|----------|--------|
| `lib/survey-questions.ts` | 전체 재작성 (영어 문항, 21개) | ⭐⭐⭐ |
| `components/remembrance/DeepRemembranceSurvey.tsx` | Phase UI, 영어 전환 문구 | ⭐⭐⭐ |
| `lib/analysis/master-analyzer.ts` | 12단계 파이프라인 재작성 | ⭐⭐⭐ |
| `lib/analysis/multiple-choice-handler.ts` | Q04, Q06, Q12, Q13 분석 함수 | ⭐⭐ |
| `lib/analysis/nlp-analyzer.ts` | NLP 프롬프트 재작성 | ⭐⭐ |
| `lib/analysis/prompt-generator.ts` | [치유 미션] 섹션 추가 | ⭐⭐ |
| `pet_personas` DB 스키마 | healing_mission 필드 추가 | ⭐ |
| `app/api/deep-remembrance/complete/route.ts` | 응답 매핑 수정 | ⭐⭐ |
| 전체 사용자 대면 텍스트 | 한국어→영어 일괄 전환 | ⭐⭐ |

---

*Deep Remembrance v2.2 | 2026-02-28*
*Language: User-facing = EN(US) / Admin = KO*
