"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!name.trim()) {
          setError("이름을 입력해 주세요.");
          return;
        }
        if (password.length < 8) {
          setError("비밀번호는 8자 이상이어야 합니다.");
          return;
        }
        await register(email, password, name);
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-800">
          {mode === "login" ? "로그인" : "회원가입"}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="홍길동"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="example@email.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
              required
              minLength={mode === "register" ? 8 : undefined}
            />
            {mode === "register" && (
              <p className="mt-1 text-xs text-slate-500">
                8자 이상, 영문·숫자·특수문자 포함
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          {mode === "login" ? (
            <>
              계정이 없으신가요?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-medium text-blue-600 hover:underline"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-medium text-blue-600 hover:underline"
              >
                로그인
              </button>
            </>
          )}
        </p>
        <p className="mt-4 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:underline">
            ← 메인으로
          </Link>
        </p>
      </div>
    </div>
  );
}
