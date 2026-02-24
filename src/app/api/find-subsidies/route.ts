import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { BusinessProfile } from "@/types/subsidy";
import type { SubsidyMatch } from "@/types/subsidy";

const MOCK_SUBSIDIES = [
  {
    title: "마포구 청년 카페 창업 지원금",
    region: "마포구",
    industry: "카페",
    minAge: 0,
    maxAge: 39,
    foundingYearMin: 2022,
    description: "마포구 내 청년 카페 창업자 대상",
  },
  {
    title: "소상공인 고효율 에어컨 지원사업",
    region: "전국",
    industry: "전체",
    minAge: 0,
    maxAge: 999,
    foundingYearMin: 0,
    description: "에너지 효율 개선 지원",
  },
  {
    title: "서울시 소상공인 무이자 대출",
    region: "서울",
    industry: "전체",
    minAge: 0,
    maxAge: 999,
    foundingYearMin: 0,
    description: "서울시 소상공인 경영자금",
  },
  {
    title: "강남구 요식업 인테리어 지원",
    region: "강남구",
    industry: "요식업",
    minAge: 0,
    maxAge: 999,
    foundingYearMin: 2023,
    description: "강남구 요식업 신규 창업 인테리어",
  },
  {
    title: "30대 창업 패키지 지원금",
    region: "전국",
    industry: "전체",
    minAge: 30,
    maxAge: 39,
    foundingYearMin: 2022,
    description: "30대 창업자 특별 지원",
  },
  {
    title: "소상공인 일반 경영안정자금",
    region: "전국",
    industry: "전체",
    minAge: 0,
    maxAge: 999,
    foundingYearMin: 0,
    description: "상시 신청 가능",
  },
];

const SYSTEM_INSTRUCTION = `너는 대한민국 소상공인 정책자금 전문가야. 제공된 [사용자 정보]를 바탕으로, [지원금 목록] 중에서 이 사용자가 자격 요건에 부합하여 받을 확률이 높은 지원금을 최대 3개 골라내. 반환 형식은 무조건 JSON 배열로 하고, 필드는 [title(지원금명), amount(예상금액), reason(선정 이유 1줄), applyTip(신청 팁)] 으로 해. JSON 외 다른 텍스트는 출력하지 마.`;

const SUBSIDY_URL_MAP: Record<string, string> = {
  "소상공인 고효율 에어컨 지원사업":
    "https://en-ter.co.kr/ac/main/main.do",
  "소상공인 일반 경영안정자금": "https://ols.sbiz.or.kr",
  "마포구 청년 카페 창업 지원금":
    "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do",
  "서울시 소상공인 무이자 대출":
    "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do",
  "강남구 요식업 인테리어 지원":
    "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do",
  "30대 창업 패키지 지원금":
    "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do",
};

const BIZINFO_SEARCH = "https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/list.do";

function getSubsidyUrl(title: string): string {
  return SUBSIDY_URL_MAP[title] ?? BIZINFO_SEARCH;
}

function parseSubsidyJson(text: string): SubsidyMatch[] {
  const trimmed = text.trim();
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];
  try {
    const arr = JSON.parse(arrayMatch[0]) as Array<Record<string, unknown>>;
    return arr.slice(0, 3).map((item) => {
      const title = String(item.title ?? "");
      return {
        title,
        amount: String(item.amount ?? ""),
        reason: String(item.reason ?? ""),
        applyTip: String(item.applyTip ?? ""),
        url: getSubsidyUrl(title),
      };
    });
  } catch {
    return [];
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

    const body = (await request.json()) as BusinessProfile;
    const { region, industry, foundingYear, ownerAge } = body;

    const userInfoStr = JSON.stringify(
      { region, industry, foundingYear, ownerAge },
      null,
      2
    );
    const subsidiesStr = JSON.stringify(MOCK_SUBSIDIES, null, 2);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(
      `[사용자 정보]\n${userInfoStr}\n\n[지원금 목록]\n${subsidiesStr}\n\n위 사용자에게 맞는 지원금을 최대 3개 골라 JSON 배열로 반환해.`
    );

    const text = result.response.text();
    if (!text) {
      return NextResponse.json(
        { error: "Gemini 응답이 비어 있습니다." },
        { status: 500 }
      );
    }

    const subsidies = parseSubsidyJson(text);
    if (subsidies.length === 0) {
      return NextResponse.json({
        subsidies: [
          {
            title: "소상공인 일반 경영안정자금",
            amount: "상시 신청 가능",
            reason: "현재 조건에 맞는 특별 지원금이 없어 기본 안내",
            applyTip: "소상공인시장진흥공단 또는 지역 상공회의소에 문의하세요.",
            url: "https://ols.sbiz.or.kr",
          },
        ],
      });
    }

    return NextResponse.json({ subsidies });
  } catch (err) {
    console.error("find-subsidies error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "알 수 없는 오류" },
      { status: 500 }
    );
  }
}
