# 맛킷리스트 (Olympus) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지인들이 맛집을 사진과 함께 올리고 추천을 눌러, 추천수가 높을수록 "신전 명예의 전당"에 크게 표시되는 1페이지 웹사이트를 만든다.

**Architecture:** 정적 프론트엔드(`mukgit.html` + CSS + ES 모듈 JS)를 GitHub Pages에 올리고, 데이터는 Firebase(Firestore + Storage)에 저장한다. 순수 로직(가격 포맷, 입력 검증, 랭킹 정렬, 추천 중복 체크)은 별도 모듈로 분리해 Node 내장 테스트 러너로 TDD한다. Firebase/DOM 통합은 브라우저에서 수동 검증한다.

**Tech Stack:** HTML, CSS, Vanilla JS (ES Modules), Firebase v10 modular SDK (CDN), Node 내장 `node --test` (테스트, 추가 설치 불필요).

## Global Constraints

- 메인 화면 파일명은 `mukgit.html` (포트폴리오 `index.html`과 구분). 절대 `index.html`로 만들지 않는다.
- 모든 화면 파일은 리포지토리 루트 `z:/NewClaude/`에 둔다 (GitHub Pages 배포 대상).
- 색감: 밝은 배경, 하늘빛(#eaf4ff~#dbeaff) + 구름 흰색 카드, 금빛(#f0c14b)은 1위 포인트, 강조 텍스트 남색(#1f5fa6).
- 레이아웃: A안 신전 시상대 — 1위 중앙 최대, 2·3위 양옆, 4위부터 아래 격자.
- 로그인 없음. 추천은 같은 브라우저(localStorage)에서 글당 1회.
- 글 수정 없음. 삭제는 관리자 암호 일치 시에만.
- Firebase 무료(Spark) 한도 전제. 사진은 업로드 전 클라이언트에서 리사이즈/압축.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 를 붙인다.

---

## File Structure

- `package.json` — `{"type":"module"}` 만. Node가 `.js`를 ESM으로 읽고 브라우저 import와 호환되게 함.
- `mukgit.utils.js` — 순수 함수: `formatPrice`, `validatePostInput`, `rankPosts`, `hasVoted`, `markVoted`. (테스트 대상)
- `test/mukgit.utils.test.js` — 위 순수 함수 테스트 (`node --test`).
- `firebase-config.js` — Firebase 설정 객체 export. 사용자가 본인 프로젝트 값으로 채움.
- `mukgit.css` — 올림푸스 하늘 테마 + 시상대 레이아웃 스타일.
- `mukgit.html` — 마크업 골격. CSS/JS 로드. 글쓰기 모달 포함.
- `mukgit.js` — 앱 로직: Firebase 초기화, 실시간 구독, 렌더, 글쓰기/추천/삭제 이벤트, 이미지 압축.
- `firestore.rules` / `storage.rules` — Firebase 보안 규칙 (콘솔에 붙여넣을 텍스트).

---

## Task 1: 순수 유틸 함수 (TDD)

**Files:**
- Create: `package.json`
- Create: `mukgit.utils.js`
- Test: `test/mukgit.utils.test.js`

**Interfaces:**
- Consumes: (없음)
- Produces:
  - `formatPrice(price: number|string) -> string` — 예: `28000` → `"28,000원"`, 숫자 아님 → `""`
  - `validatePostInput(input: {foodName, author, price, storeName, hasImage}) -> {valid: boolean, errors: string[]}`
  - `rankPosts(posts: Array<{votes:number, createdAtMillis:number}>) -> Array` — votes 내림차순, 동률 시 createdAtMillis 내림차순(최신 우선). 원본 불변(복사본 반환).
  - `hasVoted(storage, id: string) -> boolean` — storage는 `getItem`/`setItem`을 가진 객체. localStorage 키 `"mukgit_voted"`에 저장된 id 배열 포함 여부.
  - `markVoted(storage, id: string) -> void` — id를 `"mukgit_voted"` 배열에 추가(중복 없이).

- [ ] **Step 1: 실패하는 테스트 작성**

Create `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Create `test/mukgit.utils.test.js`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPrice,
  validatePostInput,
  rankPosts,
  hasVoted,
  markVoted,
} from "../mukgit.utils.js";

function makeStorage(initial = {}) {
  const m = { ...initial };
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => {
      m[k] = String(v);
    },
    _dump: () => m,
  };
}

test("formatPrice: 숫자를 천단위 콤마 + 원으로", () => {
  assert.equal(formatPrice(28000), "28,000원");
  assert.equal(formatPrice("9000"), "9,000원");
  assert.equal(formatPrice(0), "0원");
});

test("formatPrice: 숫자가 아니면 빈 문자열", () => {
  assert.equal(formatPrice("abc"), "");
  assert.equal(formatPrice(NaN), "");
  assert.equal(formatPrice(undefined), "");
});

test("validatePostInput: 모든 값이 있으면 valid", () => {
  const r = validatePostInput({
    foodName: "피자",
    author: "민수",
    price: "28000",
    storeName: "미도리",
    hasImage: true,
  });
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, []);
});

test("validatePostInput: 누락/잘못된 값 각각 에러", () => {
  const r = validatePostInput({
    foodName: "  ",
    author: "",
    price: "비쌈",
    storeName: "",
    hasImage: false,
  });
  assert.equal(r.valid, false);
  assert.equal(r.errors.length, 5);
});

test("validatePostInput: 음수 가격 거부", () => {
  const r = validatePostInput({
    foodName: "x", author: "y", price: -100, storeName: "z", hasImage: true,
  });
  assert.equal(r.valid, false);
});

test("rankPosts: votes 내림차순 정렬", () => {
  const input = [
    { id: "a", votes: 3, createdAtMillis: 1 },
    { id: "b", votes: 10, createdAtMillis: 2 },
    { id: "c", votes: 7, createdAtMillis: 3 },
  ];
  const out = rankPosts(input);
  assert.deepEqual(out.map((p) => p.id), ["b", "c", "a"]);
});

test("rankPosts: 동률이면 최신(createdAtMillis 큰 것) 우선", () => {
  const input = [
    { id: "old", votes: 5, createdAtMillis: 100 },
    { id: "new", votes: 5, createdAtMillis: 200 },
  ];
  const out = rankPosts(input);
  assert.deepEqual(out.map((p) => p.id), ["new", "old"]);
});

test("rankPosts: 원본 배열을 변경하지 않음", () => {
  const input = [
    { id: "a", votes: 1, createdAtMillis: 1 },
    { id: "b", votes: 2, createdAtMillis: 2 },
  ];
  rankPosts(input);
  assert.deepEqual(input.map((p) => p.id), ["a", "b"]);
});

test("hasVoted / markVoted: 추천 기록", () => {
  const s = makeStorage();
  assert.equal(hasVoted(s, "post1"), false);
  markVoted(s, "post1");
  assert.equal(hasVoted(s, "post1"), true);
  // 중복 마크해도 한 번만
  markVoted(s, "post1");
  assert.equal(JSON.parse(s._dump()["mukgit_voted"]).length, 1);
});

test("hasVoted: 손상된 저장값도 안전 처리", () => {
  const s = makeStorage({ mukgit_voted: "엉터리" });
  assert.equal(hasVoted(s, "x"), false);
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../mukgit.utils.js'`

- [ ] **Step 3: 최소 구현 작성**

Create `mukgit.utils.js`:

```javascript
const VOTED_KEY = "mukgit_voted";

export function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("ko-KR") + "원";
}

export function validatePostInput(input) {
  const errors = [];
  if (!input || !String(input.foodName ?? "").trim()) errors.push("음식 이름을 입력하세요.");
  if (!input || !String(input.author ?? "").trim()) errors.push("작성자 이름을 입력하세요.");
  if (!input || !String(input.storeName ?? "").trim()) errors.push("가게 이름을 입력하세요.");
  const price = Number(input?.price);
  if (!Number.isFinite(price) || price < 0) errors.push("가격은 0 이상의 숫자여야 합니다.");
  if (!input || !input.hasImage) errors.push("사진을 선택하세요.");
  return { valid: errors.length === 0, errors };
}

export function rankPosts(posts) {
  return [...posts].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return (b.createdAtMillis ?? 0) - (a.createdAtMillis ?? 0);
  });
}

function readVoted(storage) {
  const raw = storage.getItem(VOTED_KEY) || "[]";
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function hasVoted(storage, id) {
  return readVoted(storage).includes(id);
}

export function markVoted(storage, id) {
  const ids = readVoted(storage);
  if (!ids.includes(id)) ids.push(id);
  storage.setItem(VOTED_KEY, JSON.stringify(ids));
}
```

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm test`
Expected: PASS — 모든 테스트 통과

- [ ] **Step 5: 커밋**

```bash
git add package.json mukgit.utils.js test/mukgit.utils.test.js
git commit -m "feat: 맛킷리스트 순수 유틸 함수 + 테스트

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Firebase 프로젝트 생성 + 설정 파일

**Files:**
- Create: `firebase-config.js`

**Interfaces:**
- Consumes: (없음)
- Produces: `export const firebaseConfig = { ... }` — `mukgit.js`가 import해서 `initializeApp(firebaseConfig)`에 사용.

이 태스크는 외부(Firebase 콘솔) 수동 작업 + 설정 파일 생성이다.

- [ ] **Step 1: Firebase 프로젝트 생성 (수동)**

브라우저에서 진행:
1. https://console.firebase.google.com 접속 → 구글 계정 로그인
2. "프로젝트 추가" → 이름 예: `mukgit-list` → Google 애널리틱스는 사용 안 함 선택 → 생성
3. 좌측 "빌드 > Firestore Database" → "데이터베이스 만들기" → **프로덕션 모드**로 시작 → 위치 `asia-northeast3 (서울)` 선택
4. 좌측 "빌드 > Storage" → "시작하기" → **프로덕션 모드** → 동일 위치
5. 프로젝트 개요 ⚙️ → "프로젝트 설정" → 하단 "내 앱" → 웹 앱(`</>`) 추가 → 닉네임 `mukgit` → "Firebase Hosting"은 체크 안 함 → 등록
6. 표시되는 `firebaseConfig` 객체 값(apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)을 복사해 둔다.

- [ ] **Step 2: 설정 파일 생성**

Create `firebase-config.js` (복사한 값으로 채움 — 아래는 형식 예시):

```javascript
// Firebase 콘솔 > 프로젝트 설정 > 내 앱 에서 복사한 값으로 채우세요.
// 이 값들은 공개되어도 안전합니다(보안은 보안 규칙으로 통제).
export const firebaseConfig = {
  apiKey: "여기에-apiKey",
  authDomain: "프로젝트.firebaseapp.com",
  projectId: "프로젝트-id",
  storageBucket: "프로젝트.appspot.com",
  messagingSenderId: "여기에-숫자",
  appId: "여기에-appId",
};

// 글 삭제용 관리자 암호 (원하는 값으로 변경). 지인용 단순 보호 수준입니다.
export const ADMIN_PASSWORD = "바꿔주세요";
```

- [ ] **Step 3: 커밋**

```bash
git add firebase-config.js
git commit -m "feat: Firebase 설정 파일 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: HTML 골격 + 올림푸스 테마 CSS

**Files:**
- Create: `mukgit.html`
- Create: `mukgit.css`

**Interfaces:**
- Consumes: `mukgit.css`, (다음 태스크의) `mukgit.js`
- Produces: 아래 DOM 훅(`mukgit.js`가 사용) —
  - `#board` (랭킹 보드 컨테이너), `#empty` (빈 상태), `#status` (로딩/에러 메시지)
  - `#open-write` (글쓰기 열기 버튼), `#write-modal` (모달), `#write-form` (폼)
  - 폼 입력 id: `#f-food`, `#f-author`, `#f-price`, `#f-store`, `#f-image`, `#f-errors`, `#f-submit`, `#f-cancel`

- [ ] **Step 1: HTML 골격 작성**

Create `mukgit.html`:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🏛️ 올림푸스 맛킷리스트</title>
  <link rel="stylesheet" href="mukgit.css" />
</head>
<body>
  <header class="site-header">
    <div class="pillars">▌▐ ▌▐ ▌▐ ▌▐ ▌▐ ▌▐ ▌▐</div>
    <h1>올림푸스 명예의 전당</h1>
    <p class="tagline">맛있게 먹은 음식을 바치고, 추천으로 신전에 올리세요</p>
  </header>

  <main>
    <p id="status" class="status"></p>
    <p id="empty" class="empty" hidden>아직 봉헌된 음식이 없어요. 첫 맛집을 올려보세요! 🍽️</p>
    <section id="board" class="board" aria-live="polite"></section>
  </main>

  <button id="open-write" class="fab" title="맛집 올리기">＋</button>

  <div id="write-modal" class="modal" hidden>
    <form id="write-form" class="modal-card">
      <h2>맛집 봉헌하기</h2>
      <label>음식 이름<input id="f-food" type="text" maxlength="40" /></label>
      <label>작성자 이름<input id="f-author" type="text" maxlength="20" /></label>
      <label>가격(원)<input id="f-price" type="number" min="0" step="100" /></label>
      <label>가게 이름<input id="f-store" type="text" maxlength="40" /></label>
      <label>사진<input id="f-image" type="file" accept="image/*" /></label>
      <ul id="f-errors" class="errors"></ul>
      <div class="modal-actions">
        <button type="button" id="f-cancel" class="btn-ghost">취소</button>
        <button type="submit" id="f-submit" class="btn-gold">봉헌</button>
      </div>
    </form>
  </div>

  <script type="module" src="mukgit.js"></script>
</body>
</html>
```

- [ ] **Step 2: CSS 작성 (하늘빛 + 구름 흰색 + 시상대)**

Create `mukgit.css`:

```css
:root {
  --bg-top: #eaf4ff;
  --bg-bottom: #dbeaff;
  --card: #ffffff;
  --ink: #2a3a4a;
  --accent: #1f5fa6;
  --gold: #f0c14b;
  --gold-deep: #a6781a;
  --line: #cfe2f7;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "Georgia", "Nanum Myeongjo", serif;
  color: var(--ink);
  background: linear-gradient(180deg, var(--bg-top), var(--bg-bottom));
  min-height: 100vh;
}
.site-header { text-align: center; padding: 28px 16px 12px; }
.site-header .pillars { color: #5a8fd0; letter-spacing: 4px; font-size: 13px; }
.site-header h1 { color: var(--accent); margin: 8px 0 4px; font-size: 28px; }
.site-header .tagline { color: #5a7799; margin: 0; font-size: 14px; }
main { max-width: 960px; margin: 0 auto; padding: 8px 16px 80px; }
.status, .empty { text-align: center; color: #5a7799; }

/* 시상대: 1위 중앙 크게, 2·3위 양옆 */
.podium { display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 12px; align-items: end; margin-bottom: 18px; }
.grid-rest { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }

.post {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(80, 120, 180, 0.12);
  display: flex; flex-direction: column;
}
.post.rank-1 { border: 2px solid var(--gold); box-shadow: 0 4px 14px rgba(240, 193, 75, 0.35); }
.post .photo { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #cfe2f7; }
.post .body { padding: 10px 12px; }
.post .crown { font-size: 18px; }
.post .fname { font-weight: bold; color: var(--accent); margin: 4px 0 2px; }
.post.rank-1 .fname { font-size: 20px; }
.post .sub { font-size: 12px; color: #7a8aa0; }
.post .footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-top: 1px solid var(--line); }
.vote-btn {
  background: #fdf0c8; color: var(--gold-deep); border: none;
  border-radius: 20px; padding: 4px 12px; cursor: pointer; font-size: 13px;
}
.vote-btn:disabled { opacity: 0.55; cursor: default; }
.del-btn { background: none; border: none; cursor: pointer; color: #b9bfc8; font-size: 14px; }

/* 글쓰기 버튼 + 모달 */
.fab {
  position: fixed; right: 22px; bottom: 22px; width: 56px; height: 56px;
  border-radius: 50%; border: none; background: var(--accent); color: #fff;
  font-size: 30px; cursor: pointer; box-shadow: 0 4px 12px rgba(31, 95, 166, 0.4);
}
.modal {
  position: fixed; inset: 0; background: rgba(31, 60, 100, 0.35);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal[hidden] { display: none; }
.modal-card {
  background: #fff; border-radius: 14px; padding: 20px; width: 100%; max-width: 380px;
  display: flex; flex-direction: column; gap: 10px;
}
.modal-card h2 { color: var(--accent); margin: 0 0 4px; text-align: center; }
.modal-card label { display: flex; flex-direction: column; font-size: 13px; gap: 4px; color: #5a7799; }
.modal-card input { padding: 8px; border: 1px solid var(--line); border-radius: 8px; font-size: 14px; }
.errors { color: #c0392b; font-size: 12px; margin: 0; padding-left: 18px; }
.errors:empty { display: none; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; }
.btn-gold { background: var(--gold); color: var(--gold-deep); border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-weight: bold; }
.btn-ghost { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 8px 16px; cursor: pointer; }

@media (max-width: 560px) {
  .podium { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: 브라우저에서 수동 확인**

`mukgit.html`을 브라우저로 연다 (파일 더블클릭 또는 VSCode Live Server).
Expected:
- 하늘빛 배경, 가운데 "올림푸스 명예의 전당" 제목과 기둥 장식
- "아직 봉헌된 음식이 없어요" 빈 상태는 아직 숨김 상태(`hidden`)라 안 보여도 정상
- 우측 하단 파란 ＋ 버튼이 보임
- ＋ 클릭은 아직 동작 안 함(정상 — JS 미구현)

> 콘솔에 `mukgit.js 404` 에러는 다음 태스크에서 파일을 만들면 사라짐.

- [ ] **Step 4: 커밋**

```bash
git add mukgit.html mukgit.css
git commit -m "feat: 맛킷리스트 HTML 골격 + 올림푸스 테마 CSS

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Firebase 초기화 + 랭킹 보드 실시간 렌더

**Files:**
- Create: `mukgit.js`

**Interfaces:**
- Consumes: `firebaseConfig`, `ADMIN_PASSWORD` (firebase-config.js); `rankPosts`, `formatPrice`, `hasVoted`, `markVoted` (mukgit.utils.js); Task 3의 DOM 훅.
- Produces: 전역 모듈 스코프 함수 `renderBoard(posts)`, Firestore 핸들 `db`, `storage`, `postsCol`. (추천/글쓰기/삭제는 다음 태스크에서 같은 파일에 추가)

이 태스크는 "읽기 + 렌더"까지. 추천/글쓰기/삭제 버튼은 자리만 만들고 동작은 다음 태스크.

- [ ] **Step 1: mukgit.js 작성 (초기화 + 구독 + 렌더)**

Create `mukgit.js`:

```javascript
import { firebaseConfig, ADMIN_PASSWORD } from "./firebase-config.js";
import { rankPosts, formatPrice, hasVoted, markVoted } from "./mukgit.utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, increment, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const postsCol = collection(db, "posts");

const $ = (sel) => document.querySelector(sel);
const boardEl = $("#board");
const emptyEl = $("#empty");
const statusEl = $("#status");

function postToView(docSnap) {
  const d = docSnap.data();
  const created = d.createdAt && typeof d.createdAt.toMillis === "function"
    ? d.createdAt.toMillis() : 0;
  return {
    id: docSnap.id,
    foodName: d.foodName ?? "",
    author: d.author ?? "",
    price: d.price ?? 0,
    storeName: d.storeName ?? "",
    imageUrl: d.imageUrl ?? "",
    votes: d.votes ?? 0,
    imagePath: d.imagePath ?? "",
    createdAtMillis: created,
  };
}

function postCardHTML(p, rank) {
  const crown = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const voted = hasVoted(localStorage, p.id);
  return `
    <article class="post rank-${rank}" data-id="${p.id}" data-path="${p.imagePath}">
      <img class="photo" src="${p.imageUrl}" alt="${escapeHtml(p.foodName)}" loading="lazy" />
      <div class="body">
        <span class="crown">${crown}</span>
        <div class="fname">${escapeHtml(p.foodName)}</div>
        <div class="sub">${escapeHtml(p.storeName)} · ${formatPrice(p.price)}</div>
        <div class="sub">by ${escapeHtml(p.author)}</div>
      </div>
      <div class="footer">
        <button class="vote-btn" data-action="vote" ${voted ? "disabled" : ""}>▲ ${p.votes}</button>
        <button class="del-btn" data-action="del" title="삭제">🗑️</button>
      </div>
    </article>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderBoard(posts) {
  const ranked = rankPosts(posts);
  emptyEl.hidden = ranked.length > 0;
  if (ranked.length === 0) { boardEl.innerHTML = ""; return; }

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  // 시상대: 2위(왼), 1위(가운데), 3위(오른) 순서로 배치
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHTML = podiumOrder
    .map((p) => postCardHTML(p, ranked.indexOf(p) + 1))
    .join("");
  const restHTML = rest.map((p) => postCardHTML(p, ranked.indexOf(p) + 1)).join("");

  boardEl.innerHTML =
    `<div class="podium">${podiumHTML}</div>` +
    (restHTML ? `<div class="grid-rest">${restHTML}</div>` : "");
}

// 실시간 구독
statusEl.textContent = "불러오는 중...";
onSnapshot(postsCol, (snap) => {
  statusEl.textContent = "";
  const posts = snap.docs.map(postToView);
  renderBoard(posts);
}, (err) => {
  console.error(err);
  statusEl.textContent = "목록을 불러오지 못했어요. 새로고침해 주세요.";
});

// 다음 태스크에서 사용할 핸들 export 대용 (모듈 스코프 유지)
export { db, storage, postsCol, renderBoard, escapeHtml };
```

- [ ] **Step 2: 보안 규칙 임시 허용 (수동, 테스트용)**

Firestore에서 데이터를 읽으려면 규칙이 필요하다. Firebase 콘솔 > Firestore Database > 규칙 탭에 임시로 붙여넣고 게시(Task 7에서 최종본으로 교체):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{id} {
      allow read, write: if true;
    }
  }
}
```

Storage > 규칙 탭에도 임시로:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} { allow read, write: if true; }
  }
}
```

- [ ] **Step 3: 시드 데이터로 렌더 확인 (수동)**

Firebase 콘솔 > Firestore Database > `posts` 컬렉션 수동 생성 후 문서 2~3개 추가. 각 문서 필드:
- `foodName`(string), `author`(string), `price`(number), `storeName`(string), `votes`(number), `imageUrl`(string: 아무 이미지 URL 예 `https://picsum.photos/400/300`), `imagePath`(string: 빈 값 `""`), `createdAt`(timestamp: 현재시각)

`mukgit.html`을 브라우저에서 연다.
Expected:
- votes 가장 높은 글이 가운데 큰 카드(👑)로, 나머지가 양옆/아래에 표시
- 가격이 `28,000원` 형식으로 표시
- ▲ 버튼과 🗑️ 버튼이 보임(아직 클릭 동작은 다음 태스크)
- 콘솔 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add mukgit.js
git commit -m "feat: Firebase 연동 + 랭킹 보드 실시간 렌더

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 글쓰기 (모달 + 이미지 압축 + 업로드 + 저장)

**Files:**
- Modify: `mukgit.js` (이벤트/함수 추가)

**Interfaces:**
- Consumes: Task 4의 `db`, `storage`, `postsCol`, `escapeHtml`; `validatePostInput` (utils); Task 3 폼 DOM 훅.
- Produces: `compressImage(file) -> Promise<Blob>`; 글쓰기 제출 핸들러 (Firestore에 `{foodName, author, price, storeName, imageUrl, imagePath, votes:0, createdAt}` 문서 생성).

- [ ] **Step 1: 글쓰기 로직 추가**

`mukgit.js` 맨 아래(`export {...}` 줄 **앞**)에 추가:

```javascript
import { validatePostInput } from "./mukgit.utils.js";

const modal = $("#write-modal");
const form = $("#write-form");
const errorsEl = $("#f-errors");
const submitBtn = $("#f-submit");

$("#open-write").addEventListener("click", () => { modal.hidden = false; });
$("#f-cancel").addEventListener("click", () => closeModal());
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.hidden = true;
  form.reset();
  errorsEl.innerHTML = "";
}

// 이미지를 최대 1000px로 리사이즈 + JPEG 압축
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1000;
      let { width, height } = img;
      if (width > max || height > max) {
        const scale = Math.min(max / width, max / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("압축 실패"))),
        "image/jpeg", 0.8
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지 로드 실패")); };
    img.src = url;
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = $("#f-image").files[0];
  const input = {
    foodName: $("#f-food").value,
    author: $("#f-author").value,
    price: $("#f-price").value,
    storeName: $("#f-store").value,
    hasImage: !!file,
  };
  const { valid, errors } = validatePostInput(input);
  errorsEl.innerHTML = errors.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "봉헌 중...";
  try {
    const blob = await compressImage(file);
    const path = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    const imageUrl = await getDownloadURL(storageRef);
    await addDoc(postsCol, {
      foodName: input.foodName.trim(),
      author: input.author.trim(),
      price: Number(input.price),
      storeName: input.storeName.trim(),
      imageUrl,
      imagePath: path,
      votes: 0,
      createdAt: serverTimestamp(),
    });
    closeModal();
  } catch (err) {
    console.error(err);
    errorsEl.innerHTML = `<li>저장에 실패했어요. 다시 시도해 주세요.</li>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "봉헌";
  }
});
```

- [ ] **Step 2: 브라우저에서 수동 확인**

`mukgit.html` 새로고침 → ＋ 버튼 클릭 → 폼 작성.
Expected:
- 빈 값으로 "봉헌" → 빨간 에러 목록 표시, 저장 안 됨
- 사진 + 모든 값 입력 후 "봉헌" → "봉헌 중..." 후 모달 닫힘, 새 카드가 보드에 즉시 나타남(실시간)
- Firebase 콘솔 Storage에 압축된 jpg 업로드 확인, Firestore에 새 문서 확인

- [ ] **Step 3: 커밋**

```bash
git add mukgit.js
git commit -m "feat: 글쓰기 모달 + 이미지 압축 업로드 + 저장

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 추천 + 삭제 이벤트

**Files:**
- Modify: `mukgit.js` (보드 클릭 위임 핸들러 추가)

**Interfaces:**
- Consumes: Task 4의 `db`, `postsCol`, `boardEl`; `storage`; `hasVoted`, `markVoted` (utils); `ADMIN_PASSWORD`; `increment`, `updateDoc`, `deleteDoc`, `doc`, `ref`, `deleteObject`.
- Produces: 보드 이벤트 위임 핸들러 (추천 +1 / 기기별 1회, 삭제 = 암호 확인 후 문서+사진 삭제).

- [ ] **Step 1: 추천/삭제 핸들러 추가**

`mukgit.js`의 `export {...}` 줄 **앞**에 추가:

```javascript
boardEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const card = btn.closest(".post");
  const id = card.dataset.id;

  if (btn.dataset.action === "vote") {
    if (hasVoted(localStorage, id)) return;
    btn.disabled = true;
    try {
      await updateDoc(doc(db, "posts", id), { votes: increment(1) });
      markVoted(localStorage, id);
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      alert("추천에 실패했어요. 다시 시도해 주세요.");
    }
    return;
  }

  if (btn.dataset.action === "del") {
    const pw = prompt("관리자 암호를 입력하세요:");
    if (pw === null) return;
    if (pw !== ADMIN_PASSWORD) { alert("암호가 일치하지 않습니다."); return; }
    try {
      const path = card.dataset.path;
      if (path) await deleteObject(ref(storage, path)).catch(() => {});
      await deleteDoc(doc(db, "posts", id));
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했어요.");
    }
  }
});
```

- [ ] **Step 2: 브라우저에서 수동 확인**

`mukgit.html` 새로고침.
Expected:
- ▲ 버튼 클릭 → 숫자 +1, 버튼 비활성화. 새로고침해도 같은 글은 다시 추천 불가(localStorage)
- 추천수가 바뀌면 순위/시상대 위치가 자동으로 갱신됨
- 🗑️ 클릭 → 암호 입력창. 틀리면 "일치하지 않습니다", 맞으면 카드(+사진) 사라짐
- 다른 브라우저(또는 시크릿창)에서 열면 같은 글/추천수가 보임(공유 확인)

- [ ] **Step 3: 커밋**

```bash
git add mukgit.js
git commit -m "feat: 추천(기기별 1회) + 관리자 암호 삭제

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Firebase 보안 규칙 확정

**Files:**
- Create: `firestore.rules`
- Create: `storage.rules`

**Interfaces:**
- Consumes: (없음)
- Produces: Firebase 콘솔에 붙여넣을 최종 규칙. 리포에도 기록으로 보관.

- [ ] **Step 1: 규칙 파일 작성**

Create `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{id} {
      allow read: if true;

      // 생성: 필수 필드 형식 검증, votes는 0으로 시작
      allow create: if request.resource.data.foodName is string
        && request.resource.data.author is string
        && request.resource.data.storeName is string
        && request.resource.data.price is number
        && request.resource.data.imageUrl is string
        && request.resource.data.votes == 0;

      // 수정: votes를 1 증가시키는 것만 허용 (다른 필드 변경 차단)
      allow update: if request.resource.data.votes == resource.data.votes + 1
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votes']);

      // 삭제: 클라이언트에서 막음 (화면단 관리자 암호로만 수행 → 규칙은 허용)
      // 지인용 단순 보호 수준. 더 엄격히 하려면 Firebase Auth 도입 필요.
      allow delete: if true;
    }
  }
}
```

Create `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{file} {
      allow read: if true;
      // 5MB 이하 이미지 업로드만 허용
      allow create: if request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow delete: if true;
    }
  }
}
```

> 참고: `delete: if true`는 누구나 삭제 가능하다는 뜻이지만, 화면에는 관리자 암호 통과 후에만 삭제 버튼 동작이 실행된다. 규칙 수준의 엄격한 삭제 통제가 필요하면 향후 Firebase Auth(관리자 계정)로 확장한다. 이는 설계 문서의 보안 방침과 일치한다.

- [ ] **Step 2: 콘솔에 규칙 게시 (수동)**

- Firestore Database > 규칙 → `firestore.rules` 내용으로 교체 → "게시"
- Storage > 규칙 → `storage.rules` 내용으로 교체 → "게시"

- [ ] **Step 3: 규칙 동작 수동 확인**

`mukgit.html`에서:
- 글쓰기(create) 정상 동작 확인
- 추천(votes +1) 정상 동작 확인
- 삭제 정상 동작 확인
- (선택) 브라우저 콘솔에서 임의 필드 수정 시도가 거부되는지 확인

- [ ] **Step 4: 커밋**

```bash
git add firestore.rules storage.rules
git commit -m "feat: Firebase 보안 규칙 확정

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: GitHub Pages 배포 + 최종 점검

**Files:**
- (코드 변경 없음 — 배포/검증)

**Interfaces:**
- Consumes: 전체 결과물
- Produces: 공개 URL `https://<사용자>.github.io/<리포>/mukgit.html`

- [ ] **Step 1: 푸시 + Pages 설정 확인**

```bash
git push
```

GitHub 리포 > Settings > Pages 에서 소스가 `main` 브랜치 루트로 설정돼 있는지 확인(포트폴리오가 이미 배포 중이면 그대로 사용).

- [ ] **Step 2: 배포 URL에서 전종 흐름 수동 점검**

`https://<사용자>.github.io/<리포>/mukgit.html` 접속 후 체크리스트:
- [ ] 글 작성 → 목록 즉시 반영
- [ ] 추천 +1, 같은 기기 재추천 차단
- [ ] 추천수에 따라 시상대 순위/크기 변경
- [ ] 관리자 암호 삭제(맞을 때만)
- [ ] 다른 기기/브라우저에서 같은 데이터 보임
- [ ] 모바일 폭에서 레이아웃 정상(시상대 1열로 변환)

- [ ] **Step 3: 최종 확인 커밋(필요 시)**

문제 발견 시 수정 후 커밋/푸시. 없으면 이 단계 생략.

---

## Self-Review 결과

- **Spec 커버리지:** 데이터저장(Task 2,4,5), 글쓰기 5개 필드+사진(Task 3,5), 추천 기기별 1회(Task 1,6), 랭킹 시상대 표시(Task 1,4), 삭제 관리자암호(Task 6), 색감/레이아웃(Task 3), 보안규칙(Task 7), GitHub Pages 배포(Task 8), 에러처리(Task 4,5,6), 수동 테스트 항목(Task 8) — 모두 매핑됨.
- **Placeholder 스캔:** firebase-config.js의 자리값은 사용자 비밀값이므로 의도된 빈칸(설명 포함). 그 외 모든 코드 단계는 실제 코드 포함.
- **타입 일관성:** `rankPosts`는 `createdAtMillis` 사용 → `postToView`가 `createdAtMillis` 생성으로 일치. DOM id(`#f-food` 등), 함수명(`compressImage`, `renderBoard`, `escapeHtml`) 전 태스크 일관.
