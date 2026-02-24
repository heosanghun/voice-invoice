# 팝빌 POPBILL_LINKID, POPBILL_SECRET_KEY 설정 가이드

> `.env.local`에 팝빌 API 키를 넣는 방법을 **단계별로** 설명합니다.

---

## 1단계: 팝빌에서 LinkID와 SecretKey 발급받기

### 1-1. 팝빌 연동신청 페이지 접속

1. 브라우저에서 아래 주소로 이동합니다.
   ```
   https://developers.popbill.com/partner-request
   ```

2. **API 상품**에서 **전자세금계산서**를 선택합니다.

3. **회사정보**를 입력합니다.
   - 회사명, 사업자번호, 주소 등

4. **담당자 정보**를 입력합니다.
   - 이름, 이메일, 연락처

5. **자동입력 방지 문자**를 입력하고, **개인정보 수집 및 이용에 동의** 체크 후 **신청하기**를 클릭합니다.

### 1-2. 이메일로 전달받기

- 신청 후 **순차적으로** LinkID와 SecretKey가 **이메일로 발급**됩니다.
- 일반적으로 1~2 영업일 내 발급됩니다.
- 이메일 내용 예시:
  ```
  LinkID: TESTER
  SecretKey: SwWxqU+0Tpa...
  ```

### 1-3. (이미 발급받았다면) 팝빌 회원 페이지에서 확인

- https://www.popbill.com 로그인
- **회원정보** → **API 연동정보** 또는 **개발자센터** 메뉴에서 LinkID, SecretKey 확인 가능

---

## 2단계: .env.local 파일 열기

### 2-1. 파일 위치

프로젝트 **루트 폴더**에 있는 `.env.local` 파일입니다.

```
d:\AI\jonan\.env.local
```

### 2-2. 열기 방법

- **VS Code / Cursor**: 왼쪽 파일 탐색기에서 `d:\AI\jonan\.env.local` 더블클릭
- **파일 탐색기**: `d:\AI\jonan` 폴더에서 `.env.local` 파일 찾기 (숨김 파일 표시 필요 시)

### 2-3. 파일이 없다면

- 프로젝트 루트에 `.env.local` 파일을 새로 만듭니다.
- `.env.local.example`을 복사해 `.env.local`로 만들고, 그 안에서 값을 수정해도 됩니다.

---

## 3단계: .env.local에 값 입력하기

### 3-1. 주석 처리 해제하기

현재 `.env.local`에 아래처럼 **주석(#)** 이 되어 있으면:

```env
# POPBILL_LINKID=
# POPBILL_SECRET_KEY=
```

**맨 앞의 `#`을 제거**합니다.

### 3-2. 실제 값 입력하기

```env
POPBILL_LINKID=발급받은링크아이디
POPBILL_SECRET_KEY=발급받은비밀키
```

**예시** (실제 발급받은 값으로 교체):

```env
POPBILL_LINKID=TESTER
POPBILL_SECRET_KEY=SwWxqU+0Tpa0E2xW1AAE...
```

### 3-3. 입력 시 주의사항

| 항목 | 설명 |
|------|------|
| **등호(=)** | `=` 앞뒤에 **공백 없이** 작성 |
| **따옴표** | 값에 공백이 없으면 따옴표 불필요. 공백이 있으면 `"값"` 형태로 |
| **줄바꿈** | 한 줄에 하나의 변수만 |
| **복사 시** | 이메일에서 복사할 때 앞뒤 공백, 줄바꿈이 들어가지 않도록 주의 |

### 3-4. 잘못된 예 vs 올바른 예

**잘못된 예:**
```env
POPBILL_LINKID = TESTER          ← 등호 앞뒤 공백
POPBILL_SECRET_KEY="SwWxqU..."   ← 끝에 세미콜론(;) 있으면 안 됨
# POPBILL_LINKID=TESTER          ← 주석(#)이 있으면 적용 안 됨
```

**올바른 예:**
```env
POPBILL_LINKID=TESTER
POPBILL_SECRET_KEY=SwWxqU+0Tpa0E2xW1AAE
```

### 3-5. 테스트/운영 환경 선택 (선택 사항)

- 기본값은 **테스트 환경**입니다.
- 실제 국세청으로 보내려면 아래를 추가하고 `false`로 설정합니다.

```env
POPBILL_IS_TEST=false
```

- 추가하지 않으면 `true`(테스트)로 동작합니다.

---

## 4단계: 저장 및 서버 재시작

### 4-1. 파일 저장

- `Ctrl + S`로 `.env.local` 저장

### 4-2. 개발 서버 재시작

환경변수는 **서버 시작 시** 로드되므로, **반드시 재시작**해야 합니다.

1. 터미널에서 실행 중인 `npm run dev`를 **Ctrl + C**로 중지
2. 다시 실행:
   ```bash
   npm run dev
   ```

---

## 5단계: 설정이 잘 되었는지 확인하기

### 5-1. 설정 페이지에서 확인

1. 브라우저에서 `http://localhost:3000/settings` 접속
2. **로그인**된 상태여야 합니다.
3. 페이지 상단에 **노란색 경고 박스**가 없고, **사업자 등록** 폼이 보이면 정상입니다.

### 5-2. 경고가 보이는 경우

- **"POPBILL_LINKID, POPBILL_SECRET_KEY가 설정되지 않았습니다"** → `.env.local`에 값이 없거나, 주석 처리되어 있거나, 서버를 재시작하지 않은 경우
- **"로그인이 필요합니다"** → `/login`에서 로그인 후 다시 시도

---

## 요약 체크리스트

| # | 작업 | 완료 |
|---|------|:----:|
| 1 | https://developers.popbill.com/partner-request 에서 연동신청 | ☐ |
| 2 | 이메일로 LinkID, SecretKey 수신 | ☐ |
| 3 | `d:\AI\jonan\.env.local` 파일 열기 | ☐ |
| 4 | `#` 제거 후 `POPBILL_LINKID=실제값` 입력 | ☐ |
| 5 | `#` 제거 후 `POPBILL_SECRET_KEY=실제값` 입력 | ☐ |
| 6 | 파일 저장 (Ctrl+S) | ☐ |
| 7 | `npm run dev` 재시작 | ☐ |
| 8 | `/settings` 접속 후 노란 경고 없음 확인 | ☐ |

---

## 참고 링크

- [팝빌 연동신청](https://developers.popbill.com/partner-request)
- [팝빌 개발자센터](https://developers.popbill.com)
- [전자세금계산서 Node.js SDK](https://developers.popbill.com/reference/taxinvoice/node/getting-started/tutorial)
