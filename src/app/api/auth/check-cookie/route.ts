import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserById } from "@/lib/auth";

/**
 * 디버깅: 요청에 auth 쿠키가 있는지, 토큰이 유효한지 확인합니다.
 * 문제 해결 후 제거하거나 인증 필요로 보호하는 것을 권장합니다.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth")?.value;
  const hasCookie = !!token;
  let valid = false;
  let userId: string | null = null;
  let userEmail: string | null = null;

  if (token) {
    userId = await verifyToken(token);
    if (userId) {
      valid = true;
      const user = await getUserById(userId);
      userEmail = user?.email ?? null;
    }
  }

  return NextResponse.json({
    hasCookie,
    tokenValid: valid,
    userId,
    userEmail,
    message: hasCookie
      ? valid
        ? "쿠키 있음, 토큰 유효함. 사업자 등록 요청 시 쿠키가 전달되어야 합니다."
        : "쿠키 있음, but 토큰 무효(만료 또는 AUTH_SECRET 불일치). 로그인 다시 하세요."
      : "쿠키 없음. 같은 주소(voice-invoice-hyo4.vercel.app)에서 로그인하세요.",
  });
}
