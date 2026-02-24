import { NextRequest, NextResponse } from "next/server";
import type { InvoiceData } from "@/types/invoice";
import { verifyToken, getUserById } from "@/lib/auth";

/**
 * 실제 국세청 발행 연동
 * - 팝빌(Popbill) API 사용
 * - 로그인 사용자의 사업자 정보 사용 (설정에서 등록한 정보)
 */

interface InvoicerInfo {
  corpNum: string;
  corpName: string;
  ceoName: string;
  addr: string;
  contactName: string;
  contactTel: string;
  contactEmail: string;
}

function buildPopbillTaxinvoice(
  data: InvoiceData,
  invoicer: InvoicerInfo
): Record<string, unknown> {
  const writeDate = data.issueDate.replace(/-/g, "");
  const supplyCostTotal = Math.floor(data.supplyAmount);
  const taxTotal = Math.floor(data.taxAmount);
  const totalAmount = supplyCostTotal + taxTotal;
  const mgtKey = `INV-${Date.now()}`;

  return {
    writeDate,
    chargeDirection: "정과금",
    issueType: "정발행",
    purposeType: "영수",
    issueTiming: "직접발행",
    taxType: "과세",

    invoicerCorpNum: invoicer.corpNum,
    invoicerMgtKey: mgtKey,
    invoicerCorpName: invoicer.corpName,
    invoicerCEOName: invoicer.ceoName,
    invoicerAddr: invoicer.addr,
    invoicerContactName: invoicer.contactName,
    invoicerTEL: invoicer.contactTel,
    invoicerEmail: invoicer.contactEmail,
    invoicerSMSSendYN: false,

    invoiceeType: "사업자",
    invoiceeCorpNum: (data.buyerCorpNum ?? "0000000000").replace(/-/g, ""),
    invoiceeCorpName: data.buyerName || "공급받는자",
    invoiceeCEOName: "",
    invoiceeAddr: "",
    invoiceeContactName1: "",
    invoiceeTEL1: "",
    invoiceeHP1: "",
    invoiceeEmail1: "",
    invoiceeSMSSendYN: false,

    supplyCostTotal: String(supplyCostTotal),
    taxTotal: String(taxTotal),
    totalAmount: String(totalAmount),

    detailList: [
      {
        serialNum: 1,
        itemName: data.itemName || "품목",
        purchaseDT: writeDate,
        unitCost: String(supplyCostTotal),
        qty: "1",
        supplyCost: String(supplyCostTotal),
        tax: String(taxTotal),
      },
    ],
  };
}

async function issueViaPopbill(
  data: InvoiceData,
  invoicer: InvoicerInfo
): Promise<{ ntsConfirmNum: string }> {
  const popbill = require("popbill");

  const linkId = process.env.POPBILL_LINKID;
  const secretKey = process.env.POPBILL_SECRET_KEY;
  const isTest = process.env.POPBILL_IS_TEST !== "false";

  if (!linkId || !secretKey) {
    throw new Error("POPBILL_LINKID, POPBILL_SECRET_KEY가 필요합니다.");
  }

  if (!data.buyerCorpNum || data.buyerCorpNum.replace(/-/g, "").length !== 10) {
    throw new Error("실제 발행을 위해 공급받는자 사업자번호(10자리)를 입력해 주세요.");
  }

  popbill.config({
    LinkID: linkId,
    SecretKey: secretKey,
    IsTest: isTest,
    defaultErrorHandler: () => {},
  });

  const taxinvoiceService = popbill.TaxinvoiceService();
  const Taxinvoice = buildPopbillTaxinvoice(data, invoicer);

  return new Promise((resolve, reject) => {
    taxinvoiceService.registIssue(
      invoicer.corpNum,
      Taxinvoice,
      false,
      false,
      "",
      "",
      "",
      "",
      (response: { ntsConfirmNum?: string }) => {
        resolve({
          ntsConfirmNum: response.ntsConfirmNum ?? "",
        });
      },
      (error: { code: number; message: string }) => {
        reject(new Error(`[${error.code}] ${error.message}`));
      }
    );
  });
}

function mockIssue(): Promise<{ ntsConfirmNum: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ntsConfirmNum: `MOCK-${Date.now().toString(36).toUpperCase()}`,
      });
    }, 2000);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      buyerName,
      buyerCorpNum,
      supplyAmount,
      taxAmount,
      itemName,
      issueDate,
    } = body as Partial<InvoiceData>;

    if (
      !buyerName ||
      typeof supplyAmount !== "number" ||
      typeof taxAmount !== "number" ||
      !itemName ||
      !issueDate
    ) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    const data: InvoiceData = {
      buyerName,
      buyerCorpNum,
      supplyAmount,
      taxAmount,
      itemName,
      issueDate,
    };

    const token = request.cookies.get("auth")?.value;
    let userCorpNum: string | null = null;
    let userInvoicer: InvoicerInfo | null = null;

    if (token) {
      const userId = await verifyToken(token);
      if (userId) {
        const user = await getUserById(userId);
        if (user?.corpNum && user.popbillRegistered && user.corpName && user.ceoName) {
          userCorpNum = user.corpNum.replace(/-/g, "");
          userInvoicer = {
            corpNum: userCorpNum,
            corpName: user.corpName,
            ceoName: user.ceoName,
            addr: user.addr ?? "",
            contactName: user.contactName ?? "",
            contactTel: user.contactTel ?? "",
            contactEmail: user.contactEmail ?? "",
          };
        }
      }
    }

    const envCorpNum = process.env.POPBILL_CORP_NUM?.replace(/-/g, "");
    const fallbackInvoicer: InvoicerInfo | null = envCorpNum
      ? {
          corpNum: envCorpNum,
          corpName: process.env.POPBILL_CORP_NAME ?? "공급자 상호",
          ceoName: process.env.POPBILL_CEO_NAME ?? "대표자",
          addr: process.env.POPBILL_ADDR ?? "",
          contactName: process.env.POPBILL_CONTACT ?? "담당자",
          contactTel: process.env.POPBILL_TEL ?? "02-000-0000",
          contactEmail: process.env.POPBILL_EMAIL ?? "admin@example.com",
        }
      : null;

    const invoicer = userInvoicer ?? fallbackInvoicer;
    const usePopbill =
      process.env.POPBILL_LINKID &&
      process.env.POPBILL_SECRET_KEY &&
      invoicer &&
      data.buyerCorpNum;

    let result: { ntsConfirmNum: string; isMock?: boolean };

    if (usePopbill) {
      result = await issueViaPopbill(data, invoicer);
      result.isMock = false;
    } else {
      result = await mockIssue();
      result.isMock = true;
    }

    return NextResponse.json({
      success: true,
      approvalNum: result.ntsConfirmNum,
      isMock: result.isMock ?? true,
      message: result.isMock
        ? "테스트 발행 완료 (실제 발행: .env.local에 팝빌 설정 + 사업자번호 입력)"
        : "세금계산서 발행이 완료되었습니다.",
    });
  } catch (err) {
    console.error("issue-invoice error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "발행 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
