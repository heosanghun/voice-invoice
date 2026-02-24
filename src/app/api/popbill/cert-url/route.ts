import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserById } from "@/lib/auth";

function getPopbill() {
  const popbill = require("popbill");
  const linkId = process.env.POPBILL_LINKID;
  const secretKey = process.env.POPBILL_SECRET_KEY;
  const isTest = process.env.POPBILL_IS_TEST !== "false";

  if (!linkId || !secretKey) {
    throw new Error("POPBILL_LINKID, POPBILL_SECRET_KEY가 설정되지 않았습니다.");
  }

  popbill.config({
    LinkID: linkId,
    SecretKey: secretKey,
    IsTest: isTest,
    defaultErrorHandler: () => {},
  });

  return popbill.TaxinvoiceService();
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth")?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 401 });
    }

    if (!user.corpNum || !user.popbillRegistered) {
      return NextResponse.json(
        { error: "먼저 사업자 등록을 완료해 주세요." },
        { status: 400 }
      );
    }

    const taxinvoiceService = getPopbill();

    const url = await new Promise<string>((resolve, reject) => {
      taxinvoiceService.getTaxCertURL(
        user.corpNum!,
        user.popbillUserId ?? "",
        (certUrl: string) => resolve(certUrl),
        (err: { code: number; message: string }) =>
          reject(new Error(`[${err.code}] ${err.message}`))
      );
    });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("cert-url error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "인증서 URL 조회 실패" },
      { status: 500 }
    );
  }
}
