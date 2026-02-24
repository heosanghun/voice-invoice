import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
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

    const taxinvoiceService = getPopbill();
    let certExpireDate: string | null = null;

    if (taxinvoiceService && user.corpNum) {
      try {
        certExpireDate = await new Promise<string | null>((resolve) => {
          taxinvoiceService.getCertificateExpireDate(
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
      popbillConfigured: !!taxinvoiceService,
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
