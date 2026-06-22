# 맛킷 업데이트 소식(버전 changelog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **상태: 설계·계획만 완료. 구현은 추후 진행(토큰 여유 시). 실행 시 이 문서를 그대로 따르면 됨.**

**Goal:** 헤더 "📢 소식" 버튼으로 버전별 업데이트 내역(아코디언)을 보여주는 모달을 추가한다.

**Architecture:** 순수 UI 추가. 소식 내역은 `mukgit.js`의 정적 `CHANGELOG` 배열로 관리하고, 모달에서 버전별 아코디언으로 렌더한다(최신 버전 기본 펼침). DB 불필요.

**Tech Stack:** HTML, CSS, Vanilla JS. 로컬 확인: `localhost:8000/mukgit.html`.

## Global Constraints

- 헤더에 "📢 소식" 버튼(도움말 옆) → `#news-modal`. 자동 팝업 아님.
- 버전별 아코디언: 버전 헤더 클릭 → 해당 버전 내역 펼침/접힘. 최신(맨 위) 기본 펼침.
- 소식 내역은 코드 내 `CHANGELOG` 배열(별도 DB 없음). 새 버전은 배열 맨 앞에 추가.
- 빨간 점 배지 없음. 기존 기능·디자인 변경 없음.
- 커밋 메시지는 간결한 한 줄 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- `mukgit.html` — 헤더 좌측 버튼 묶음(도움말+소식) + 소식 모달.
- `mukgit.css` — 헤더 좌측 묶음·소식 모달·아코디언 스타일.
- `mukgit.js` — `CHANGELOG` 배열 + 소식 렌더/열기/닫기/펼침 토글.

---

## Task 1: 헤더 소식 버튼 + 모달 + 아코디언 스타일 (HTML/CSS)

**Files:**
- Modify: `mukgit.html`, `mukgit.css`

**Interfaces:**
- Produces: DOM 훅 `#news-btn`, `#news-modal`, `#news-close`, `#news-list` (Task 2의 JS가 사용).

- [ ] **Step 1: 헤더의 도움말 버튼을 좌측 묶음으로 감싸고 소식 버튼 추가**

`mukgit.html`에서 기존 한 줄:
```html
    <button id="help-btn" class="help-btn">❓ 도움말</button>
```
을 아래로 교체:
```html
    <div class="header-left">
      <button id="help-btn" class="help-btn">❓ 도움말</button>
      <button id="news-btn" class="help-btn">📢 소식</button>
    </div>
```

- [ ] **Step 2: 소식 모달 마크업 추가**

`mukgit.html`에서 `<div id="help-modal" ...>...</div>` 블록 **다음**(`<script>` 앞)에 추가:
```html
  <div id="news-modal" class="modal" hidden>
    <div class="help-card">
      <button type="button" id="news-close" class="detail-close" title="닫기">✕</button>
      <h2>📢 업데이트 소식</h2>
      <div id="news-list"></div>
    </div>
  </div>
```

- [ ] **Step 3: 스타일 교체/추가**

`mukgit.css`에서 기존 `.help-btn { ... }` 규칙(`position: absolute; top: 14px; left: 14px;` 포함)을 아래로 교체(절대위치를 묶음으로 이동):
```css
.header-left { position: absolute; top: 14px; left: 14px; display: flex; gap: 8px; }
.help-btn {
  border: 1px solid #f3cdde; background: #fff0f5; color: #c2487a;
  border-radius: 20px; padding: 6px 12px; font-size: 13px; cursor: pointer;
  font-family: "Helvetica Neue", sans-serif;
}
.help-btn:hover { background: #ffe3ee; }
```

이어서 `mukgit.css` 끝에 아코디언 스타일 추가:
```css
/* 업데이트 소식 아코디언 */
#news-list { display: flex; flex-direction: column; gap: 8px; }
.news-item { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.news-head {
  width: 100%; text-align: left; background: #fff5fa; border: none; cursor: pointer;
  padding: 9px 12px; font-weight: 600; color: var(--accent);
  display: flex; justify-content: space-between; align-items: center; font-size: 14px;
}
.news-head .date { font-size: 11px; color: #b07a93; font-weight: 400; }
.news-body { padding: 8px 12px 10px; }
.news-body[hidden] { display: none; }
.news-body ul { margin: 0; padding-left: 18px; font-size: 13px; color: #4a3a40; }
.news-body li { margin: 2px 0; }
```

- [ ] **Step 4: 정적 확인 + 커밋**

`mukgit.html`을 열어 `#news-btn`, `#news-modal`, `#news-close`, `#news-list` 존재 확인. 헤더 왼쪽에 도움말·소식 버튼이 나란히 보이는지(브라우저). (동작은 Task 2 이후.)
```bash
git add mukgit.html mukgit.css
git commit -m "feat: 헤더 소식 버튼 + 소식 모달/아코디언 스타일

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 소식 데이터 + 렌더/토글 (JS)

**Files:**
- Modify: `mukgit.js`

**Interfaces:**
- Consumes: `#news-btn`, `#news-modal`, `#news-close`, `#news-list`, `escapeHtml`.
- Produces: `CHANGELOG` 배열, `renderNews()`, 모달 열기/닫기, 아코디언 토글.

- [ ] **Step 1: 소식 코드 추가**

`mukgit.js`의 도움말 코드 블록(`helpModal.addEventListener(...)` 줄) **다음**에 추가:
```javascript
// ---- 업데이트 소식 ----
const CHANGELOG = [
  { version: "v1.2.1", date: "2026-06-22", items: ["모바일에서 1위가 시상대 맨 위로 오도록 정렬 수정"] },
  { version: "v1.2",   date: "2026-06-22", items: ["내 글 수정 기능 추가(사진·내용 모두 수정 가능)"] },
  { version: "v1.1",   date: "2026-06-22", items: ["구글 로그인", "댓글 기능", "분홍 디자인 + 떠다니는 배경", "사용법 가이드"] },
  { version: "v1.0",   date: "2026-06-22", items: ["맛집 글쓰기(사진 업로드)", "추천 기반 랭킹(신전 시상대)"] },
];

const newsModal = $("#news-modal");
const newsList = $("#news-list");

function renderNews() {
  newsList.innerHTML = CHANGELOG.map((v, i) => `
    <div class="news-item">
      <button class="news-head" type="button">
        <span>${escapeHtml(v.version)}</span><span class="date">${escapeHtml(v.date)}</span>
      </button>
      <div class="news-body" ${i === 0 ? "" : "hidden"}>
        <ul>${v.items.map((it) => `<li>${escapeHtml(it)}</li>`).join("")}</ul>
      </div>
    </div>`).join("");
}

$("#news-btn").addEventListener("click", () => { renderNews(); newsModal.hidden = false; });
$("#news-close").addEventListener("click", () => { newsModal.hidden = true; });
newsModal.addEventListener("click", (e) => { if (e.target === newsModal) newsModal.hidden = true; });
newsList.addEventListener("click", (e) => {
  const head = e.target.closest(".news-head");
  if (!head) return;
  const body = head.nextElementSibling;
  body.hidden = !body.hidden;
});
```

- [ ] **Step 2: 문법 검사 + 확인**

Run: `node --check mukgit.js`
Expected: 출력 없음.
브라우저: "📢 소식" 클릭 → 모달에 버전 목록(최신 위, v1.2.1 펼침). 버전 헤더 클릭 → 내역 펼침/접힘. 닫기/바깥클릭으로 닫힘.

- [ ] **Step 3: 커밋**

```bash
git add mukgit.js
git commit -m "feat: 업데이트 소식 데이터 + 버전 아코디언 렌더

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 배포 (구현 완료 후)

- [ ] **Step 1: 로컬 최종 확인** — 소식 모달 정상 동작.
- [ ] **Step 2: main 병합 + 푸시**
```bash
git checkout main
git merge --no-ff feat/mukgit-news -m "merge: 업데이트 소식(버전 changelog) 추가

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```
- [ ] **Step 3: 라이브 확인** — `https://kht1-oss.github.io/khtportfolio/mukgit.html`에서 📢 소식 확인.

---

## Self-Review 결과
- **Spec 커버리지:** 헤더 소식 버튼→모달(T1), 버전 아코디언·최신 기본 펼침(T1 스타일/T2 렌더), 정적 CHANGELOG(T2), 펼침 토글(T2), 빨간점 없음(미구현), 배포(T3). 모두 매핑됨.
- **Placeholder 스캔:** 실제 코드 포함. 없음.
- **일관성:** `#news-btn/#news-modal/#news-close/#news-list` 이름이 T1·T2 일치. `.news-head/.news-body` 클래스가 T1 스타일·T2 렌더 일치. `escapeHtml`은 기존 함수 재사용.
