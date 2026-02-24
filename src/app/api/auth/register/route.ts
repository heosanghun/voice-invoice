import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
import {
  createUser,
  createToken,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "이메일, 비밀번호, 이름을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const user = await createUser(email, password, name);
    const token = await createToken(user.id);

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        popbillRegistered: user.popbillRegistered,
        certRegistered: user.certRegistered,
      },
    });

    res.cookies.set("auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "가입 실패" },
      { status: 500 }
    );
  }
}
