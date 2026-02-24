import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { verifyToken, getUserById, updateUser } from "@/lib/auth";

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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      corpNum,
      corpName,
      ceoName,
      addr,
      bizType,
      bizClass,
      contactName,
      contactEmail,
      contactTel,
    } = body as Record<string, string>;

    if (
      !corpNum ||
      !corpName ||
      !ceoName ||
      !addr ||
      !bizType ||
      !bizClass ||
      !contactName ||
      !contactEmail ||
      !contactTel
    ) {
      return NextResponse.json(
        { error: "모든 필드를 입력해 주세요." },
        { status: 400 }
      );
    }

    const cleanCorpNum = corpNum.replace(/-/g, "");
    if (cleanCorpNum.length !== 10) {
      return NextResponse.json(
        { error: "사업자번호는 10자리여야 합니다." },
        { status: 400 }
      );
    }

    const taxinvoiceService = getPopbill();
    const popbillUserId = `user_${user.id}`;
    const popbillPassword = `Pw${Date.now().toString(36)}!`;

    const joinForm = {
      ID: popbillUserId,
      Password: popbillPassword,
      LinkID: process.env.POPBILL_LINKID,
      CorpNum: cleanCorpNum,
      CEOName: ceoName,
      CorpName: corpName,
      Addr: addr,
      BizType: bizType,
      BizClass: bizClass,
      ContactName: contactName,
      ContactEmail: contactEmail,
      ContactTEL: contactTel.replace(/-/g, ""),
    };

    await new Promise<void>((resolve, reject) => {
      taxinvoiceService.joinMember(
        joinForm,
        () => resolve(),
        (err: { code: number; message: string }) =>
          reject(new Error(`[${err.code}] ${err.message}`))
      );
    });

    await updateUser(userId, {
      corpNum: cleanCorpNum,
      corpName,
      ceoName,
      addr,
      bizType,
      bizClass,
      contactName,
      contactEmail,
      contactTel,
      popbillRegistered: true,
      popbillUserId,
    });

    return NextResponse.json({
      success: true,
      message: "사업자 등록이 완료되었습니다. 이제 인증서를 등록해 주세요.",
    });
  } catch (err) {
    console.error("register-business error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "사업자 등록 실패" },
      { status: 500 }
    );
  }
}
