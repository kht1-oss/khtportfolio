# 맛킷리스트 구글 로그인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 로그인을 추가해 글쓰기·추천을 로그인 사용자로 제한하고, 추천을 계정별 1표로, 삭제를 작성자 본인·관리자로 통제한다.

**Architecture:** Firebase Auth(구글 팝업)를 클라이언트에서 사용. 글에 `ownerUid`/`voters`를 저장하고, 권한 판단 순수 함수(`hasUserVoted`, `canDeletePost`)는 `mukgit.utils.js`에 두고 TDD. 로그인 상태(`onAuthStateChanged`)가 바뀌면 보드를 다시 렌더. 보안 규칙이 서버에서 권한을 강제.

**Tech Stack:** HTML, CSS, Vanilla JS(ES Modules), Firebase v10 modular SDK(앱/Firestore/Auth, CDN), Node `node --test`. 로컬 확인: `python -m http.server 8000 --bind 127.0.0.1`을 `z:/NewClaude`에서 실행 후 `http://localhost:8000/mukgit.html`.

## Global Constraints

- 보기는 비로그인 자유. 글쓰기·추천은 로그인 필요.
- 작성자 이름은 **직접 입력 유지**(자동 안 함). 글엔 **`ownerUid`만** 저장하고 **이메일은 저장하지 않는다**.
- 추천은 **계정별 1회**(글의 `voters`에 uid 기록). 기존 localStorage 기기별 추천 로직은 제거.
- 삭제 권한: 작성자 본인(`ownerUid == uid`) 또는 관리자 이메일 `khtc0228@gmail.com`.
- 기존 관리자 암호 `ADMIN_PASSWORD`(kht1235) 방식은 제거.
- 기존 디자인(분홍/하트/시상대)·이미지 압축 로직은 변경 없음.
- 커밋 메시지는 간결한 한 줄 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- `mukgit.utils.js` — 순수 함수. `hasVoted`/`markVoted` 제거, `hasUserVoted`/`canDeletePost` 추가.
- `test/mukgit.utils.test.js` — 위 변경에 맞춰 테스트 교체.
- `firebase-config.js` — `ADMIN_PASSWORD` 제거, `ADMIN_EMAIL` 추가.
- `mukgit.html` — 헤더에 로그인 영역 요소 추가.
- `mukgit.css` — 로그인/로그아웃 버튼 스타일.
- `mukgit.js` — Auth 초기화·상태구독·로그인/로그아웃, 글쓰기·추천·삭제 로직 전면 갱신.
- `firestore.rules` — 로그인/소유권 기반 규칙으로 교체.

> 주의: Task 1에서 `mukgit.utils.js`의 `hasVoted`/`markVoted`를 제거하면, 아직 그 함수를 import하는 `mukgit.js`(Task 4에서 갱신) 때문에 **브라우저에서 앱이 일시적으로 안 뜬다. 이는 브랜치 작업 중 예상된 상태이며 Task 4에서 해소된다.** Task 1~3의 검증은 `node --test`/`node --check`로 한다(라이브에는 영향 없음).

---

## Task 1: 권한 판단 순수 함수 교체 (TDD)

**Files:**
- Modify: `mukgit.utils.js`
- Modify: `test/mukgit.utils.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `hasUserVoted(post, user) -> boolean` — `user`가 있고 `post.voters`(배열)에 `user.uid`가 포함되면 true.
  - `canDeletePost(post, user, adminEmail) -> boolean` — `user`가 있고 (`post.ownerUid === user.uid` 또는 `user.email === adminEmail`)면 true.
  - 제거: `hasVoted`, `markVoted`.
  - 유지: `formatPrice`, `validatePostInput`, `rankPosts`.

- [ ] **Step 1: 테스트 파일을 새 함수에 맞게 교체**

`test/mukgit.utils.test.js`에서:
1. import 줄을 아래로 교체:

```javascript
import {
  formatPrice,
  validatePostInput,
  rankPosts,
  hasUserVoted,
  canDeletePost,
} from "../mukgit.utils.js";
```

2. `makeStorage` 헬퍼 함수와, `hasVoted`/`markVoted`를 다루는 기존 두 테스트(`"hasVoted / markVoted: 추천 기록"`, `"hasVoted: 손상된 저장값도 안전 처리"`)를 **삭제**한다.

3. 파일 끝에 아래 테스트를 추가:

```javascript
test("hasUserVoted: voters에 내 uid가 있으면 true", () => {
  assert.equal(hasUserVoted({ voters: ["u1", "u2"] }, { uid: "u1" }), true);
});

test("hasUserVoted: voters에 없으면 false", () => {
  assert.equal(hasUserVoted({ voters: ["u2"] }, { uid: "u1" }), false);
});

test("hasUserVoted: 비로그인/voters 없음은 false (안전)", () => {
  assert.equal(hasUserVoted({ voters: ["u1"] }, null), false);
  assert.equal(hasUserVoted({}, { uid: "u1" }), false);
});

test("canDeletePost: 소유자면 true", () => {
  assert.equal(
    canDeletePost({ ownerUid: "u1" }, { uid: "u1", email: "a@b.c" }, "admin@x.com"),
    true
  );
});

test("canDeletePost: 관리자 이메일이면 true", () => {
  assert.equal(
    canDeletePost({ ownerUid: "u2" }, { uid: "u1", email: "admin@x.com" }, "admin@x.com"),
    true
  );
});

test("canDeletePost: 남의 글이면 false", () => {
  assert.equal(
    canDeletePost({ ownerUid: "u2" }, { uid: "u1", email: "a@b.c" }, "admin@x.com"),
    false
  );
});

test("canDeletePost: 비로그인은 false", () => {
  assert.equal(canDeletePost({ ownerUid: "u1" }, null, "admin@x.com"), false);
});
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run: `npm test`
Expected: FAIL — `hasUserVoted`/`canDeletePost`가 export되지 않아 실패.

- [ ] **Step 3: 유틸에서 옛 함수 제거 + 새 함수 추가**

`mukgit.utils.js`에서:
1. `const VOTED_KEY = ...`, `readVoted`, `hasVoted`, `markVoted` 를 **삭제**한다.
2. 파일 끝에 아래를 추가:

```javascript
export function hasUserVoted(post, user) {
  return !!user && Array.isArray(post?.voters) && post.voters.includes(user.uid);
}

export function canDeletePost(post, user, adminEmail) {
  if (!user) return false;
  return post?.ownerUid === user.uid || user.email === adminEmail;
}
```

(`formatPrice`, `validatePostInput`, `rankPosts`는 그대로 둔다.)

- [ ] **Step 4: 테스트 실행해서 통과 확인**

Run: `npm test`
Expected: PASS — 전체 통과.

- [ ] **Step 5: 커밋**

```bash
git add mukgit.utils.js test/mukgit.utils.test.js
git commit -m "feat: 권한 판단 함수(hasUserVoted/canDeletePost) 추가, 기기별 추천 함수 제거

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 헤더 로그인 UI (HTML + CSS)

**Files:**
- Modify: `mukgit.html`
- Modify: `mukgit.css`

**Interfaces:**
- Consumes: 없음
- Produces: DOM 훅 `#login-btn`, `#user-area`, `#user-name`, `#logout-btn` (Task 4의 `mukgit.js`가 사용). 기본은 로그아웃 상태 모양(로그인 버튼 보임, 사용자 영역 hidden).

- [ ] **Step 1: 헤더에 로그인 영역 추가**

`mukgit.html`의 `<header class="site-header">` 안, `<div class="pillars">` **위**에 추가:

```html
    <div class="auth">
      <button id="login-btn" class="login-btn">구글로 로그인</button>
      <span id="user-area" class="user-area" hidden>
        <span id="user-name"></span>
        <button id="logout-btn" class="logout-btn">로그아웃</button>
      </span>
    </div>
```

- [ ] **Step 2: 로그인 영역 스타일 추가**

`mukgit.css`의 `.site-header { ... }` 규칙에 `position: relative;`를 추가하고(예: `.site-header { text-align: center; padding: 28px 16px 12px; position: relative; }`), 그 아래에 다음을 추가:

```css
.auth {
  position: absolute; top: 14px; right: 14px;
  display: flex; align-items: center; gap: 8px;
  font-family: "Helvetica Neue", sans-serif;
}
.login-btn, .logout-btn {
  border: 1px solid #f3cdde; background: #fff0f5; color: #c2487a;
  border-radius: 20px; padding: 6px 12px; font-size: 13px; cursor: pointer;
}
.login-btn:hover, .logout-btn:hover { background: #ffe3ee; }
.user-area { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #b07a93; }
.user-area[hidden] { display: none; }
```

- [ ] **Step 3: 확인 (정적)**

`mukgit.html`을 텍스트로 열어 `#login-btn`, `#user-area`, `#user-name`, `#logout-btn`가 존재하는지 확인. (앱 동작은 Task 4 이후 브라우저에서 확인 — 지금은 mukgit.js가 일시적으로 미작동 상태일 수 있음.)

- [ ] **Step 4: 커밋**

```bash
git add mukgit.html mukgit.css
git commit -m "feat: 헤더 로그인/로그아웃 UI 요소 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 설정 파일 — 관리자 이메일

**Files:**
- Modify: `firebase-config.js`

**Interfaces:**
- Consumes: 없음
- Produces: `export const ADMIN_EMAIL = "khtc0228@gmail.com";`. `ADMIN_PASSWORD` export 제거.

- [ ] **Step 1: ADMIN_PASSWORD 제거, ADMIN_EMAIL 추가**

`firebase-config.js`에서 아래 줄을 교체.

기존:
```javascript
// 글 삭제용 관리자 암호 (원하는 값으로 변경). 지인용 단순 보호 수준입니다.
export const ADMIN_PASSWORD = "kht1235";
```

신규:
```javascript
// 관리자(전체 글 삭제 가능) 구글 계정 이메일. 로그인한 본인 이메일과 비교한다.
export const ADMIN_EMAIL = "khtc0228@gmail.com";
```

(`firebaseConfig`는 그대로 둔다.)

- [ ] **Step 2: 커밋**

```bash
git add firebase-config.js
git commit -m "feat: 관리자 식별을 암호에서 이메일(ADMIN_EMAIL)로 교체

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: mukgit.js 로그인 통합 (핵심)

**Files:**
- Modify: `mukgit.js` (전체 교체)

**Interfaces:**
- Consumes: `firebaseConfig`, `ADMIN_EMAIL`(config); `rankPosts`, `formatPrice`, `validatePostInput`, `hasUserVoted`, `canDeletePost`(utils); Task 2의 DOM 훅; 기존 글쓰기/보드 DOM 훅.
- Produces: 완성된 앱 동작. 모듈 변수 `currentUser`, `latestPosts`; 글 문서에 `ownerUid`, `voters` 기록.

- [ ] **Step 1: mukgit.js 전체를 아래 내용으로 교체**

`mukgit.js` 전체를 다음으로 교체한다(이미지 압축 로직은 동일하게 포함됨):

```javascript
import { firebaseConfig, ADMIN_EMAIL } from "./firebase-config.js";
import { rankPosts, formatPrice, validatePostInput, hasUserVoted, canDeletePost } from "./mukgit.utils.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, increment, arrayUnion, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const postsCol = collection(db, "posts");

let currentUser = null;
let latestPosts = [];

// 사진은 Firestore 문서 안에 data URL(base64)로 직접 저장한다(Storage 미사용).
const MAX_IMAGE_DIM = 1000;
const MAX_IMAGE_BYTES = 900 * 1024; // 약 900KB — 나머지 필드 여유 확보

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
    price: Number(d.price ?? 0),
    storeName: d.storeName ?? "",
    imageUrl: d.imageUrl ?? "",
    votes: Number(d.votes ?? 0),
    ownerUid: d.ownerUid ?? "",
    voters: Array.isArray(d.voters) ? d.voters : [],
    createdAtMillis: created,
  };
}

function postCardHTML(p, rank) {
  const crown = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const voted = hasUserVoted(p, currentUser);
  const canDelete = canDeletePost(p, currentUser, ADMIN_EMAIL);
  return `
    <article class="post rank-${rank}" data-id="${escapeHtml(p.id)}">
      <img class="photo" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.foodName)}" loading="lazy" />
      <div class="body">
        <span class="crown">${crown}</span>
        <div class="fname">${escapeHtml(p.foodName)}</div>
        <div class="sub">${escapeHtml(p.storeName)} · ${formatPrice(p.price)}</div>
        <div class="sub">by ${escapeHtml(p.author)}</div>
      </div>
      <div class="footer">
        <button class="vote-btn ${voted ? "voted" : ""}" data-action="vote" ${voted ? "disabled" : ""}>${voted ? "❤️" : "🤍"} ${p.votes}</button>
        ${canDelete ? `<button class="del-btn" data-action="del" title="삭제">🗑️</button>` : ""}
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

// ---- 로그인 ----
const loginBtn = $("#login-btn");
const logoutBtn = $("#logout-btn");
const userArea = $("#user-area");
const userName = $("#user-name");

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    alert("로그인에 실패했어요. 다시 시도해 주세요.");
  }
});
logoutBtn.addEventListener("click", () => signOut(auth));

function updateAuthUI() {
  if (currentUser) {
    loginBtn.hidden = true;
    userArea.hidden = false;
    userName.textContent = currentUser.displayName || "사용자";
  } else {
    loginBtn.hidden = false;
    userArea.hidden = true;
  }
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI();
  renderBoard(latestPosts);
});

// ---- 실시간 구독 ----
statusEl.textContent = "불러오는 중...";
onSnapshot(postsCol, (snap) => {
  statusEl.textContent = "";
  latestPosts = snap.docs.map(postToView);
  renderBoard(latestPosts);
}, (err) => {
  console.error(err);
  statusEl.textContent = "목록을 불러오지 못했어요. 새로고침해 주세요.";
});

// ---- 글쓰기 모달 ----
const modal = $("#write-modal");
const form = $("#write-form");
const errorsEl = $("#f-errors");
const submitBtn = $("#f-submit");

$("#open-write").addEventListener("click", () => {
  if (!currentUser) { alert("글을 올리려면 먼저 구글 로그인해 주세요."); return; }
  modal.hidden = false;
});
$("#f-cancel").addEventListener("click", () => closeModal());
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function closeModal() {
  modal.hidden = true;
  form.reset();
  errorsEl.innerHTML = "";
}

// 이미지를 리사이즈 + JPEG 압축해서 data URL(base64 문자열)로 반환한다.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const scale = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      const render = () => {
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      };
      render();

      let quality = 0.8;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let guard = 0;
      while (dataUrl.length > MAX_IMAGE_BYTES && guard < 12) {
        guard++;
        if (quality > 0.4) {
          quality = Math.round((quality - 0.1) * 10) / 10;
        } else {
          width = Math.round(width * 0.85);
          height = Math.round(height * 0.85);
          render();
          quality = 0.7;
        }
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      if (dataUrl.length > MAX_IMAGE_BYTES) {
        reject(new Error("이미지가 너무 큽니다. 더 작은 사진을 사용해 주세요."));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("이미지를 불러오지 못했어요.")); };
    img.src = url;
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) { errorsEl.innerHTML = `<li>로그인 후 이용해 주세요.</li>`; return; }
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
    const imageUrl = await compressImage(file);
    await addDoc(postsCol, {
      foodName: input.foodName.trim(),
      author: input.author.trim(),
      price: Number(input.price),
      storeName: input.storeName.trim(),
      imageUrl,
      votes: 0,
      voters: [],
      ownerUid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    closeModal();
  } catch (err) {
    console.error(err);
    errorsEl.innerHTML = `<li>${escapeHtml(err.message || "저장에 실패했어요. 다시 시도해 주세요.")}</li>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "봉헌";
  }
});

// ---- 추천 / 삭제 ----
boardEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const card = btn.closest(".post");
  if (!card) return;
  const id = card.dataset.id;

  if (btn.dataset.action === "vote") {
    if (!currentUser) { alert("추천하려면 먼저 구글 로그인해 주세요."); return; }
    const post = latestPosts.find((p) => p.id === id);
    if (post && hasUserVoted(post, currentUser)) return;
    btn.disabled = true;
    try {
      await updateDoc(doc(db, "posts", id), {
        votes: increment(1),
        voters: arrayUnion(currentUser.uid),
      });
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      alert("추천에 실패했어요. 다시 시도해 주세요.");
    }
    return;
  }

  if (btn.dataset.action === "del") {
    if (!confirm("이 글을 삭제할까요?")) return;
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (err) {
      console.error(err);
      alert("삭제에 실패했어요.");
    }
  }
});
```

- [ ] **Step 2: 문법 검사**

Run: `node --check mukgit.js`
Expected: 출력 없음(문법 오류 없음).

- [ ] **Step 3: 커밋**

```bash
git add mukgit.js
git commit -m "feat: 구글 로그인 통합 + 계정별 추천 + 소유권 기반 삭제

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Firestore 보안 규칙 교체

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: 없음
- Produces: 콘솔에 붙여넣을 최종 규칙(로그인/소유권 기반).

- [ ] **Step 1: 규칙 파일 교체**

`firestore.rules` 전체를 아래로 교체:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{id} {
      allow read: if true;

      // 생성: 로그인 + 본인을 소유자로 + votes 0 + voters 빈 배열 + 필수 필드 형식
      allow create: if request.auth != null
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.votes == 0
        && request.resource.data.voters == []
        && request.resource.data.foodName is string
        && request.resource.data.author is string
        && request.resource.data.storeName is string
        && request.resource.data.price is number
        && request.resource.data.imageUrl is string;

      // 추천: 로그인 + votes 1 증가 + voters에 내 uid 한 번만 추가 + 그 외 필드 불변
      allow update: if request.auth != null
        && request.resource.data.votes == resource.data.votes + 1
        && !(request.auth.uid in resource.data.get('voters', []))
        && (request.auth.uid in request.resource.data.voters)
        && request.resource.data.voters.size() == resource.data.get('voters', []).size() + 1
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votes', 'voters']);

      // 삭제: 글 소유자 본인 또는 관리자 이메일
      allow delete: if request.auth != null
        && (request.auth.uid == resource.data.get('ownerUid', '')
            || request.auth.token.email == 'khtc0228@gmail.com');
    }
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add firestore.rules
git commit -m "feat: 로그인/소유권 기반 Firestore 규칙으로 교체

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Firebase 콘솔 설정 + 로컬 종단 테스트 (사용자 수동)

**Files:** (없음 — 콘솔 작업 + 브라우저 확인)

- [ ] **Step 1: 구글 로그인 활성화 (수동)**

Firebase 콘솔 → Authentication → "시작하기" → 로그인 제공업체에서 **Google** 선택 → 사용 설정 → 프로젝트 지원 이메일 선택 → 저장.

- [ ] **Step 2: 승인된 도메인 추가 (수동)**

Authentication → 설정(Settings) → 승인된 도메인(Authorized domains) → 도메인 추가 → **`kht1-oss.github.io`** 입력 → 추가. (localhost는 기본 포함)

- [ ] **Step 3: 규칙 게시 (수동)**

Firestore Database → 규칙 → `firestore.rules`(Task 5) 내용으로 교체 → 게시.

- [ ] **Step 4: 로컬 종단 테스트 (브라우저)**

로컬 서버가 없으면 `z:/NewClaude`에서 `python -m http.server 8000 --bind 127.0.0.1` 실행. `http://localhost:8000/mukgit.html` 접속(Ctrl+Shift+R).
Expected:
- 비로그인: 글 목록은 보임. ＋버튼/하트 클릭 시 "구글 로그인" 안내. 삭제 버튼 안 보임
- "구글로 로그인" → 팝업 로그인 → 우상단에 이름 + 로그아웃
- 로그인 후 글 작성 → 목록에 즉시 반영
- 추천: 🤍 클릭 → ❤️ + 숫자 +1, 재추천 차단. (다른 구글 계정으로 로그인하면 같은 글 다시 추천 가능 = 1인1표)
- 삭제: 내가 쓴 글에만 🗑️ 보이고 삭제됨. 내 관리자 계정(khtc0228@gmail.com)으로는 모든 글에 🗑️
- 콘솔 에러 없음

문제가 있으면 멈추고 보고한다(특히 규칙 거부/로그인 팝업 차단).

---

## Task 7: 배포

**Files:** (없음)

- [ ] **Step 1: main 병합 + 푸시**

```bash
git checkout main
git merge --no-ff feat/mukgit-login -m "merge: 구글 로그인 기능 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 2: 라이브 확인**

1~2분 뒤 `https://kht1-oss.github.io/khtportfolio/mukgit.html` 에서 구글 로그인 → 글쓰기/추천/삭제가 정상인지 확인(승인 도메인 추가 후라야 로그인 됨).

---

## Self-Review 결과
- **Spec 커버리지:** 인증 구글 팝업(T2 UI, T4 로직), 보기 자유·글쓰기/추천 로그인(T4), 작성자 직접 입력 유지(T4 submit), ownerUid만 저장·이메일 미저장(T4 postToView/submit, T5 규칙), 계정별 1표(T1 hasUserVoted, T4 vote, T5 update 규칙), 본인/관리자 삭제(T1 canDeletePost, T4 del, T5 delete 규칙), 관리자 암호 제거(T3, T4), 규칙 강화(T5), 콘솔 수동작업(T6), 디자인 유지(변경 안 함). 모두 매핑됨.
- **Placeholder 스캔:** 모든 코드 단계에 실제 코드 포함. 없음.
- **일관성:** `hasUserVoted(post,user)`/`canDeletePost(post,user,adminEmail)` 시그니처가 T1 정의와 T4 사용처 일치. `ownerUid`/`voters` 필드명이 T4·T5에서 일치. `ADMIN_EMAIL`이 T3 정의·T4 사용·T5 규칙(`khtc0228@gmail.com`)과 일치. `arrayUnion`은 T4 import에 포함.
