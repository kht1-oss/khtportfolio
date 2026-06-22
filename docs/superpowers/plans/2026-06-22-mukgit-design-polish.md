# 맛킷 디자인 단장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 맛킷리스트 사이트의 배경을 분홍 그라데이션으로, 카드를 인스타식 + 호버 효과로, 추천 버튼을 하트로 단장한다(기능 변경 없음).

**Architecture:** 순수 시각 변경. `mukgit.css`(대부분), `mukgit.html`(헤더 소폭), `mukgit.js`(`postCardHTML`의 추천 버튼 렌더만) 수정. 자동 테스트 없음 — 브라우저(localhost) 수동 확인.

**Tech Stack:** HTML, CSS, Vanilla JS. 로컬 확인 서버는 이미 실행 중(`http://localhost:8000/mukgit.html`); 없으면 `python -m http.server 8000 --bind 127.0.0.1`을 `z:/NewClaude`에서 실행.

## Global Constraints

- 기능·데이터·Firebase·보안규칙·추천 1회 제한·삭제 로직은 **변경 금지**. 모양만 바꾼다.
- 배경: 부드러운 분홍 그라데이션 (위 `#ffd9e8` → 아래 `#fff5fa`).
- 강조 텍스트: 로즈/플럼 `#c2487a`. 금빛 포인트 `#f0c14b` 유지. 카드 흰색 유지.
- 레이아웃 구조(시상대 1위 중앙 / 2·3위 양옆 / 4위↓ 격자), 모바일 1열 전환 유지.
- 호버 효과는 PC에서만(`@media (hover: hover)`), 모바일 탭에 영향 없게.
- 추천 버튼: 미추천=🤍, 추천함=❤️(비활성). 클릭 시 누르는 피드백.
- 커밋 메시지는 간결한 한 줄 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- `mukgit.css` — 색 토큰, 배경, 헤더, 카드/호버/1위, 하트 버튼 스타일 (이번 작업의 대부분)
- `mukgit.html` — 헤더에 금빛 라인 요소 추가(소폭)
- `mukgit.js` — `postCardHTML`의 추천 버튼 마크업만 하트로 교체

각 태스크는 같은 파일(`mukgit.css`)을 순차 수정하므로 **반드시 순서대로** 진행.

---

## Task 1: 배경 & 전체 톤 (분홍 그라데이션 + 로즈 강조)

**Files:**
- Modify: `mukgit.css` (`:root` 토큰, 헤더 색)
- Modify: `mukgit.html` (헤더에 금빛 라인 요소)

**Interfaces:**
- Consumes: 없음
- Produces: 새 색 토큰(`--bg-top:#ffd9e8`, `--bg-bottom:#fff5fa`, `--accent:#c2487a`). `body`는 기존에 이 토큰을 쓰므로 배경이 자동으로 분홍이 됨. 헤더에 `.gold-line` 요소.

- [ ] **Step 1: 색 토큰을 분홍/로즈로 교체**

`mukgit.css` 상단 `:root` 블록을 아래로 교체:

```css
:root {
  --bg-top: #ffd9e8;
  --bg-bottom: #fff5fa;
  --card: #ffffff;
  --ink: #4a3a40;
  --accent: #c2487a;
  --gold: #f0c14b;
  --gold-deep: #a6781a;
  --line: #f3dbe6;
}
```

- [ ] **Step 2: 헤더 색·문구 색을 분홍 톤에 맞게 조정**

`mukgit.css`의 헤더/상태 텍스트 줄들을 교체:

```css
.site-header { text-align: center; padding: 28px 16px 12px; }
.site-header .pillars { color: #e0a3c0; letter-spacing: 4px; font-size: 13px; }
.site-header h1 { color: var(--accent); margin: 8px 0 6px; font-size: 28px; }
.site-header .gold-line { width: 120px; height: 2px; background: var(--gold); border: none; margin: 0 auto 6px; }
.site-header .tagline { color: #b07a93; margin: 0; font-size: 14px; }
main { max-width: 960px; margin: 0 auto; padding: 8px 16px 80px; }
.status, .empty { text-align: center; color: #b07a93; }
```

- [ ] **Step 3: 헤더 HTML에 금빛 라인 요소 추가**

`mukgit.html`의 헤더에서 h1과 tagline 사이에 `<hr class="gold-line" />` 추가. 아래처럼:

```html
  <header class="site-header">
    <div class="pillars">▌▐ ▌▐ ▌▐ ▌▐ ▌▐ ▌▐ ▌▐</div>
    <h1>올림푸스 명예의 전당</h1>
    <hr class="gold-line" />
    <p class="tagline">맛있게 먹은 음식을 바치고, 추천으로 신전에 올리세요</p>
  </header>
```

- [ ] **Step 4: 브라우저에서 수동 확인**

브라우저에서 `http://localhost:8000/mukgit.html` 새로고침(Ctrl+Shift+R).
Expected:
- 배경이 분홍 그라데이션(위 진한 분홍 → 아래 연한 분홍)
- 제목이 로즈색, 그 아래 금빛 가로 라인
- 기존 글/사진/추천이 그대로 보이고 동작도 정상

- [ ] **Step 5: 커밋**

```bash
git add mukgit.css mukgit.html
git commit -m "style: 배경 분홍 그라데이션 + 로즈 강조 톤 적용

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 카드 스타일 + 호버 + 1위 강조

**Files:**
- Modify: `mukgit.css` (`.post` 및 관련, 호버 미디어쿼리)

**Interfaces:**
- Consumes: Task 1의 색 토큰
- Produces: 라운드/그림자 강화된 카드, PC 호버 시 떠오름+사진 확대, 1위 금빛 강조. 새 클래스 없음(기존 `.post`, `.photo`, `.rank-1` 재스타일).

- [ ] **Step 1: 카드/사진/1위 스타일 교체**

`mukgit.css`에서 `.post` ~ `.post.rank-1 .fname` 까지의 블록(현재 카드 관련 규칙)을 아래로 교체:

```css
.post {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(170, 90, 130, 0.14);
  display: flex; flex-direction: column;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.post.rank-1 {
  border: 2px solid var(--gold);
  box-shadow: 0 8px 22px rgba(240, 193, 75, 0.4);
}
.post .photo {
  width: 100%; aspect-ratio: 4 / 3; object-fit: cover;
  background: #ffe3ec;
  transition: transform 0.3s ease;
}
.post .body { padding: 10px 12px; }
.post .crown { font-size: 18px; }
.post.rank-1 .crown { font-size: 22px; filter: drop-shadow(0 0 5px rgba(240, 193, 75, 0.9)); }
.post .fname { font-weight: bold; color: var(--accent); margin: 4px 0 2px; }
.post.rank-1 .fname { font-size: 20px; }
.post .sub { font-size: 12px; color: #b08296; }
```

- [ ] **Step 2: PC 전용 호버 효과 추가**

`mukgit.css` 맨 아래(모바일 미디어쿼리 위쪽)에 추가:

```css
/* 호버 효과는 마우스가 있는 환경(PC)에서만 */
@media (hover: hover) {
  .post:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(170, 90, 130, 0.26);
  }
  .post:hover .photo { transform: scale(1.04); }
  .post.rank-1:hover { box-shadow: 0 14px 30px rgba(240, 193, 75, 0.5); }
}
```

- [ ] **Step 3: 브라우저에서 수동 확인**

`http://localhost:8000/mukgit.html` 새로고침.
Expected:
- 카드가 더 둥글고 그림자가 분홍빛으로 부드럽게
- (PC) 카드에 마우스 올리면 살짝 떠오르고 사진이 약간 확대됨(카드 밖으로 안 삐져나감)
- 1위 카드는 금빛 테두리 + 왕관에 은은한 빛
- 모바일 폭(개발자도구 모바일뷰)에선 호버 효과 없이 깔끔, 시상대 1열

- [ ] **Step 4: 커밋**

```bash
git add mukgit.css
git commit -m "style: 카드 라운드/그림자 강화 + PC 호버 효과 + 1위 강조

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 하트 추천 버튼

**Files:**
- Modify: `mukgit.js` (`postCardHTML`의 추천 버튼 마크업)
- Modify: `mukgit.css` (`.vote-btn` 재스타일)

**Interfaces:**
- Consumes: `voted`(=`hasVoted(localStorage, p.id)`), `p.votes`. 동작 로직(클릭 핸들러, increment, 1회 제한)은 기존 그대로 — 마크업/스타일만 변경.
- Produces: 미추천 `🤍 N`(클릭 가능), 추천함 `❤️ N`(비활성, `.voted` 클래스). 누를 때 살짝 커지는 피드백.

- [ ] **Step 1: 추천 버튼 마크업을 하트로 교체 (mukgit.js)**

`mukgit.js`의 `postCardHTML` 안 추천 버튼 줄을 교체.

기존:
```javascript
        <button class="vote-btn" data-action="vote" ${voted ? "disabled" : ""}>▲ ${p.votes}</button>
```

신규:
```javascript
        <button class="vote-btn ${voted ? "voted" : ""}" data-action="vote" ${voted ? "disabled" : ""}>${voted ? "❤️" : "🤍"} ${p.votes}</button>
```

- [ ] **Step 2: 하트 버튼 스타일 교체 (mukgit.css)**

`mukgit.css`에서 `.vote-btn`과 `.vote-btn:disabled` 두 규칙을 아래로 교체:

```css
.vote-btn {
  background: #fff0f5; color: #c2487a; border: 1px solid #f3cdde;
  border-radius: 20px; padding: 4px 12px; cursor: pointer; font-size: 13px;
  font-weight: 600; display: inline-flex; align-items: center; gap: 4px;
  transition: transform 0.12s ease, background 0.2s ease;
}
.vote-btn:hover { background: #ffe3ee; }
.vote-btn:active { transform: scale(1.18); }
.vote-btn.voted { background: #ffe0ea; color: #d12b6a; cursor: default; }
.vote-btn:disabled { cursor: default; }
```

- [ ] **Step 3: 브라우저에서 수동 확인**

`http://localhost:8000/mukgit.html` 새로고침.
Expected:
- 아직 추천 안 한 글: 🤍 + 숫자, 분홍 버튼
- 클릭하면: 숫자 +1, ❤️로 바뀌고 비활성(같은 기기 재추천 차단). 누르는 순간 버튼이 살짝 커짐
- 새로고침해도 이미 추천한 글은 ❤️ 유지
- 추천수에 따라 순위/시상대 위치가 그대로 갱신됨

- [ ] **Step 4: 커밋**

```bash
git add mukgit.js mukgit.css
git commit -m "style: 추천 버튼을 하트(🤍/❤️)로 변경

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 배포

**Files:** (코드 변경 없음 — 병합/푸시)

- [ ] **Step 1: 최종 로컬 확인**

`http://localhost:8000/mukgit.html` 에서 글쓰기 1회 + 추천 1회 + 1위 표시가 모두 정상인지 확인.

- [ ] **Step 2: main 병합 + 푸시**

```bash
git checkout main
git merge --no-ff feat/mukgit-design -m "merge: 맛킷 디자인 단장 (분홍+인스타+하트)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 3: 라이브 확인**

1~2분 뒤 `https://kht1-oss.github.io/khtportfolio/mukgit.html` 에서 새 디자인이 보이는지 확인(PC·모바일).

---

## Self-Review 결과
- **Spec 커버리지:** 배경 분홍 그라데이션(T1), 로즈 강조·금빛 라인(T1), 카드 인스타 스타일+호버 PC전용(T2), 1위 강조(T2), 하트 추천 미추천/추천 상태+누름 피드백(T3), 기능 불변(전 태스크 마크업/스타일만 수정), 반응형 유지(T2 확인), 배포(T4) — 모두 매핑됨.
- **Placeholder 스캔:** 모든 코드 단계에 실제 CSS/JS 포함. 없음.
- **일관성:** 색 토큰(`--accent:#c2487a`, `--bg-top/bottom`)을 T1에서 정의→T2/T3가 `var()`로 참조. `.voted` 클래스는 T3 JS에서 추가→T3 CSS에서 스타일. 일치.
