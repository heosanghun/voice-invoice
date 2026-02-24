# Cloudflare 배포 설정 확인

## 1. 설정 확인 방법

### package.json
- `@cloudflare/next-on-pages`가 devDependencies에 있는지 확인
```bash
npm list @cloudflare/next-on-pages
```

### Cloudflare Pages 빌드 구성
| 항목 | 값 |
|------|-----|
| 프레임워크 | Next.js |
| 빌드 명령 | `npx @cloudflare/next-on-pages@1` |
| 출력 디렉터리 | `./.vercel/output/static` |

## 2. 주의사항

- **Next.js 16**: @cloudflare/next-on-pages는 공식적으로 Next.js 15.x까지 지원. Next.js 16은 `--legacy-peer-deps`로 설치됨.
- **data/users.json**: Cloudflare Workers/Pages 환경에서는 파일 시스템 쓰기가 불가. DB 전환 필요.
- **Windows**: 로컬 빌드 시 Windows에서 문제가 있을 수 있음. Cloudflare 빌드는 Linux에서 실행됨.

## 3. 배포 후 확인

1. Cloudflare Dashboard → Workers & Pages → voice-invoice
2. 배포 탭에서 빌드 로그 확인
3. 성공 시 배포 URL 접속
