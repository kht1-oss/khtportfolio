# 맛킷리스트 구글 로그인 — 설계 문서

작성일: 2026-06-22
대상: 기존 맛킷리스트 사이트에 구글 로그인 + 소유권 기반 권한 추가

## 한 줄 요약
구글 로그인을 추가해, 글쓰기·추천은 로그인한 사람만 하게 하고, 추천을 계정별 1표로
정확히 하며, 글 삭제는 작성자 본인 또는 관리자(나)만 가능하게 한다. 보기는 자유.

## 확정된 결정
| 항목 | 결정 |
|---|---|
| 인증 | Firebase Authentication, 구글 로그인(팝업) |
| 보기 | 로그인 없이 자유 |
| 글쓰기 | 로그인 필요. 작성자 이름은 **직접 입력 유지** |
| 추천 | 로그인 필요. **계정별 1회(1인 1표)** |
| 삭제 | 작성자 본인 또는 관리자(이메일 `khtc0228@gmail.com`) |
| 관리자 암호 | 기존 `kht1235` 방식 **제거**(로그인 기반으로 대체) |

## 저장 데이터 & 프라이버시
- 글에 **소유자 uid만** 저장(`ownerUid`). uid는 무의미한 무작위 식별자로, 로그인 자격이 아니며
  개인정보를 알아낼 수 없음. **이메일은 글에 저장하지 않는다.**
- 관리자 판별은 저장 데이터가 아니라 **로그인한 본인의 토큰 이메일**(`request.auth.token.email`)을
  보안 규칙이 서버에서 확인 → 이메일이 데이터에 남지 않음.
- 위·변조는 규칙으로 차단: 생성 시 소유자는 본인 uid로만, 삭제는 본인/관리자만.

## 데이터 모델 변경 — `posts` 문서
기존 필드 유지(foodName, author, price, storeName, imageUrl, votes, createdAt) + 추가:
| 필드 | 타입 | 설명 |
|---|---|---|
| `ownerUid` | string | 작성자 구글 계정 uid (삭제 권한 판단용) |
| `voters` | array<string> | 추천한 사용자들의 uid 목록 (1인 1표 + 하트 상태 판단) |

- 신규 글은 `votes: 0`, `voters: []`, `ownerUid: 로그인 uid`로 생성.
- 기존(로그인 이전) 글: `ownerUid`/`voters` 없음 → 소유자 없음으로 간주(관리자만 삭제 가능),
  추천 시 `voters`가 새로 생김. 기존 votes 수치는 유지.

## 인증 흐름 & 화면
- Firebase Auth 구글 provider, `signInWithPopup` 사용. 로그인 상태는 `onAuthStateChanged`로 구독.
- 헤더 우측에 **로그인 영역**:
  - 로그아웃 상태: "구글로 로그인" 버튼
  - 로그인 상태: 사용자 이름 + "로그아웃" 버튼
- 글쓰기 ＋버튼: 로그인 상태에서만 동작. 비로그인 시 클릭하면 "로그인 후 이용해 주세요" 안내(로그인 유도).
- 추천(하트) 버튼:
  - 비로그인: 클릭 시 로그인 안내
  - 로그인: 내 uid가 `voters`에 없으면 🤍(클릭 가능), 있으면 ❤️(비활성)
- 삭제(🗑️) 버튼: 내가 소유자이거나 관리자일 때만 카드에 표시.

## 동작 로직
- **글쓰기**: 로그인 확인 → 기존 입력 검증 → `addDoc`에 `ownerUid`, `voters: []` 포함.
- **추천**: 로그인 확인 → 내 uid가 `voters`에 없을 때만 `updateDoc({ votes: increment(1), voters: arrayUnion(uid) })`.
  기존 localStorage 기기별 기록 방식은 추천에서 제거(계정 기반으로 대체).
- **삭제**: 버튼 노출 자체를 소유자/관리자로 제한 + `deleteDoc`. 규칙이 서버에서 재차 강제.

## 보안 규칙 (방침)
- 읽기: 허용(누구나)
- 생성: `request.auth != null` + `ownerUid == request.auth.uid` + `votes == 0` + `voters == []`
  + 기존 필수 필드 형식 검증
- 수정(추천): `request.auth != null` + `votes == 기존+1` + `voters == 기존 + [내 uid]`
  + 내 uid가 기존 voters에 없음 + votes/voters 외 필드 불변
- 삭제: `request.auth.uid == resource.data.ownerUid` 또는 `request.auth.token.email == 'khtc0228@gmail.com'`

## 사용자 수동 작업 (Firebase 콘솔)
1. Authentication > 시작하기 > **Google** 로그인 사용 설정
2. Authentication > 설정 > 승인된 도메인 > **`kht1-oss.github.io` 추가** (localhost는 기본 포함)
3. 강화된 Firestore 규칙 게시
(작업 시 단계별로 안내한다.)

## 변경 대상 파일
- `mukgit.js` — Auth 초기화/상태구독, 로그인/로그아웃, 글쓰기·추천·삭제 로직, 버튼 노출 제어
- `mukgit.html` — 헤더 로그인 영역 요소
- `mukgit.css` — 로그인/로그아웃 버튼 스타일(분홍 테마 유지)
- `firebase-config.js` — `ADMIN_EMAIL` 추가, 기존 `ADMIN_PASSWORD` 제거
- `firestore.rules` — 위 강화 규칙

## 테스트 (수동 확인)
- 비로그인: 글 보기 OK / ＋버튼·추천 클릭 시 로그인 안내
- 로그인 후: 글쓰기 OK(소유자 기록), 추천 1회 후 ❤️·재추천 차단, 다른 계정으로 로그인 시 다시 추천 가능(1인1표)
- 삭제: 본인 글에만 🗑️ 보이고 삭제됨 / 관리자 계정은 모든 글 🗑️ / 타인은 남의 글 삭제 불가(버튼 없음 + 규칙 차단)
- 라이브(`kht1-oss.github.io`)에서 구글 로그인 정상(승인 도메인 추가 후)
- 기존 디자인(분홍/하트) 유지

## 범위 밖 (YAGNI)
- 이메일/비번 로그인, 프로필 사진 표시, 글 수정, 외부인 전체 차단(게이트)
