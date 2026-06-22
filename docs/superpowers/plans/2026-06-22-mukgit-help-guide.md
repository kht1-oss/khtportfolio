# 맛킷 사용법(도움말) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 헤더의 "도움말" 버튼으로 5단계 사용법(스크린샷 포함) 모달을 띄운다. 스크린샷이 없어도 텍스트 설명은 작동한다.

**Architecture:** 순수 UI 추가. `mukgit.html`에 도움말 버튼·모달, `mukgit.css`에 스타일, `mukgit.js`에 열기/닫기. 스크린샷은 `guide/` 폴더의 `<img>`로 불러오고, 없으면 인라인 `onerror`로 "이미지 준비 중" 자리표시를 보인다(별도 로직 불필요).

**Tech Stack:** HTML, CSS, Vanilla JS. 로컬 확인: `z:/NewClaude`에서 `python -m http.server 8000 --bind 127.0.0.1` 후 `http://localhost:8000/mukgit.html`.

## Global Constraints

- 헤더에 "❓ 도움말" 버튼 → `#help-modal` 모달. 자동 팝업 아님(클릭 시에만).
- 5단계: ①구글 로그인 ②맛집 올리기 ③추천하기 ④자세히 보기 & 댓글 ⑤삭제. 맨 위 한 줄 안내(로그인 없이 구경 자유, 글·추천·댓글은 로그인 후).
- 스크린샷 경로/이름 고정: `guide/1-login.png`, `guide/2-write.png`, `guide/3-vote.png`, `guide/4-detail.png`, `guide/5-delete.png`. 없으면 "📷 이미지 준비 중" 자리표시.
- 기능·디자인(분홍·하트·로그인)은 변경 없음.
- 커밋 메시지는 간결한 한 줄 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- `mukgit.html` — 도움말 버튼 + 도움말 모달(5단계 + 이미지/자리표시).
- `mukgit.css` — 도움말 버튼·모달·단계·이미지 스타일.
- `mukgit.js` — 도움말 모달 열기/닫기.
- `guide/README.md` — `guide/` 폴더 생성 + 스크린샷 파일명 안내.

---

## Task 1: 도움말 버튼 + 모달 마크업 + guide 폴더 + 스타일

**Files:**
- Modify: `mukgit.html`
- Modify: `mukgit.css`
- Create: `guide/README.md`

**Interfaces:**
- Produces: DOM 훅 `#help-btn`, `#help-modal`, `#help-close` (Task 2의 JS가 사용).

- [ ] **Step 1: 도움말 버튼 + 모달 마크업 추가**

`mukgit.html`의 `<header class="site-header">` 안, `<div class="auth">` **앞**에 도움말 버튼을 추가:

```html
    <button id="help-btn" class="help-btn">❓ 도움말</button>
```

그리고 `<div id="detail-modal" ...>...</div>` 블록 **다음**(`<script>` 앞)에 도움말 모달을 추가:

```html
  <div id="help-modal" class="modal" hidden>
    <div class="help-card">
      <button type="button" id="help-close" class="detail-close" title="닫기">✕</button>
      <h2>🏛️ 맛킷리스트 사용법</h2>
      <p class="help-intro">로그인 없이 구경은 자유롭게! 글쓰기·추천·댓글은 구글 로그인 후 이용해요.</p>

      <ol class="help-steps">
        <li>
          <h3>1. 구글 로그인</h3>
          <p>오른쪽 위 <b>"구글로 로그인"</b> 버튼을 눌러 로그인하세요.</p>
          <div class="guide-shot"><img src="guide/1-login.png" alt="로그인 화면" onerror="this.style.display='none'; this.parentElement.classList.add('no-img')" /><span class="shot-ph">📷 이미지 준비 중</span></div>
        </li>
        <li>
          <h3>2. 맛집 올리기</h3>
          <p>오른쪽 아래 <b>＋</b> 버튼 → 사진·음식 이름·작성자·가격·가게·본문을 적고 <b>"작성"</b>.</p>
          <div class="guide-shot"><img src="guide/2-write.png" alt="글쓰기 화면" onerror="this.style.display='none'; this.parentElement.classList.add('no-img')" /><span class="shot-ph">📷 이미지 준비 중</span></div>
        </li>
        <li>
          <h3>3. 추천하기</h3>
          <p>카드의 <b>🤍 하트</b>를 누르면 추천돼요(계정당 1번, ❤️로 바뀜).</p>
          <div class="guide-shot"><img src="guide/3-vote.png" alt="추천 화면" onerror="this.style.display='none'; this.parentElement.classList.add('no-img')" /><span class="shot-ph">📷 이미지 준비 중</span></div>
        </li>
        <li>
          <h3>4. 자세히 보기 & 댓글</h3>
          <p>카드를 누르면 <b>상세창</b>이 열려 큰 사진·본문·댓글을 볼 수 있고, 댓글도 달 수 있어요.</p>
          <div class="guide-shot"><img src="guide/4-detail.png" alt="상세창/댓글 화면" onerror="this.style.display='none'; this.parentElement.classList.add('no-img')" /><span class="shot-ph">📷 이미지 준비 중</span></div>
        </li>
        <li>
          <h3>5. 삭제</h3>
          <p>내가 쓴 글·댓글의 <b>🗑️</b>로 삭제할 수 있어요(관리자는 전체 삭제 가능).</p>
          <div class="guide-shot"><img src="guide/5-delete.png" alt="삭제 화면" onerror="this.style.display='none'; this.parentElement.classList.add('no-img')" /><span class="shot-ph">📷 이미지 준비 중</span></div>
        </li>
      </ol>
    </div>
  </div>
```

- [ ] **Step 2: 스타일 추가**

`mukgit.css` 끝에 추가:

```css
/* 도움말 */
.help-btn {
  position: absolute; top: 14px; left: 14px;
  border: 1px solid #f3cdde; background: #fff0f5; color: #c2487a;
  border-radius: 20px; padding: 6px 12px; font-size: 13px; cursor: pointer;
  font-family: "Helvetica Neue", sans-serif;
}
.help-btn:hover { background: #ffe3ee; }
.help-card {
  background: #fff; border-radius: 16px; width: 100%; max-width: 460px;
  max-height: 88vh; overflow-y: auto; position: relative; padding: 18px 18px 22px;
}
.help-card h2 { color: var(--accent); text-align: center; margin: 4px 0 8px; }
.help-intro { text-align: center; color: #b07a93; font-size: 13px; margin: 0 0 12px; }
.help-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.help-steps h3 { color: var(--accent); font-size: 15px; margin: 0 0 4px; }
.help-steps p { margin: 0 0 8px; font-size: 14px; color: #4a3a40; }
.guide-shot {
  border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: #fff5fa;
}
.guide-shot img { width: 100%; display: block; }
.shot-ph { display: none; }
.guide-shot.no-img { display: flex; align-items: center; justify-content: center; min-height: 90px; }
.guide-shot.no-img .shot-ph { display: block; color: #c79bb0; font-size: 13px; }
```

- [ ] **Step 3: guide 폴더 생성(README)**

`guide/README.md` 생성:

```markdown
# 사용법 스크린샷 폴더

아래 이름 그대로 스크린샷을 이 폴더에 저장하면 사용법 모달에 자동으로 나옵니다.

- `1-login.png` — 구글 로그인 화면
- `2-write.png` — 글쓰기(맛집 올리기) 화면
- `3-vote.png` — 추천(하트) 화면
- `4-detail.png` — 상세창/댓글 화면
- `5-delete.png` — 삭제 화면

권장: PNG/JPG, 가로 600~1000px. 본인 화면 위주로(지인 개인정보 노출 주의).
```

- [ ] **Step 4: 정적 확인**

`mukgit.html`을 열어 `#help-btn`, `#help-modal`, `#help-close`가 있는지 확인. (동작은 Task 2 이후.)

- [ ] **Step 5: 커밋**

```bash
git add mukgit.html mukgit.css guide/README.md
git commit -m "feat: 도움말 버튼 + 사용법 모달 마크업/스타일 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 도움말 모달 열기/닫기 (JS)

**Files:**
- Modify: `mukgit.js`

**Interfaces:**
- Consumes: `#help-btn`, `#help-modal`, `#help-close`.
- Produces: 도움말 모달 열고 닫기.

- [ ] **Step 1: 열기/닫기 핸들러 추가**

`mukgit.js`의 상세창 코드 블록(`$("#detail-close").addEventListener(...)`와 `detailModal.addEventListener(...)` 줄) **다음**에 추가:

```javascript
// ---- 도움말 ----
const helpModal = $("#help-modal");
$("#help-btn").addEventListener("click", () => { helpModal.hidden = false; });
$("#help-close").addEventListener("click", () => { helpModal.hidden = true; });
helpModal.addEventListener("click", (e) => { if (e.target === helpModal) helpModal.hidden = true; });
```

- [ ] **Step 2: 문법 검사 + 확인**

Run: `node --check mukgit.js`
Expected: 출력 없음.
브라우저(`localhost:8000/mukgit.html`, Ctrl+Shift+R): "❓ 도움말" 클릭 → 모달에 5단계 텍스트 표시. 스크린샷이 아직 없으면 각 단계에 "📷 이미지 준비 중". 닫기(✕)·바깥 클릭으로 닫힘. 기존 기능 정상.

- [ ] **Step 3: 커밋**

```bash
git add mukgit.js
git commit -m "feat: 도움말 모달 열기/닫기 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 배포

**Files:** (없음 — 병합/푸시)

- [ ] **Step 1: 로컬 최종 확인**

`localhost:8000/mukgit.html`에서 도움말 모달이 정상으로 뜨고 닫히는지 확인.

- [ ] **Step 2: main 병합 + 푸시**

```bash
git checkout main
git merge --no-ff feat/mukgit-help -m "merge: 사용법(도움말) 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 3: 라이브 확인 + 스크린샷 안내**

`https://kht1-oss.github.io/khtportfolio/mukgit.html`에서 도움말 모달 확인. 이후 사용자가 `guide/`에 스크린샷 5장을 정해진 이름으로 넣으면, Claude가 커밋·푸시하여 실제 화면이 모달에 반영된다.

---

## Self-Review 결과
- **Spec 커버리지:** 도움말 버튼+모달(T1), 5단계 내용·상단 안내(T1), 스크린샷 경로/이름·onerror 자리표시(T1), guide 폴더 생성(T1 README), 열기/닫기(T2), 모바일 스크롤(T1 max-height/overflow), 배포(T3). 모두 매핑됨.
- **Placeholder 스캔:** 모든 코드 단계에 실제 코드 포함. 없음.
- **일관성:** `#help-btn`/`#help-modal`/`#help-close` 이름이 T1 정의·T2 사용 일치. 이미지 경로 `guide/N-*.png`가 모달 마크업과 README 안내에서 일치. `.guide-shot.no-img`/`.shot-ph` 클래스가 onerror 핸들러와 CSS에서 일치.
