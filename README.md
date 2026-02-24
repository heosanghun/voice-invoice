# 음성 세금계산서 & 맞춤형 지원금 찾기

음성으로 세금계산서를 발행하고, 소상공인 맞춤형 정부지원금을 찾는 B2B SaaS 웹 서비스 MVP입니다.

## 기능

- **음성 세금계산서**: 마이크로 말하면 Gemini API가 분석하여 세금계산서 초안 생성 → 사용자 확인 후 발행
- **맞춤형 지원금 찾기**: 사업장 정보(지역, 업종, 창업일, 연령) 입력 또는 음성 검색 → AI가 맞춤 지원금 추천

## 기술 스택

- Next.js 16 (App Router), TypeScript, TailwindCSS, lucide-react
- Google Gemini API (gemini-1.5-flash)
- Popbill/Barobill (세금계산서 발행, Mock 구현)

## 시작하기

### 1. 환경변수 설정

`.env.local.example`을 참고하여 `.env.local`을 생성하고 Gemini API 키를 설정하세요.

```bash
cp .env.local.example .env.local
# .env.local에 GEMINI_API_KEY=your_key 입력
```

### 2. 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

### 3. 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 메인 (세금계산서)
│   ├── subsidies/page.tsx     # 지원금 찾기
│   └── api/
│       ├── analyze-voice/     # 음성 → 세금계산서 JSON
│       ├── analyze-profile/   # 음성 → 사업장 정보 JSON
│       ├── find-subsidies/    # 지원금 AI 매칭
│       └── issue-invoice/     # 세금계산서 발행 (Mock)
├── components/
│   └── InvoiceForm.tsx
└── types/
    ├── invoice.ts
    └── subsidy.ts
```

## 실제 팝빌 연동

실제 세금계산서 발행을 위해 [팝빌](https://www.popbill.com) 회원가입 후 API Key와 인증서를 `.env.local`에 설정하고, `src/app/api/issue-invoice/route.ts`의 Mock 코드를 팝빌 SDK 호출로 교체하세요.
