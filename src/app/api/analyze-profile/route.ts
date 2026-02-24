import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BusinessProfile } from "@/types/subsidy";

const SYSTEM_INSTRUCTION = `너는 대한민국 소상공인 지원금 검색 어시스턴트야. 사용자의 음성을 듣고 사업장 정보를 추출해 무조건 JSON 형식으로만 반환해.
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

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "오디오 파일이 필요합니다." },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const mimeType = audioFile.type || "audio/webm";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent([
      {
        inlineData: {
          data: Buffer.from(arrayBuffer).toString("base64"),
          mimeType,
        },
      },
      { text: "위 음성을 분석하여 사업장 정보 JSON을 추출해." },
    ]);

    const text = result.response.text();
    if (!text) {
      return NextResponse.json(
        { error: "Gemini 응답이 비어 있습니다." },
        { status: 500 }
      );
    }

    const profile = parseProfileJson(text);
    if (!profile) {
      return NextResponse.json(
        { error: "JSON 파싱 실패: " + text.slice(0, 200) },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("analyze-profile error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
