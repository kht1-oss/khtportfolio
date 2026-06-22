# 맛킷 본문 + 댓글 + 떠다니는 배경 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글에 본문(선택)을 추가하고, 카드 클릭 시 상세창에서 사진·본문·댓글을 보여주며, 로그인 사용자가 댓글을 달 수 있게 하고, 배경에 하트·음식 이모지가 떠다니게 한다.

**Architecture:** 카드 클릭으로 여는 상세 모달을 추가. 댓글은 `posts/{id}/comments` 하위 컬렉션에 저장하고 상세창이 열린 동안 실시간 구독. 권한 판단(`canDeleteComment`)은 `mukgit.utils.js`에 두고 TDD. 배경은 CSS 애니메이션 이모지 레이어(클릭 통과).

**Tech Stack:** HTML, CSS, Vanilla JS(ES Modules), Firebase v10(앱/Firestore/Auth, CDN), Node `node --test`. 로컬 확인: `z:/NewClaude`에서 `python -m http.server 8000 --bind 127.0.0.1` 후 `http://localhost:8000/mukgit.html`.

## Global Constraints

- 기존 로그인/추천/삭제/디자인(분홍·하트·시상대)은 변경 없이 유지.
- 본문은 **선택 입력**, 최대 1000자. 글 문서 `body`(string) 필드.
- 댓글은 `posts/{id}/comments` 하위 컬렉션: `name`(직접입력), `text`(최대 500자), `commenterUid`, `createdAt`.
- 댓글 작성은 **로그인 필요**. 댓글 삭제는 작성자 본인(`commenterUid`) 또는 관리자 이메일 `khtc0228@gmail.com`.
- 배경 이모지 레이어는 `pointer-events: none`, `prefers-reduced-motion`에서 정지, 모바일에서 개수 축소.
- 커밋 메시지는 간결한 한 줄 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- `mukgit.utils.js` — `canDeleteComment` 추가.
- `test/mukgit.utils.test.js` — 위 테스트 추가.
- `mukgit.html` — 본문 textarea, 상세 모달, 배경 레이어 컨테이너.
- `mukgit.css` — 상세 모달/댓글/배경 애니메이션 스타일.
- `mukgit.js` — 본문 저장·표시, 상세 모달, 댓글 실시간/작성/삭제, 배경 이모지 생성.
- `firestore.rules` — body + comments 규칙.

---

## Task 1: canDeleteComment 순수 함수 (TDD)

**Files:**
- Modify: `mukgit.utils.js`
- Modify: `test/mukgit.utils.test.js`

**Interfaces:**
- Produces: `canDeleteComment(comment, user, adminEmail) -> boolean` — `user`가 있고 (`comment.commenterUid === user.uid` 또는 `user.email === adminEmail`)면 true.

- [ ] **Step 1: 실패 테스트 추가**

`test/mukgit.utils.test.js`의 import 줄에 `canDeleteComment`를 추가:

```javascript
import {
  formatPrice,
  validatePostInput,
  rankPosts,
  hasUserVoted,
  canDeletePost,
  canDeleteComment,
} from "../mukgit.utils.js";
```

파일 끝에 추가:

```javascript
test("canDeleteComment: 작성자면 true", () => {
  assert.equal(
    canDeleteComment({ commenterUid: "u1" }, { uid: "u1", email: "a@b.c" }, "admin@x.com"),
    true
  );
});

test("canDeleteComment: 관리자 이메일이면 true", () => {
  assert.equal(
    canDeleteComment({ commenterUid: "u2" }, { uid: "u1", email: "admin@x.com" }, "admin@x.com"),
    true
  );
});

test("canDeleteComment: 남의 댓글이면 false", () => {
  assert.equal(
    canDeleteComment({ commenterUid: "u2" }, { uid: "u1", email: "a@b.c" }, "admin@x.com"),
    false
  );
});

test("canDeleteComment: 비로그인은 false", () => {
  assert.equal(canDeleteComment({ commenterUid: "u1" }, null, "admin@x.com"), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `canDeleteComment`가 export되지 않음.

- [ ] **Step 3: 구현 추가**

`mukgit.utils.js` 끝(`canDeletePost` 아래)에 추가:

```javascript
export function canDeleteComment(comment, user, adminEmail) {
  if (!user) return false;
  return comment?.commenterUid === user.uid || user.email === adminEmail;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 전체 통과.

- [ ] **Step 5: 커밋**

```bash
git add mukgit.utils.js test/mukgit.utils.test.js
git commit -m "feat: 댓글 삭제 권한 함수(canDeleteComment) 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 본문(body) 입력 + 저장

**Files:**
- Modify: `mukgit.html` (글쓰기 폼에 textarea)
- Modify: `mukgit.js` (`postToView`에 body, submit에 body 저장)
- Modify: `mukgit.css` (textarea 스타일)

**Interfaces:**
- Consumes: 없음
- Produces: 글 문서에 `body`(string) 저장. `postToView` 결과에 `body` 포함. DOM 훅 `#f-body`.

- [ ] **Step 1: 글쓰기 폼에 본문 textarea 추가**

`mukgit.html`에서 가게 이름 label과 사진 label 사이에 추가:

```html
      <label>본문(선택)<textarea id="f-body" maxlength="1000" rows="3" placeholder="이러이러해서 맛있었다 등 자유롭게"></textarea></label>
```

(즉 `<label>가게 이름...</label>` 다음, `<label>사진...</label>` 앞.)

- [ ] **Step 2: textarea 스타일 추가**

`mukgit.css`의 `.modal-card input { ... }` 규칙 아래에 추가:

```css
.modal-card textarea {
  padding: 8px; border: 1px solid var(--line); border-radius: 8px;
  font-size: 14px; font-family: inherit; resize: vertical;
}
```

- [ ] **Step 3: postToView에 body 추가**

`mukgit.js`의 `postToView` 반환 객체에 `imageUrl` 줄 아래에 추가:

```javascript
    body: d.body ?? "",
```

- [ ] **Step 4: 글 작성 시 body 저장**

`mukgit.js`의 `addDoc(postsCol, { ... })` 객체에서 `storeName` 줄 아래에 추가:

```javascript
      body: $("#f-body").value.trim(),
```

- [ ] **Step 5: 문법 검사 + 확인**

Run: `node --check mukgit.js`
Expected: 출력 없음.
브라우저(`localhost:8000/mukgit.html`, Ctrl+Shift+R): 글쓰기 폼에 본문 칸이 보이고, 본문을 적어 작성하면 콘솔 에러 없이 저장됨(표시는 Task 3 상세창에서). 본문을 비워도 작성됨.

- [ ] **Step 6: 커밋**

```bash
git add mukgit.html mukgit.css mukgit.js
git commit -m "feat: 글 본문(선택) 입력/저장 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 상세창(detail modal) — 사진·정보·본문

**Files:**
- Modify: `mukgit.html` (상세 모달 마크업)
- Modify: `mukgit.css` (상세 모달 스타일)
- Modify: `mukgit.js` (열기/닫기/채우기, 카드 클릭)

**Interfaces:**
- Consumes: `latestPosts`, `formatPrice`, `escapeHtml`, 카드 `data-id`.
- Produces: `openDetail(post)`, `closeDetail()`; 모듈 변수 `detailPostId`. DOM 훅 `#detail-modal`, `#detail-close`, `#d-photo`, `#d-food`, `#d-meta`, `#d-body`, `#comment-list`, `#comment-form`, `#c-name`, `#c-text`, `#comment-login-hint` (댓글 요소는 Task 4에서 동작).

- [ ] **Step 1: 상세 모달 마크업 추가**

`mukgit.html`에서 `<div id="write-modal" ...>...</div>` 블록 **다음**(`<script>` 앞)에 추가:

```html
  <div id="detail-modal" class="modal" hidden>
    <div class="detail-card">
      <button type="button" id="detail-close" class="detail-close" title="닫기">✕</button>
      <img id="d-photo" class="d-photo" alt="" />
      <div class="d-info">
        <h2 id="d-food"></h2>
        <p id="d-meta" class="sub"></p>
        <p id="d-body" class="d-body"></p>
      </div>
      <div class="comments">
        <h3>댓글</h3>
        <ul id="comment-list" class="comment-list"></ul>
        <form id="comment-form" class="comment-form">
          <input id="c-name" type="text" maxlength="20" placeholder="이름" />
          <input id="c-text" type="text" maxlength="500" placeholder="댓글을 입력하세요" />
          <button type="submit" class="btn-gold">등록</button>
        </form>
        <p id="comment-login-hint" class="comment-hint" hidden>댓글을 쓰려면 구글 로그인하세요.</p>
      </div>
    </div>
  </div>
```

- [ ] **Step 2: 상세 모달 스타일 추가**

`mukgit.css` 끝에 추가:

```css
.detail-card {
  background: #fff; border-radius: 16px; width: 100%; max-width: 460px;
  max-height: 88vh; overflow-y: auto; position: relative;
}
.detail-close {
  position: absolute; top: 10px; right: 10px; z-index: 1;
  border: none; background: rgba(255,255,255,0.85); color: #c2487a;
  width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 15px;
}
.d-photo { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #ffe3ec; display: block; }
.d-info { padding: 14px 16px 4px; }
.d-info h2 { color: var(--accent); margin: 0 0 4px; }
.d-body { white-space: pre-wrap; color: #5a4a52; font-size: 14px; margin: 10px 0 0; }
.d-body:empty { display: none; }
.comments { padding: 8px 16px 18px; }
.comments h3 { color: var(--accent); font-size: 15px; margin: 8px 0; }
.comment-list { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.comment-item { background: #fff5fa; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font-size: 13px; }
.comment-item .c-name { font-weight: 600; color: var(--accent); }
.comment-item .c-text { color: #4a3a40; white-space: pre-wrap; }
.comment-item .c-del { float: right; background: none; border: none; cursor: pointer; color: #b9bfc8; }
.comment-form { display: flex; gap: 6px; }
.comment-form #c-name { flex: 0 0 80px; }
.comment-form #c-text { flex: 1; }
.comment-form input { padding: 7px; border: 1px solid var(--line); border-radius: 8px; font-size: 13px; }
.comment-hint { font-size: 12px; color: #b07a93; text-align: center; }
.comment-hint[hidden], .comment-form[hidden] { display: none; }
```

- [ ] **Step 3: 상세창 열기/닫기 + 카드 클릭 (mukgit.js)**

`mukgit.js`의 `escapeHtml` 함수 정의 **아래**에 상세창 코드를 추가:

```javascript
// ---- 상세창 ----
const detailModal = $("#detail-modal");
let detailPostId = null;

function openDetail(post) {
  detailPostId = post.id;
  $("#d-photo").src = post.imageUrl;
  $("#d-photo").alt = post.foodName;
  $("#d-food").textContent = post.foodName;
  $("#d-meta").textContent = `${post.storeName} · ${formatPrice(post.price)} · by ${post.author}`;
  $("#d-body").textContent = post.body || "";
  detailModal.hidden = false;
}

function closeDetail() {
  detailModal.hidden = true;
  detailPostId = null;
}

$("#detail-close").addEventListener("click", closeDetail);
detailModal.addEventListener("click", (e) => { if (e.target === detailModal) closeDetail(); });
```

그리고 기존 보드 클릭 핸들러(`boardEl.addEventListener("click", ...)`)의 시작 부분을 아래로 교체한다.

기존:
```javascript
boardEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const card = btn.closest(".post");
  if (!card) return;
  const id = card.dataset.id;
```

신규:
```javascript
boardEl.addEventListener("click", async (e) => {
  const card = e.target.closest(".post");
  if (!card) return;
  const id = card.dataset.id;
  const btn = e.target.closest("button[data-action]");
  if (!btn) {
    const post = latestPosts.find((p) => p.id === id);
    if (post) openDetail(post);
    return;
  }
```

(이후 `if (btn.dataset.action === "vote")` 이하 기존 코드는 그대로 유지된다.)

- [ ] **Step 4: 문법 검사 + 확인**

Run: `node --check mukgit.js`
Expected: 출력 없음.
브라우저 확인: 카드의 빈 영역(사진 등) 클릭 → 상세창에 큰 사진·정보·본문 표시. 하트/삭제 버튼 클릭은 상세창 안 열고 각자 동작. 닫기(✕)·바깥 클릭으로 닫힘.

- [ ] **Step 5: 커밋**

```bash
git add mukgit.html mukgit.css mukgit.js
git commit -m "feat: 카드 클릭 상세창(사진·정보·본문) 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 댓글 (실시간 구독·작성·삭제)

**Files:**
- Modify: `mukgit.js`

**Interfaces:**
- Consumes: `detailPostId`, `currentUser`, `ADMIN_EMAIL`, `canDeleteComment`, `escapeHtml`, Firestore `collection/query/orderBy/onSnapshot/addDoc/deleteDoc/doc/serverTimestamp`.
- Produces: 상세창 열릴 때 댓글 실시간 구독, 댓글 작성/삭제. `openDetail`/`closeDetail`이 구독을 켜고/끈다.

- [ ] **Step 1: Firestore import에 query, orderBy 추가**

`mukgit.js`의 firestore import 블록을 아래로 교체:

```javascript
import {
  getFirestore, collection, addDoc, onSnapshot,
  doc, updateDoc, deleteDoc, increment, arrayUnion, serverTimestamp,
  query, orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
```

`mukgit.js`의 utils import에 `canDeleteComment` 추가:

```javascript
import { rankPosts, formatPrice, validatePostInput, hasUserVoted, canDeletePost, canDeleteComment } from "./mukgit.utils.js";
```

- [ ] **Step 2: 댓글 구독/렌더 추가**

`mukgit.js`의 `closeDetail` 함수 **아래**에 추가:

```javascript
let commentsUnsub = null;
const commentListEl = $("#comment-list");
const commentForm = $("#comment-form");
const commentHint = $("#comment-login-hint");

function commentView(docSnap) {
  const d = docSnap.data();
  const created = d.createdAt && typeof d.createdAt.toMillis === "function"
    ? d.createdAt.toMillis() : 0;
  return {
    id: docSnap.id,
    name: d.name ?? "",
    text: d.text ?? "",
    commenterUid: d.commenterUid ?? "",
    createdAtMillis: created,
  };
}

function renderComments(comments) {
  if (comments.length === 0) {
    commentListEl.innerHTML = `<li class="comment-hint">아직 댓글이 없어요.</li>`;
    return;
  }
  commentListEl.innerHTML = comments.map((c) => {
    const del = canDeleteComment(c, currentUser, ADMIN_EMAIL)
      ? `<button class="c-del" data-action="del-comment" data-cid="${escapeHtml(c.id)}" title="삭제">🗑️</button>`
      : "";
    return `<li class="comment-item">${del}<span class="c-name">${escapeHtml(c.name)}</span><div class="c-text">${escapeHtml(c.text)}</div></li>`;
  }).join("");
}

function subscribeComments(postId) {
  const col = collection(db, "posts", postId, "comments");
  commentsUnsub = onSnapshot(query(col, orderBy("createdAt")), (snap) => {
    renderComments(snap.docs.map(commentView));
  }, (err) => {
    console.error(err);
    commentListEl.innerHTML = `<li class="comment-hint">댓글을 불러오지 못했어요.</li>`;
  });
}

function updateCommentFormVisibility() {
  const loggedIn = !!currentUser;
  commentForm.hidden = !loggedIn;
  commentHint.hidden = loggedIn;
}
```

- [ ] **Step 3: openDetail/closeDetail에 댓글 연결**

`openDetail` 함수의 `detailModal.hidden = false;` 줄 **앞**에 추가:

```javascript
  updateCommentFormVisibility();
  commentListEl.innerHTML = "";
  subscribeComments(post.id);
```

`closeDetail` 함수를 아래로 교체:

```javascript
function closeDetail() {
  detailModal.hidden = true;
  detailPostId = null;
  if (commentsUnsub) { commentsUnsub(); commentsUnsub = null; }
  commentListEl.innerHTML = "";
}
```

- [ ] **Step 4: 댓글 작성/삭제 핸들러 추가**

`mukgit.js`의 `updateCommentFormVisibility` 함수 아래에 추가:

```javascript
commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !detailPostId) return;
  const name = $("#c-name").value.trim();
  const text = $("#c-text").value.trim();
  if (!name || !text) return;
  try {
    await addDoc(collection(db, "posts", detailPostId, "comments"), {
      name,
      text,
      commenterUid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    $("#c-text").value = "";
  } catch (err) {
    console.error(err);
    alert("댓글 작성에 실패했어요.");
  }
});

commentListEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action='del-comment']");
  if (!btn || !detailPostId) return;
  if (!confirm("이 댓글을 삭제할까요?")) return;
  try {
    await deleteDoc(doc(db, "posts", detailPostId, "comments", btn.dataset.cid));
  } catch (err) {
    console.error(err);
    alert("댓글 삭제에 실패했어요.");
  }
});
```

- [ ] **Step 5: 문법 검사**

Run: `node --check mukgit.js`
Expected: 출력 없음.
(실제 댓글 동작은 Task 6 규칙 게시 후 브라우저에서 확인.)

- [ ] **Step 6: 커밋**

```bash
git add mukgit.js
git commit -m "feat: 상세창 댓글 실시간 구독·작성·삭제 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 떠다니는 배경 이모지

**Files:**
- Modify: `mukgit.html` (배경 레이어 컨테이너)
- Modify: `mukgit.css` (애니메이션)
- Modify: `mukgit.js` (이모지 생성)

**Interfaces:**
- Produces: `#bg-emojis` 레이어에 떠다니는 이모지 span 생성. 클릭/동작에 영향 없음.

- [ ] **Step 1: 배경 컨테이너 추가**

`mukgit.html`의 `<body>` 바로 다음 줄에 추가:

```html
  <div id="bg-emojis" class="bg-emojis" aria-hidden="true"></div>
```

- [ ] **Step 2: 배경 스타일 추가**

`mukgit.css` 끝에 추가:

```css
.bg-emojis {
  position: fixed; inset: 0; overflow: hidden;
  pointer-events: none; z-index: -1;
}
.bg-emojis span {
  position: absolute; bottom: -48px; font-size: 28px; opacity: 0.45;
  animation: floatUp linear infinite;
  will-change: transform;
}
@keyframes floatUp {
  0%   { transform: translateY(0) translateX(0) rotate(0deg); }
  50%  { transform: translateY(-55vh) translateX(24px) rotate(12deg); }
  100% { transform: translateY(-110vh) translateX(-12px) rotate(-8deg); }
}
@media (prefers-reduced-motion: reduce) {
  .bg-emojis span { animation: none; opacity: 0.25; }
}
```

- [ ] **Step 3: 이모지 생성 (mukgit.js)**

`mukgit.js` 맨 끝에 추가:

```javascript
// ---- 떠다니는 배경 이모지 ----
(function spawnBgEmojis() {
  const layer = document.getElementById("bg-emojis");
  if (!layer) return;
  const emojis = ["🤍", "❤️", "🩷", "🍕", "🍜", "🍣", "🍔", "🍝", "🥘", "🍰", "🍩"];
  const count = window.innerWidth < 560 ? 8 : 15;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = Math.random() * 100 + "vw";
    el.style.fontSize = 20 + Math.random() * 22 + "px";
    el.style.animationDuration = 14 + Math.random() * 16 + "s";
    el.style.animationDelay = -Math.random() * 20 + "s";
    layer.appendChild(el);
  }
})();
```

- [ ] **Step 4: 문법 검사 + 확인**

Run: `node --check mukgit.js`
Expected: 출력 없음.
브라우저: 배경에 이모지가 천천히 떠오름. 카드 클릭/버튼/스크롤 모두 정상(이모지가 클릭을 가로채지 않음).

- [ ] **Step 5: 커밋**

```bash
git add mukgit.html mukgit.css mukgit.js
git commit -m "feat: 배경에 떠다니는 하트·음식 이모지 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Firestore 규칙 — body + 댓글

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Produces: 콘솔에 게시할 규칙(글 body 허용 + comments 하위 컬렉션 규칙).

- [ ] **Step 1: 규칙 교체**

`firestore.rules` 전체를 아래로 교체:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{id} {
      allow read: if true;

      allow create: if request.auth != null
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.votes == 0
        && request.resource.data.voters == []
        && request.resource.data.foodName is string
        && request.resource.data.author is string
        && request.resource.data.storeName is string
        && request.resource.data.price is number
        && request.resource.data.imageUrl is string
        && (!('body' in request.resource.data) || request.resource.data.body is string);

      allow update: if request.auth != null
        && request.resource.data.votes == resource.data.votes + 1
        && !(request.auth.uid in resource.data.get('voters', []))
        && (request.auth.uid in request.resource.data.voters)
        && request.resource.data.voters.size() == resource.data.get('voters', []).size() + 1
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votes', 'voters']);

      allow delete: if request.auth != null
        && (request.auth.uid == resource.data.get('ownerUid', '')
            || request.auth.token.email == 'khtc0228@gmail.com');

      match /comments/{cid} {
        allow read: if true;
        allow create: if request.auth != null
          && request.resource.data.commenterUid == request.auth.uid
          && request.resource.data.name is string
          && request.resource.data.text is string
          && request.resource.data.text.size() > 0;
        allow delete: if request.auth != null
          && (request.auth.uid == resource.data.commenterUid
              || request.auth.token.email == 'khtc0228@gmail.com');
      }
    }
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add firestore.rules
git commit -m "feat: body + 댓글 하위 컬렉션 보안 규칙 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 규칙 게시 + 로컬 종단 테스트 (사용자 수동)

**Files:** (없음)

- [ ] **Step 1: 규칙 게시 (수동)**

Firebase 콘솔 → Firestore Database → 규칙 → `firestore.rules`(Task 6) 내용으로 교체 → 게시.
(구글 로그인/승인 도메인은 이전 작업에서 이미 설정됨.)

- [ ] **Step 2: 로컬 종단 테스트 (브라우저)**

`http://localhost:8000/mukgit.html` (Ctrl+Shift+R).
Expected:
- 글쓰기에서 본문 적고 작성 → 카드 클릭 → 상세창에 본문 표시. 본문 비우면 본문 영역 없음
- 상세창에서 로그인 시 댓글(이름+내용) 작성 → 즉시 목록 반영. 비로그인은 "로그인하세요" 안내
- 내 댓글에만 🗑️ / 관리자 계정은 모든 댓글 🗑️ / 삭제 동작
- 카드 하트·삭제 버튼은 상세창 안 열고 동작
- 배경 이모지 떠다니되 클릭/버튼 정상
- 기존 로그인/추천/글삭제/디자인 유지

문제 시 멈추고 보고(특히 규칙 거부).

---

## Task 8: 배포 (로그인 + 본문/댓글/배경 한 번에)

**Files:** (없음)

- [ ] **Step 1: main 병합 + 푸시**

```bash
git checkout main
git merge --no-ff feat/mukgit-login -m "merge: 구글 로그인 + 본문/댓글/떠다니는 배경

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 2: 라이브 확인**

1~2분 뒤 `https://kht1-oss.github.io/khtportfolio/mukgit.html` 에서 로그인·글쓰기·본문·댓글·추천·삭제·배경이 정상인지 확인(PC·모바일).

---

## Self-Review 결과
- **Spec 커버리지:** 상세창(T3), 본문 선택입력·저장·표시(T2 저장, T3 표시), 댓글 하위컬렉션·로그인작성·이름직접입력·실시간(T4), 댓글삭제 작성자/관리자(T1 함수, T4 노출, T6 규칙), body 규칙(T6), 떠다니는 배경 reduced-motion/모바일축소/클릭통과(T5), 수동테스트(T7), 배포(T8). 모두 매핑됨.
- **Placeholder 스캔:** 모든 코드 단계에 실제 코드 포함. 없음.
- **일관성:** `canDeleteComment(comment,user,adminEmail)` 시그니처가 T1 정의·T4 사용 일치. 댓글 필드 `name/text/commenterUid/createdAt`가 T4 작성·T6 규칙·T4 commentView와 일치. `query/orderBy` import는 T4에서 추가. `openDetail/closeDetail/detailPostId/commentsUnsub` 이름이 T3·T4에서 일치. 카드 클릭 핸들러 교체가 기존 vote/del 로직을 보존.
