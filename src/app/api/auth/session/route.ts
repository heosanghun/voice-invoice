import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import { verifyToken, getUserById } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth")?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const userId = await verifyToken(token);
    if (!userId) {
      return NextResponse.json({ user: null });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        corpNum: user.corpNum,
        corpName: user.corpName,
        popbillRegistered: user.popbillRegistered,
        certRegistered: user.certRegistered,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
