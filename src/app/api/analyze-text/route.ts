import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { InvoiceData } from "@/types/invoice";

const SYSTEM_INSTRUCTION = `너는 대한민국 세금계산서 발행 어시스턴트야. 사용자의 텍스트를 분석하고 세금계산서 발행에 필요한 정보를 추출해 무조건 JSON 형식으로만 반환해.
필수 추출 필드:
- buyerName (공급받는 자 상호명)
- supplyAmount (공급가액, 숫자)
- taxAmount (부가세, 숫자. 언급이 없으면 공급가액의 10%로 자동 계산)
- itemName (품목명)
- issueDate (작성일자, YYYY-MM-DD 형식. 언급 없으면 오늘 날짜)
JSON 외에 다른 텍스트는 절대 출력하지 마.`;

function parseInvoiceJson(text: string): InvoiceData | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const buyerName = String(parsed.buyerName ?? "").trim();
    const supplyAmount = Number(parsed.supplyAmount) || 0;
    let taxAmount = Number(parsed.taxAmount);
    if (Number.isNaN(taxAmount) || taxAmount < 0) {
      taxAmount = Math.floor(supplyAmount * 0.1);
    }
    const itemName = String(parsed.itemName ?? "").trim();
    const issueDate =
      String(parsed.issueDate ?? "").trim() ||
      new Date().toISOString().slice(0, 10);
    return { buyerName, supplyAmount, taxAmount, itemName, issueDate };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "텍스트 입력이 필요합니다." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(
      `다음 텍스트를 분석하여 세금계산서 JSON을 추출해:\n\n${text}`
    );

    const responseText = result.response.text();
    if (!responseText) {
      return NextResponse.json(
        { error: "Gemini 응답이 비어 있습니다." },
        { status: 500 }
      );
    }

    const invoiceData = parseInvoiceJson(responseText);
    if (!invoiceData) {
      return NextResponse.json(
        { error: "JSON 파싱 실패: " + responseText.slice(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json(invoiceData);
  } catch (err) {
    console.error("analyze-text error:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
