# 이력서 AI역량 카드 PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 맛킷리스트 프로젝트를 'AI 활용 역량' 중심으로 정리한 A4 1페이지 PDF를 로컬에 생성한다(공개 리포 미포함).

**Architecture:** 인쇄용 HTML(`resume/ai-card.html`)을 만들고, 헤드리스 Chrome의 `--print-to-pdf`로 PDF를 뽑는다. 결과물 폴더 `resume/`는 `.gitignore`에 추가해 공개 리포에 올리지 않는다.

**Tech Stack:** HTML/CSS(@page A4), 헤드리스 Chrome(`/c/Program Files/Google/Chrome/Application/chrome.exe`).

## Global Constraints

- A4 1페이지, 한국어, 단일 컬럼. 이름/연락처 미포함(프로젝트 카드).
- AI 활용 역량 중심 + Claude Code 명시. 정직한 프레이밍(직접 손코딩 아님, AI 도구 활용해 동작·배포 결과물 완성).
- 라이브 URL: `https://kht1-oss.github.io/khtportfolio/mukgit.html`
- 결과 `resume/`는 로컬 전용(`.gitignore`). 설계/계획 문서(docs/)만 커밋.
- 커밋 메시지는 간결한 한 줄 + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure
- `.gitignore` — `resume/` 추가
- `resume/ai-card.html` — 인쇄용 1페이지 HTML(로컬)
- `resume/맛킷리스트_AI역량.pdf` — 생성 결과(로컬)

---

## Task 1: gitignore + 인쇄용 HTML 작성

**Files:**
- Modify: `.gitignore`
- Create: `resume/ai-card.html` (로컬 전용, 커밋 안 함)

**Interfaces:**
- Produces: A4 1페이지 인쇄용 HTML. Task 2가 이걸 PDF로 변환.

- [ ] **Step 1: .gitignore에 resume/ 추가**

`.gitignore` 끝에 한 줄 추가:

```
resume/
```

- [ ] **Step 2: resume/ai-card.html 생성**

`resume/ai-card.html` 생성:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: "Malgun Gothic", "맑은 고딕", sans-serif; color: #2a2530; margin: 0; line-height: 1.5; font-size: 11px; }
  .head { border-bottom: 2px solid #c2487a; padding-bottom: 8px; margin-bottom: 12px; }
  .head h1 { margin: 0; font-size: 20px; color: #c2487a; }
  .head .sub { margin: 3px 0 0; font-size: 12px; color: #4a3a40; font-weight: 600; }
  .head .url { margin: 4px 0 0; font-size: 10.5px; color: #7a6a72; }
  h2 { font-size: 12px; color: #c2487a; margin: 12px 0 5px; border-left: 3px solid #f0c14b; padding-left: 7px; }
  ul { margin: 0; padding-left: 17px; }
  li { margin: 2px 0; }
  .row { display: flex; gap: 16px; }
  .row > div { flex: 1; }
  .tag { display: inline-block; background: #fff0f5; color: #c2487a; border: 1px solid #f3cdde; border-radius: 10px; padding: 1px 8px; margin: 2px 3px 0 0; font-size: 10px; }
  .lead { color: #4a3a40; }
  .foot { margin-top: 14px; padding-top: 7px; border-top: 1px solid #eadbe3; font-size: 9.5px; color: #9a8a92; }
  b { color: #2a2530; }
</style>
</head>
<body>
  <div class="head">
    <h1>맛킷리스트 (MukgitList)</h1>
    <p class="sub">AI 도구(Claude Code)를 활용해 기획부터 배포까지 완성한 웹 서비스</p>
    <p class="url">https://kht1-oss.github.io/khtportfolio/mukgit.html</p>
  </div>

  <h2>프로젝트 개요</h2>
  <p class="lead" style="margin:0;">지인들이 맛집을 사진과 함께 공유하는 웹 서비스. 음식 사진·이름·가격·가게 정보를 올리면 추천수에 따라 "신전 명예의 전당"처럼 랭킹으로 표시되고, 상세 화면에서 본문과 댓글로 소통한다. 기획·설계·구현·배포까지 직접 주도해 실제 동작하는 서비스로 완성·운영 중.</p>

  <h2>나의 역할 — AI 활용 방식</h2>
  <ul>
    <li><b>요구사항 정의</b>: 만들고 싶은 기능·디자인·정책을 자연어로 구체화하고 우선순위를 결정</li>
    <li><b>기술 의사결정</b>: 백엔드 선택, 무료/유료 트레이드오프, 보안·개인정보 정책 등을 판단·선택</li>
    <li><b>AI 페어 구현</b>: Claude Code로 코드를 생성·수정하고, 결과를 검토하며 반복 개선(brainstorm → 설계 → 구현 → 테스트 → 배포 사이클)</li>
    <li><b>검수·배포</b>: 로컬에서 동작을 확인하고 GitHub Pages로 배포, 실데이터로 검증</li>
  </ul>

  <h2>주요 기능</h2>
  <div class="row">
    <div>
      <ul>
        <li>맛집 글쓰기(사진 업로드 + 클라이언트 압축)</li>
        <li>추천 기반 랭킹(시상대 UI)</li>
        <li>구글 로그인(Firebase Auth)</li>
      </ul>
    </div>
    <div>
      <ul>
        <li>계정별 1표 추천 / 소유권 기반 글·댓글 삭제</li>
        <li>상세 화면 + 실시간 댓글</li>
        <li>반응형(모바일) + 사용법 가이드 내장</li>
      </ul>
    </div>
  </div>

  <h2>기술 스택</h2>
  <div>
    <span class="tag">HTML</span><span class="tag">CSS</span><span class="tag">Vanilla JS (ES Modules)</span>
    <span class="tag">Firebase Authentication</span><span class="tag">Cloud Firestore</span><span class="tag">GitHub Pages</span>
    <span class="tag">Claude Code (AI 페어 프로그래밍)</span>
  </div>

  <h2>문제 해결 · 성과</h2>
  <ul>
    <li><b>비용 제약 해결</b>: 이미지 저장소(Firebase Storage)가 유료로 전환되는 이슈를, 사진을 압축해 데이터베이스(Firestore)에 직접 저장하는 방식으로 우회 → <b>무료 등급 유지</b></li>
    <li><b>보안 설계</b>: 서버 보안 규칙으로 "본인/관리자만 삭제", "계정별 1표" 등 권한을 강제. 개인정보는 이메일 미저장(식별자만 저장)</li>
    <li><b>빠른 반복</b>: 기획→구현→테스트→배포를 짧은 사이클로 반복해 <b>당일 배포</b> 및 기능 확장(로그인·댓글·디자인 개선)까지 완료</li>
  </ul>

  <div class="foot">제작 방식: AI 페어 프로그래밍(Claude Code) 활용 · 2026.06 · 본 문서는 프로젝트 요약 카드</div>
</body>
</html>
```

- [ ] **Step 3: .gitignore 커밋**

```bash
git add .gitignore
git commit -m "chore: resume/ 폴더를 git 추적에서 제외(로컬 전용)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

(주의: `resume/ai-card.html`은 커밋하지 않는다 — 로컬 전용.)

---

## Task 2: PDF 생성 + 확인

**Files:**
- Create: `resume/맛킷리스트_AI역량.pdf` (로컬, 커밋 안 함)

**Interfaces:**
- Consumes: `resume/ai-card.html`

- [ ] **Step 1: 헤드리스 Chrome으로 PDF 생성**

Run:
```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="z:/NewClaude/resume/맛킷리스트_AI역량.pdf" "z:/NewClaude/resume/ai-card.html"
```
Expected: `resume/맛킷리스트_AI역량.pdf` 생성. (출력에 "Printed to ..." 또는 무출력 후 파일 생성)

- [ ] **Step 2: 생성 확인**

Run: `ls -la "z:/NewClaude/resume/"`
Expected: `맛킷리스트_AI역량.pdf` 파일이 0바이트가 아님(수십 KB 이상).

- [ ] **Step 3: 사용자 육안 확인**

사용자가 `z:\NewClaude\resume\맛킷리스트_AI역량.pdf`를 열어 1페이지로 깔끔하게 떨어지는지, 한글 깨짐 없는지, 내용이 정직한지 확인. 문제 있으면 HTML 수정 후 재생성.

---

## Self-Review 결과
- **Spec 커버리지:** A4 1페이지·한국어·단일컬럼(HTML @page/스타일), AI 활용 역량 중심·Claude Code 명시(헤더·역할·스택·푸터), 6개 섹션(개요/역할/기능/스택/문제해결/푸터), 라이브 URL, 이름·연락처 미포함, resume/ gitignore·로컬 전용, 헤드리스 Chrome 생성(T2). 모두 매핑됨.
- **Placeholder 스캔:** 실제 HTML·명령 포함. 없음.
- **일관성:** 파일 경로 `resume/ai-card.html`·`resume/맛킷리스트_AI역량.pdf`가 T1·T2에서 일치. Chrome 경로는 환경 확인됨.
