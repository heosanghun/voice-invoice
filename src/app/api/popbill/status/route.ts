import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getUserById } from "@/lib/auth";

function getPopbill() {
  const popbill = require("popbill");
  const linkId = process.env.POPBILL_LINKID;
  const secretKey = process.env.POPBILL_SECRET_KEY;
  const isTest = process.env.POPBILL_IS_TEST !== "false";

  if (!linkId || !secretKey) {
    return null;
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
      return NextResponse.json({
        popbillConfigured: false,
        user: null,
        popbillRegistered: false,
        certRegistered: false,
      });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({
        popbillConfigured: false,
        user: null,
        popbillRegistered: false,
        certRegistered: false,
      });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({
        popbillConfigured: false,
        user: null,
        popbillRegistered: false,
        certRegistered: false,
      });
    }

    // 환경변수만 있으면 폼 표시 (SDK 초기화 실패 시에도 Vercel 등에서 폼 노출)
    const hasPopbillKeys = !!(
      process.env.POPBILL_LINKID?.trim() &&
      process.env.POPBILL_SECRET_KEY?.trim()
    );
    let taxinvoiceService: ReturnType<typeof getPopbill> = null;
    try {
      taxinvoiceService = getPopbill();
    } catch {
      // SDK 초기화 실패해도 키가 있으면 popbillConfigured: true 로 폼 표시
    }

    let certExpireDate: string | null = null;
    if (taxinvoiceService && user.corpNum) {
      try {
        certExpireDate = await new Promise<string | null>((resolve) => {
          taxinvoiceService!.getCertificateExpireDate(
            user.corpNum!,
            (date: string) => resolve(date),
            () => resolve(null)
          );
        });
      } catch {
        certExpireDate = null;
      }
    }

    return NextResponse.json({
      popbillConfigured: hasPopbillKeys || !!taxinvoiceService,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        corpNum: user.corpNum,
        corpName: user.corpName,
      },
      popbillRegistered: user.popbillRegistered ?? false,
      certRegistered: !!certExpireDate,
      certExpireDate,
    });
  } catch {
    return NextResponse.json({
      popbillConfigured: false,
      user: null,
      popbillRegistered: false,
      certRegistered: false,
    });
  }
}
