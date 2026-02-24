import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BusinessProfile } from "@/types/subsidy";

const SYSTEM_INSTRUCTION = `너는 대한민국 소상공인 지원금 검색 어시스턴트야. 사용자의 텍스트를 분석하고 사업장 정보를 추출해 무조건 JSON 형식으로만 반환해.
필수 추출 필드:
- region (사업장 지역, 예: 마포구, 서울시 강남구)
- industry (업종, 예: 카페, 요식업, 도소매)
- foundingYear (창업 연도, 숫자 4자리. 언급 없으면 0)
- ownerAge (대표자 연령대, 숫자. 예: 30대면 35, 40대면 45. 언급 없으면 0)
JSON 외에 다른 텍스트는 절대 출력하지 마.`;

function parseProfileJson(text: string): BusinessProfile | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    return {
      region: String(parsed.region ?? "").trim(),
      industry: String(parsed.industry ?? "").trim(),
      foundingYear: Number(parsed.foundingYear) || 0,
      ownerAge: Number(parsed.ownerAge) || 0,
    };
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
      `다음 텍스트를 분석하여 사업장 정보 JSON을 추출해:\n\n${text}`
    );

    const responseText = result.response.text();
    if (!responseText) {
      return NextResponse.json(
        { error: "Gemini 응답이 비어 있습니다." },
        { status: 500 }
      );
    }

    const profile = parseProfileJson(responseText);
    if (!profile) {
      return NextResponse.json(
        { error: "JSON 파싱 실패: " + responseText.slice(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("analyze-profile-text error:", err);
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
