# Vercel 설정 및 배포 가이드

> voice-invoice 프로젝트를 Vercel에 배포하는 전체 절차입니다.  
> 공식 문서: https://vercel.com/docs

---

## 1. 사전 준비

### 1-1. Vercel 계정

- **회원가입**: https://vercel.com/signup
- **로그인**: https://vercel.com/login
- GitHub, GitLab, Bitbucket 또는 이메일로 가입 가능
- **GitHub 연동 권장**: 저장소 자동 연결 및 푸시 시 자동 배포

### 1-2. GitHub 저장소

- 코드가 `heosanghun/voice-invoice` 등 GitHub 저장소에 푸시되어 있어야 함
- Vercel이 해당 저장소에 **읽기 권한**이 있어야 함 (GitHub 연동 시 자동 부여)

---

## 2. 프로젝트 생성 및 배포 (대시보드)

### 2-1. 새 프로젝트 시작

1. **https://vercel.com** 접속 후 로그인
2. 우측 상단 **Add New** → **Project** 클릭  
   - 또는 **https://vercel.com/new** 직접 접속
3. Git 제공자 선택 (예: GitHub)
4. 저장소 목록에서 **`heosanghun/voice-invoice`** 선택
5. **Import** 클릭

### 2-2. 프로젝트 설정 화면

다음 화면에서 설정을 확인·수정합니다.

| 항목 | 기본값 | voice-invoice 권장 |
|------|--------|---------------------|
| **Project Name** | 저장소 이름 | `voice-invoice` (원하는 대로 변경 가능) |
| **Framework Preset** | Next.js (자동 감지) | 그대로 유지 |
| **Root Directory** | `./` | 그대로 유지 |
| **Build Command** | `npm run build` | 그대로 유지 |
| **Output Directory** | (Next.js 자동) | 그대로 유지 |
| **Install Command** | `npm install` | 그대로 유지 |

### 2-3. 환경 변수 설정

**Environment Variables** 섹션에서 아래 변수를 추가합니다.

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `AUTH_SECRET` | JWT 서명용 시크릿 (32자 이상) | `openssl rand -base64 32`로 생성 |
| `GEMINI_API_KEY` | Google Gemini API 키 | `AIza...` |
| `POPBILL_LINKID` | 팝빌 링크아이디 | 팝빌 개발자센터에서 발급 |
| `POPBILL_SECRET_KEY` | 팝빌 비밀키 | 팝빌 개발자센터에서 발급 |
| `POPBILL_IS_TEST` | 테스트 모드 여부 | `true` (테스트) / `false` (운영) |

**적용 환경**:
- **Production**: 실제 서비스용
- **Preview**: PR/브랜치 미리보기용
- 필요 시 둘 다 선택

**AUTH_SECRET 생성 예시 (PowerShell)**:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

### 2-4. 배포 실행

1. 모든 설정 확인 후 **Deploy** 클릭
2. 빌드 로그 확인 (1~3분 소요)
3. 완료 시 **Visit** 버튼으로 배포 URL 접속

---

## 3. 배포 후 설정 (프로젝트 설정)

### 3-1. 프로젝트 설정 접근

1. **https://vercel.com/dashboard** 접속
2. 해당 프로젝트 클릭
3. 상단 **Settings** 탭 선택

### 3-2. 환경 변수 추가/수정

1. **Settings** → **Environment Variables**
2. **Add New** 클릭
3. Name, Value 입력 후 적용 환경(Production/Preview/Development) 선택
4. **Save** 클릭
5. 변경 사항은 **새 배포**에만 반영됨 → 필요 시 **Redeploy** 실행

### 3-3. 빌드 설정

1. **Settings** → **General** → **Build & Development Settings**
2. 필요 시 수정:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: (Next.js는 자동)
   - **Root Directory**: `./` (모노레포가 아닌 경우)
   - **Node.js Version**: 18.x 또는 20.x (기본값 사용 가능)

### 3-4. 프로덕션 브랜치

1. **Settings** → **Git** → **Production Branch**
2. 기본값: `main` (저장소 기본 브랜치)
3. `main`에 머지되면 자동으로 Production 배포

---

## 4. 배포 관리

### 4-1. 배포 목록

1. 프로젝트 대시보드 → **Deployments** 탭
2. 각 배포별로:
   - 상태 (Ready, Building, Error)
   - 트리거된 커밋
   - 배포 URL
   - 로그 확인 가능

### 4-2. 재배포 (Redeploy)

1. **Deployments** → 해당 배포 선택
2. 우측 상단 **⋯** 메뉴 → **Redeploy**
3. **Redeploy with existing Build Cache** 또는 **Redeploy without cache** 선택

### 4-3. 수동 배포 (Git 참조)

1. **Deployments** → **Create Deployment**
2. **Branch** 또는 **Commit SHA** 입력
3. **Deploy** 클릭

---

## 5. CLI로 배포 (선택)

### 5-1. Vercel CLI 설치

```bash
npm i -g vercel
```

### 5-2. 로그인

```bash
vercel login
```

### 5-3. 프로젝트 루트에서 배포

```bash
cd d:\AI\jonan
vercel          # Preview 배포
vercel --prod   # Production 배포
```

최초 실행 시 프로젝트 연결, 환경 변수 등 설정 질문이 나옵니다.

---

## 6. voice-invoice 프로젝트 체크리스트

| # | 항목 | 완료 |
|---|------|:----:|
| 1 | Vercel 계정 생성 및 GitHub 연동 | ☐ |
| 2 | `heosanghun/voice-invoice` 저장소 Import | ☐ |
| 3 | `AUTH_SECRET` 설정 (32자 이상) | ☐ |
| 4 | `GEMINI_API_KEY` 설정 | ☐ |
| 5 | `POPBILL_LINKID`, `POPBILL_SECRET_KEY` 설정 | ☐ |
| 6 | `POPBILL_IS_TEST` 설정 (테스트: true, 운영: false) | ☐ |
| 7 | Deploy 실행 및 빌드 성공 확인 | ☐ |
| 8 | 배포 URL 접속하여 동작 확인 | ☐ |

---

## 7. 참고 링크

| 용도 | URL |
|------|-----|
| Vercel 메인 | https://vercel.com |
| 대시보드 | https://vercel.com/dashboard |
| 새 프로젝트 | https://vercel.com/new |
| 공식 문서 | https://vercel.com/docs |
| Git 연동 | https://vercel.com/docs/git |
| 환경 변수 | https://vercel.com/docs/environment-variables |
| 빌드 설정 | https://vercel.com/docs/deployments/configure-a-build |
| Next.js 가이드 | https://vercel.com/docs/frameworks/nextjs |

---

*최종 업데이트: 2026-02-24*
