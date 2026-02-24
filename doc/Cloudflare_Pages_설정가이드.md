# Cloudflare Pages 설정 가이드 (voice-invoice)

---

## 1. 빌드 구성 - 수정 필요

### ❌ 잘못된 설정
| 항목 | 잘못된 값 | 이유 |
|------|-----------|------|
| 빌드 출력 디렉터리 | `/build` | Next.js는 `build` 폴더를 사용하지 않음 |

### ✅ 올바른 설정

현재 프로젝트는 **API 라우트, 인증, 파일 저장**을 사용하므로 **정적(Static) 배포가 불가능**합니다.

**옵션 A: Cloudflare Next.js 어댑터 사용 (권장)**

| 항목 | 값 |
|------|-----|
| 프레임워크 미리 설정 | **Next.js** (드롭다운에서 선택) |
| 빌드 명령 | `npx @cloudflare/next-on-pages@1` |
| 빌드 출력 디렉터리 | `.vercel/output/static` |

> ⚠️ 이 방식은 프로젝트에 `@cloudflare/next-on-pages` 설정 추가가 필요합니다.

**옵션 B: 정적 내보내기 (제한적 - API/인증 미동작)**

API·인증이 동작하지 않습니다. 데모용으로만 사용 가능.

| 항목 | 값 |
|------|-----|
| 빌드 명령 | `npm run build` |
| 빌드 출력 디렉터리 | `out` |

> `next.config.ts`에 `output: 'export'` 추가 필요. API 라우트는 사용 불가.

---

## 2. 환경변수 - 오타 수정 필요

캡처에서 확인된 오타:

| 잘못된 이름 | 올바른 이름 |
|-------------|-------------|
| `BEMINI_API_KEY` | **`GEMINI_API_KEY`** |
| `POPBILL_LINK_ID` | **`POPBILL_LINKID`** (언더스코어 없음) |

### 필수 환경변수 목록

| 변수명 | 설명 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API 키 |
| `AUTH_SECRET` | JWT 시크릿 (강력한 랜덤 문자열) |
| `POPBILL_LINKID` | 팝빌 링크아이디 |
| `POPBILL_SECRET_KEY` | 팝빌 비밀키 |
| `POPBILL_IS_TEST` | `true` (테스트) / `false` (운영) |

---

## 3. 권장: Vercel 사용

현재 프로젝트(API 라우트, 인증, 파일 저장)는 **Vercel**이 더 적합합니다.

- Next.js 기본 지원
- `npm run build` + 자동 감지
- 별도 어댑터 없이 배포 가능

Cloudflare Pages로 배포하려면 `@cloudflare/next-on-pages` 설정이 필요하며, `data/users.json` 파일 저장은 Cloudflare Workers 환경에서 **지원되지 않아** DB 전환이 필요합니다.

---

## 4. 요약

| 설정 | 현재(캡처) | 수정 |
|------|-------------|------|
| 빌드 명령 | `npm run build` | Next.js 어댑터 사용 시 `npx @cloudflare/next-on-pages@1` |
| 출력 디렉터리 | `/build` | `.vercel/output/static` (어댑터) 또는 `out` (정적) |
| BEMINI_API_KEY | ❌ | `GEMINI_API_KEY`로 수정 |
| POPBILL_LINK_ID | ❌ | `POPBILL_LINKID`로 수정 |
