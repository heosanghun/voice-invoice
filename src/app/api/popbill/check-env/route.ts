/**
 * 팝빌 환경변수 로드 여부 확인 (디버깅용)
 * 인증 불필요. 배포 시 삭제 권장.
 */
import { NextResponse } from "next/server";

export async function GET() {
  const hasLinkId = !!process.env.POPBILL_LINKID;
  const hasSecretKey = !!process.env.POPBILL_SECRET_KEY;
  const ok = hasLinkId && hasSecretKey;

  return NextResponse.json({
    ok,
    message: ok
      ? "환경변수 로드됨. 설정 페이지를 새로고침해 보세요."
      : "환경변수가 로드되지 않았습니다. .env.local 확인 후 서버를 재시작하세요.",
  });
}
