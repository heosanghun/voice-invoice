# .env 및 Supabase 적용 가이드

> voice-invoice 프로젝트의 `.env` 항목 정리와 Supabase 적용 방법입니다.

---

## 1. .env 전체 내용 정리

| 변수명 | 용도 | 현재 코드 사용 여부 |
|--------|------|---------------------|
| `GEMINI_API_KEY` | Google Gemini API (음성/텍스트 분석, 지원금 검색) | ✅ 사용 중 |
| `OPENAI_API_KEY` | OpenAI API | ❌ 코드에서 미사용 |
| `POPBILL_LINKID` | 팝빌 링크아이디 (세금계산서 발행) | ✅ 사용 중 |
| `POPBILL_SECRET_KEY` | 팝빌 비밀키 | ✅ 사용 중 |
| `POPBILL_IS_TEST` | 팝빌 테스트 모드 | ✅ 사용 중 |
| `SUPABASE_URL` | Supabase 프로젝트 URL | ✅ 설정 시 회원/사업자 저장소로 사용 |
| `SUPABASE_ACCESS_TOKEN` | Supabase 키(anon 또는 service_role) | ✅ 설정 시 사용 |

**참고:** `AUTH_SECRET`은 `.env`에 없고, 로컬에서는 기본값이 쓰이며 **Vercel에서는 대시보드에서만 설정**합니다.

---

## 2. 코드에서 어디에 어떻게 쓰이는지

### 2-1. 사용 중인 변수

| 변수 | 사용 위치 | 용도 |
|------|-----------|------|
| `GEMINI_API_KEY` | `src/app/api/analyze-profile/route.ts`, `analyze-profile-text`, `analyze-text`, `analyze-voice`, `find-subsidies` | 음성/텍스트 분석, 지원금 검색 |
| `POPBILL_LINKID` | `src/app/api/popbill/*`, `issue-invoice/route.ts` | 팝빌 API 인증 |
| `POPBILL_SECRET_KEY` | 위와 동일 | 팝빌 API 인증 |
| `POPBILL_IS_TEST` | 위와 동일 | 테스트/운영 구분 |
| `AUTH_SECRET` | `src/lib/auth.ts` | JWT 서명 (로그인/세션) |

### 2-2. 미사용 변수

- **OPENAI_API_KEY**  
  - 코드 어디에서도 읽지 않음.  
  - Gemini만 사용 중이면 제거해도 되고, 나중에 OpenAI 기능 추가 시 사용 가능.

- **SUPABASE_URL, SUPABASE_ACCESS_TOKEN**  
  - **둘 다 설정되어 있으면** 회원/사업자 정보를 **Supabase `users` 테이블**에 저장합니다.  
  - 없으면 기존처럼 **파일**(로컬 `data/users.json`, Vercel `/tmp`)에 저장합니다.  
  - Supabase 사용 시 **`doc/supabase_schema.sql`**을 Supabase 대시보드 → SQL Editor에서 한 번 실행해 테이블을 생성해야 합니다.

---

## 3. Vercel에 적용하는 방법

### 3-1. 반드시 넣어야 하는 값 (배포 동작용)

1. **Vercel 대시보드** → 프로젝트 선택 → **Settings** → **Environment Variables**
2. 아래 변수를 **Production(필요 시 Preview)** 에 추가.

| 변수명 | 값 | 비고 |
|--------|-----|------|
| `AUTH_SECRET` | 32자 이상 랜덤 문자열 (base64 등) | 로컬 .env에 없어도 됨. Vercel에서만 설정 |
| `GEMINI_API_KEY` | 로컬 .env와 동일한 값 또는 새 키 | |
| `POPBILL_LINKID` | 로컬 .env와 동일 | |
| `POPBILL_SECRET_KEY` | 로컬 .env와 동일 | |
| `POPBILL_IS_TEST` | `true` 또는 `false` | |

### 3-2. 선택 사항 (현재는 미사용)

- **OPENAI_API_KEY**  
  - 나중에 OpenAI 쓰려면 Vercel에도 같은 이름으로 추가하면 됨.  
  - 지금은 없어도 배포/동작에는 영향 없음.

- **SUPABASE_URL, SUPABASE_ACCESS_TOKEN**  
  - **지금 코드는 Supabase를 쓰지 않으므로** Vercel에 넣어도 사용처가 없음.  
  - **Supabase를 연동하는 코드를 추가한 뒤** 그때 Vercel에 아래처럼 넣으면 됨.

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase 프로젝트 URL |
| `SUPABASE_ACCESS_TOKEN` | `sbp_xxxx...` | Supabase 대시보드에서 발급한 토큰 (또는 anon key 등 코드에서 쓰는 키) |

---

## 4. Supabase를 “어디에 어떻게” 적용할 수 있는지

### 4-1. 현재 상태

- `.env`에는 **SUPABASE_URL**, **SUPABASE_ACCESS_TOKEN** 이 있음.
- **코드에는 Supabase 클라이언트나 이 환경변수를 읽는 부분이 없음.**  
  → 아직 “적용”된 곳이 없음.

### 4-2. 적용 예시 (추후 연동 시)

Supabase를 쓰려면 **코드 추가**가 먼저 필요합니다. 적용 가능한 위치 예시는 아래와 같습니다.

| 적용 위치 | 내용 |
|-----------|------|
| **회원/사업자 정보 저장** | `src/lib/auth.ts`에서 `data/users.json` 대신 Supabase(Postgres) 테이블에 사용자·사업자 정보 저장. Vercel `/tmp` 휘발성 문제 해결. |
| **지원금 검색 결과 캐시** | `find-subsidies` API에서 자주 쓰는 검색 결과를 Supabase DB나 캐시에 저장. |
| **세금계산서 발행 이력** | 발행 로그/이력을 Supabase 테이블에 저장. |

### 4-3. Supabase 연동 시 필요한 것

1. **패키지 설치**  
   ```bash
   npm install @supabase/supabase-js
   ```

2. **환경변수 사용**  
   - 서버 코드(API 라우트 등)에서  
     `process.env.SUPABASE_URL`, `process.env.SUPABASE_ACCESS_TOKEN` (또는 `SUPABASE_ANON_KEY` 등) 읽어서 Supabase 클라이언트 생성.

3. **Vercel 적용**  
   - 위 3-2처럼 Vercel Environment Variables에  
     `SUPABASE_URL`, `SUPABASE_ACCESS_TOKEN` (또는 사용하는 키 이름) 추가.

4. **Supabase 대시보드**  
   - 프로젝트 URL: **Settings → API** 에서 확인.  
   - **키는 반드시 "Project API keys"의 anon (public) 또는 service_role 키를 사용.**  
   - `sbp_xxx` 형태의 **Personal Access Token은 DB 접근용이 아니므로 사용하지 말 것.**  
   - "Invalid API key" 오류가 나면 → Vercel/로컬 env에서 **SUPABASE_ACCESS_TOKEN** 값을 Supabase **Dashboard → Project Settings → API → anon public** 키로 교체.

### 4-4. "Invalid API key"가 나올 때

- 회원가입/로그인 시 **Invalid API key**가 뜨면, Supabase에 넣은 키가 잘못된 경우입니다.
- **해결:** Supabase 대시보드 → **Project Settings** → **API** → **Project API keys**에서  
  - **anon public** 키를 복사해  
  - Vercel(및 로컬 `.env`)의 **SUPABASE_ACCESS_TOKEN** 값으로 넣고 저장 후 재배포.
- 키를 수정하기 전까지는, 코드에서 **Supabase 오류 시 자동으로 파일 저장소로 폴백**하므로 회원가입·로그인은 동작합니다 (데이터는 Vercel에서는 `/tmp`, 로컬에서는 `data/users.json`).

---

## 5. 요약

| 구분 | 내용 |
|------|------|
| **.env에 있는 것** | GEMINI, OPENAI, POPBILL 3종, SUPABASE 2종. AUTH_SECRET은 로컬 기본값 또는 별도 관리. |
| **실제 쓰이는 것** | AUTH_SECRET, GEMINI_API_KEY, POPBILL_* (Vercel에 반드시 설정). |
| **Supabase** | .env에만 있고 **코드에는 미적용**. 연동하려면 Supabase 클라이언트 코드 추가 후, 같은 값을 Vercel 환경 변수에 넣으면 됨. |
| **Vercel 적용** | Settings → Environment Variables에 위 “사용 중인” 변수들 넣고, (선택) OPENAI/Supabase는 나중에 기능 추가 시 추가. |

---

*최종 업데이트: 2026-02-24*
