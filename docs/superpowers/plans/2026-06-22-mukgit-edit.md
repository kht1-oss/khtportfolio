# 맛킷 글 수정 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작성자 본인이 자기 글의 전체 항목(음식이름·작성자·가격·가게·본문·사진)을 수정할 수 있게 한다.

**Architecture:** 글쓰기 모달을 "수정 모드"로 재사용한다. 카드에 본인만 보이는 ✏️ 버튼 → 모달에 기존 값 채워 열기 → 제출 시 `updateDoc`로 내용만 갱신(추천수·소유권·시각 유지). 권한 판단 `canEditPost`는 utils에 두고 TDD. 서버 규칙에 소유자 내용수정 경로 추가.

**Tech Stack:** HTML/CSS/Vanilla JS, Firebase Firestore, Node `node --test`. 로컬 확인: `localhost:8000/mukgit.html`(서버 실행 중).

## Global Constraints

- 수정 권한: 작성자 본인만(`ownerUid == uid`). 관리자는 기존대로 삭제만(수정 불가).
- 수정 항목: foodName, author, price, storeName, body, imageUrl(사진).
- 사진: 새 파일 선택 시 교체, 미선택 시 기존 `imageUrl` 유지.
- 수정해도 `votes`/`voters`/`ownerUid`/`createdAt` 불변.
- 디자인·기존 기능(로그인·추천·댓글·배경)은 변경 없음.
- 커밋 메시지는 간결한 한 줄 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- `mukgit.utils.js` / `test/mukgit.utils.test.js` — `canEditPost` + 테스트.
- `mukgit.html` — 모달 제목에 id, 사진 안내 문구(수정 시).
- `mukgit.css` — ✏️ 버튼·안내 문구 스타일.
- `mukgit.js` — ✏️ 렌더, 수정 모드(열기/채우기/제출), 모달 토글.
- `firestore.rules` — 소유자 내용수정 update 경로 추가.

---

## Task 1: canEditPost 순수 함수 (TDD)

**Files:**
- Modify: `mukgit.utils.js`, `test/mukgit.utils.test.js`

**Interfaces:**
- Produces: `canEditPost(post, user) -> boolean` — `user`가 있고 `post.ownerUid === user.uid`면 true(관리자 예외 없음).

- [ ] **Step 1: 실패 테스트 추가**

`test/mukgit.utils.test.js`의 import 줄에 `canEditPost` 추가:

```javascript
import {
  formatPrice,
  validatePostInput,
  rankPosts,
  hasUserVoted,
  canDeletePost,
  canDeleteComment,
  canEditPost,
} from "../mukgit.utils.js";
```

파일 끝에 추가:

```javascript
test("canEditPost: 작성자 본인이면 true", () => {
  assert.equal(canEditPost({ ownerUid: "u1" }, { uid: "u1", email: "a@b.c" }), true);
});

test("canEditPost: 남의 글이면 false (관리자라도)", () => {
  assert.equal(canEditPost({ ownerUid: "u2" }, { uid: "u1", email: "a@b.c" }), false);
});

test("canEditPost: 비로그인은 false", () => {
  assert.equal(canEditPost({ ownerUid: "u1" }, null), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `canEditPost`가 export되지 않음.

- [ ] **Step 3: 구현 추가**

`mukgit.utils.js` 끝(`canDeleteComment` 아래)에 추가:

```javascript
export function canEditPost(post, user) {
  return !!user && post?.ownerUid === user.uid;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 전체 통과.

- [ ] **Step 5: 커밋**

```bash
git add mukgit.utils.js test/mukgit.utils.test.js
git commit -m "feat: 글 수정 권한 함수(canEditPost) 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: HTML/CSS — 모달 제목 id + 사진 안내 + 버튼 스타일

**Files:**
- Modify: `mukgit.html`, `mukgit.css`

**Interfaces:**
- Produces: `#write-title`, `#edit-photo-hint` DOM 훅. `.edit-btn` 스타일.

- [ ] **Step 1: 모달 제목에 id, 사진 label 뒤에 안내 문구**

`mukgit.html`의 `<h2>맛집 알리기</h2>`를 교체:

```html
      <h2 id="write-title">맛집 알리기</h2>
```

그리고 `<label>사진<input id="f-image" ... /></label>` 줄 **다음**에 추가:

```html
      <p id="edit-photo-hint" class="edit-hint" hidden>사진을 바꾸려면 새로 선택하세요(안 하면 기존 사진 유지).</p>
```

- [ ] **Step 2: 스타일 추가**

`mukgit.css`의 `.del-btn { ... }` 규칙 **다음**에 추가:

```css
.edit-btn { background: none; border: none; cursor: pointer; color: #b9bfc8; font-size: 14px; }
.edit-hint { font-size: 12px; color: #b07a93; margin: -2px 0 0; }
.edit-hint[hidden] { display: none; }
```

- [ ] **Step 3: 커밋**

```bash
git add mukgit.html mukgit.css
git commit -m "feat: 수정 모드용 제목 id + 사진 안내 + 버튼 스타일

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: mukgit.js — 수정 버튼 + 수정 모드 + 저장

**Files:**
- Modify: `mukgit.js`

**Interfaces:**
- Consumes: `canEditPost`(utils), `currentUser`, `latestPosts`, 글쓰기 모달 훅, `updateDoc`/`doc`.
- Produces: `editingPostId`, `setWriteMode(postId)`, `openEdit(post)`; 카드 ✏️ 버튼, 보드 edit 분기, addDoc/updateDoc 분기 제출.

- [ ] **Step 1: utils import에 canEditPost 추가**

`mukgit.js`의 utils import을 교체:

```javascript
import { rankPosts, formatPrice, validatePostInput, hasUserVoted, canDeletePost, canDeleteComment, canEditPost } from "./mukgit.utils.js";
```

- [ ] **Step 2: 카드에 ✏️ 수정 버튼(본인만) 추가**

`mukgit.js`의 `postCardHTML`에서 `const canDelete = ...` 줄 아래에 `canEdit`를 추가하고, footer의 버튼 부분을 교체.

`const canDelete` 줄 다음에 추가:
```javascript
  const canEdit = canEditPost(p, currentUser);
```

footer 안의 삭제 버튼 줄을 아래로 교체:
```javascript
        ${canEdit ? `<button class="edit-btn" data-action="edit" title="수정">✏️</button>` : ""}
        ${canDelete ? `<button class="del-btn" data-action="del" title="삭제">🗑️</button>` : ""}
```

- [ ] **Step 3: 수정 모드 상태/헬퍼 추가 + open-write/closeModal 갱신**

`mukgit.js`의 글쓰기 모달 영역을 아래처럼 교체한다.

기존:
```javascript
const submitBtn = $("#f-submit");

$("#open-write").addEventListener("click", () => {
  if (!currentUser) { alert("글을 올리려면 먼저 구글 로그인해 주세요."); return; }
  modal.hidden = false;
});
$("#f-cancel").addEventListener("click", () => closeModal());

function closeModal() {
  modal.hidden = true;
  form.reset();
  errorsEl.innerHTML = "";
}
```

신규:
```javascript
const submitBtn = $("#f-submit");
const writeTitle = $("#write-title");
const editPhotoHint = $("#edit-photo-hint");
let editingPostId = null;

function setWriteMode(postId) {
  editingPostId = postId || null;
  const isEdit = !!editingPostId;
  writeTitle.textContent = isEdit ? "맛집 수정" : "맛집 알리기";
  submitBtn.textContent = isEdit ? "수정" : "작성";
  editPhotoHint.hidden = !isEdit;
}

function openEdit(post) {
  $("#f-food").value = post.foodName;
  $("#f-author").value = post.author;
  $("#f-price").value = post.price;
  $("#f-store").value = post.storeName;
  $("#f-body").value = post.body || "";
  $("#f-image").value = "";
  errorsEl.innerHTML = "";
  setWriteMode(post.id);
  modal.hidden = false;
}

$("#open-write").addEventListener("click", () => {
  if (!currentUser) { alert("글을 올리려면 먼저 구글 로그인해 주세요."); return; }
  form.reset();
  errorsEl.innerHTML = "";
  setWriteMode(null);
  modal.hidden = false;
});
$("#f-cancel").addEventListener("click", () => closeModal());

function closeModal() {
  modal.hidden = true;
  form.reset();
  errorsEl.innerHTML = "";
  setWriteMode(null);
}
```

- [ ] **Step 4: 제출 핸들러를 작성/수정 분기로 교체**

`mukgit.js`의 `form.addEventListener("submit", ...)` 전체를 아래로 교체:

```javascript
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) { errorsEl.innerHTML = `<li>로그인 후 이용해 주세요.</li>`; return; }
  const editing = editingPostId;
  const file = $("#f-image").files[0];
  const input = {
    foodName: $("#f-food").value,
    author: $("#f-author").value,
    price: $("#f-price").value,
    storeName: $("#f-store").value,
    hasImage: editing ? true : !!file,
  };
  const { valid, errors } = validatePostInput(input);
  errorsEl.innerHTML = errors.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = editing ? "수정 중..." : "작성 중...";
  try {
    if (editing) {
      const data = {
        foodName: input.foodName.trim(),
        author: input.author.trim(),
        price: Number(input.price),
        storeName: input.storeName.trim(),
        body: $("#f-body").value.trim(),
      };
      if (file) data.imageUrl = await compressImage(file);
      await updateDoc(doc(db, "posts", editing), data);
    } else {
      const imageUrl = await compressImage(file);
      await addDoc(postsCol, {
        foodName: input.foodName.trim(),
        author: input.author.trim(),
        price: Number(input.price),
        storeName: input.storeName.trim(),
        body: $("#f-body").value.trim(),
        imageUrl,
        votes: 0,
        voters: [],
        ownerUid: currentUser.uid,
        createdAt: serverTimestamp(),
      });
    }
    closeModal();
  } catch (err) {
    console.error(err);
    errorsEl.innerHTML = `<li>${escapeHtml(err.message || "저장에 실패했어요. 다시 시도해 주세요.")}</li>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingPostId ? "수정" : "작성";
  }
});
```

- [ ] **Step 5: 보드 클릭에 edit 분기 추가**

`mukgit.js`의 보드 클릭 핸들러에서 `if (btn.dataset.action === "vote")` 블록 **앞**에 추가:

```javascript
  if (btn.dataset.action === "edit") {
    const post = latestPosts.find((p) => p.id === id);
    if (post && canEditPost(post, currentUser)) openEdit(post);
    return;
  }
```

- [ ] **Step 6: 문법 검사 + 확인**

Run: `node --check mukgit.js`
Expected: 출력 없음.
브라우저(`localhost:8000/mukgit.html`, 로그인 상태): 내 글 카드에 ✏️ 표시(남의 글엔 없음). ✏️ → 기존 값 채워진 창("맛집 수정"/"수정"). 값 일부 바꾸고 사진은 그대로 두고 "수정" → 목록·상세창 반영, 추천수 유지. 사진 새로 골라 "수정" → 사진 교체.
(이 시점엔 규칙이 추천 전용이라 수정 저장이 거부될 수 있음 → Task 4·5 규칙 게시 후 정상.)

- [ ] **Step 7: 커밋**

```bash
git add mukgit.js
git commit -m "feat: 본인 글 수정(수정 버튼·수정 모드·updateDoc) 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Firestore 규칙 — 소유자 내용수정 경로

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Produces: `update`가 "추천" 또는 "소유자 내용수정" 중 하나를 만족할 때 허용.

- [ ] **Step 1: update 규칙 교체**

`firestore.rules`에서 기존 `allow update: ...` 블록(추천 전용)을 아래로 교체:

```
      allow update: if request.auth != null && (
        (
          request.resource.data.votes == resource.data.votes + 1
          && !(request.auth.uid in resource.data.get('voters', []))
          && (request.auth.uid in request.resource.data.voters)
          && request.resource.data.voters.size() == resource.data.get('voters', []).size() + 1
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votes', 'voters'])
        ) || (
          request.auth.uid == resource.data.get('ownerUid', '')
          && request.resource.data.foodName is string
          && request.resource.data.author is string
          && request.resource.data.storeName is string
          && request.resource.data.price is number
          && request.resource.data.imageUrl is string
          && (!('body' in request.resource.data) || request.resource.data.body is string)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['foodName','author','price','storeName','body','imageUrl'])
        )
      );
```

(다른 규칙 — read/create/delete, comments — 은 그대로 둔다.)

- [ ] **Step 2: 커밋**

```bash
git add firestore.rules
git commit -m "feat: 소유자 본인 글 내용수정 update 규칙 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: 규칙 게시 + 로컬 테스트 (사용자 수동)

**Files:** (없음)

- [ ] **Step 1: 규칙 게시 (수동)**

Firebase 콘솔 → Firestore Database → 규칙 → `firestore.rules`(Task 4 반영본 전체)로 교체 → 게시.

- [ ] **Step 2: 로컬 종단 테스트**

`localhost:8000/mukgit.html`(Ctrl+Shift+R), 로그인 상태:
- 내 글에 ✏️ 보이고 남의 글엔 없음(다른 계정/비로그인 확인)
- ✏️ → 값 채워진 "맛집 수정" 창 → 텍스트 일부 수정 후 "수정" → 반영, 추천수 유지
- 사진 안 바꾸면 기존 유지 / 새 사진 고르면 교체
- 추천(하트)·삭제·댓글 기존 동작 정상
문제 시 멈추고 보고(특히 규칙 거부).

---

## Task 6: 배포

**Files:** (없음)

- [ ] **Step 1: main 병합 + 푸시**

```bash
git checkout main
git merge --no-ff feat/mukgit-edit -m "merge: 본인 글 수정 기능

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 2: 라이브 확인**

`https://kht1-oss.github.io/khtportfolio/mukgit.html`에서 로그인 후 본인 글 수정이 정상인지 확인.

---

## Self-Review 결과
- **Spec 커버리지:** 본인만 수정(T1 canEditPost, T3 ✏️ 표시·edit 분기, T4 규칙), 전체 항목 수정(T3 openEdit/제출, T4 affectedKeys), 사진 미선택 유지(T3 file 조건부 imageUrl), 추천수/소유권/시각 유지(T3 updateDoc 부분 갱신, T4 affectedKeys), 글쓰기 창 재사용(T2 제목 id, T3 setWriteMode), 규칙 게시(T5), 배포(T6). 모두 매핑됨.
- **Placeholder 스캔:** 모든 코드 단계에 실제 코드 포함. 없음.
- **일관성:** `canEditPost(post,user)` 시그니처 T1 정의·T3 사용 일치. `editingPostId`/`setWriteMode`/`openEdit`/`#write-title`/`#edit-photo-hint` 이름이 T2·T3에서 일치. 수정 필드 목록(foodName/author/price/storeName/body/imageUrl)이 T3 제출·T4 규칙 affectedKeys에서 일치.
