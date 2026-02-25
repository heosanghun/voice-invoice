"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Settings, CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { user, loading, refresh, logout } = useAuth();
  const router = useRouter();
  const [popbillStatus, setPopbillStatus] = useState<{
    popbillConfigured: boolean;
    popbillRegistered: boolean;
    certRegistered: boolean;
    certExpireDate?: string | null;
  } | null>(null);
  const [envCheck, setEnvCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [form, setForm] = useState({
    corpNum: "",
    corpName: "",
    ceoName: "",
    addr: "",
    bizType: "",
    bizClass: "",
    contactName: "",
    contactEmail: "",
    contactTel: "",
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetch("/api/popbill/status")
      .then((r) => r.json())
      .then(setPopbillStatus)
      .catch(() => setPopbillStatus(null));
  }, [user]);

  useEffect(() => {
    if (user && popbillStatus && !popbillStatus.popbillConfigured) {
      fetch("/api/popbill/check-env")
        .then((r) => r.json())
        .then(setEnvCheck)
        .catch(() => setEnvCheck(null));
    } else {
      setEnvCheck(null);
    }
  }, [user, popbillStatus?.popbillConfigured]);

  useEffect(() => {
    if (message) messageRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [message]);

  // 환경변수만 로드돼도 폼 사용 가능 (status가 아직 false여도 check-env 성공 시 폼 표시)
  const formEnabled = !!(
    popbillStatus?.popbillConfigured || envCheck?.ok === true
  );

  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/popbill/register-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({ error: "응답을 읽을 수 없습니다." }));
      if (!res.ok) {
        const msg = data.error || "등록 실패";
        const code = data.code;
        if (res.status === 401) {
          if (code === "NO_COOKIE")
            throw new Error(
              "브라우저에 로그인 쿠키가 없습니다. 같은 주소(voice-invoice-hyo4.vercel.app)에서 로그인한 뒤 다시 시도하세요."
            );
          if (code === "INVALID_TOKEN")
            throw new Error(
              "로그인 토큰이 만료되었거나 유효하지 않습니다. 로그아웃 후 다시 로그인하세요. (Vercel 환경 변수 AUTH_SECRET 확인)"
            );
          if (code === "USER_NOT_FOUND")
            throw new Error(
              "저장된 계정을 찾을 수 없습니다. Vercel 서버가 재시작되면 /tmp 데이터가 사라집니다. 로그아웃 후 회원가입부터 다시 하거나, Supabase anon 키를 설정해 DB에 저장하세요."
            );
          if (msg.includes("로그인"))
            throw new Error(
              "로그인 세션이 없거나 만료되었습니다. 프로덕션 주소(https://voice-invoice-hyo4.vercel.app)에서 로그아웃 후 다시 로그인한 뒤 사업자 등록을 시도하세요. 지금 프리뷰 주소라면 해당 주소에서는 쿠키가 공유되지 않습니다."
            );
        }
        throw new Error(msg);
      }
      setMessage({ type: "success", text: data.message });
      await refresh();
      const statusRes = await fetch("/api/popbill/status", { credentials: "include" });
      setPopbillStatus(await statusRes.json());
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "등록 실패",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenCertPopup = async () => {
    setMessage(null);
    setCertLoading(true);
    try {
      const res = await fetch("/api/popbill/cert-url");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "URL 조회 실패");
      window.open(data.url, "popbill-cert", "width=1000,height=630");
      setMessage({
        type: "success",
        text: "인증서 등록 창을 열었습니다. 등록 완료 후 새로고침해 주세요.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "URL 조회 실패",
      });
    } finally {
      setCertLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    );
  }

  const isPreviewUrl =
    typeof window !== "undefined" &&
    /voice-invoice-hyo4-[a-z0-9]+-/.test(window.location.hostname);
  const productionUrl = "https://voice-invoice-hyo4.vercel.app";

  return (
    <div className="min-h-screen bg-slate-50">
      {isPreviewUrl && (
        <div className="mx-auto max-w-4xl px-6 py-3">
          <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">⚠️ 현재 프리뷰 주소입니다. 사업자 등록은 동작하지 않을 수 있습니다.</p>
            <p className="mt-1 text-sm">
              <a href={productionUrl} className="underline font-medium">
                프로덕션 주소({productionUrl})
              </a>
              로 이동한 뒤, 로그아웃 → 로그인 → 설정에서 사업자 등록을 시도하세요.
            </p>
          </div>
        </div>
      )}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-slate-800">설정</h1>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-800">
              세금계산서
            </Link>
            <Link href="/subsidies" className="text-sm font-medium text-slate-600 hover:text-slate-800">
              지원금 찾기
            </Link>
            <Link href="/settings" className="text-sm font-medium text-blue-600">
              설정
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              로그아웃
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Settings className="h-5 w-5" />
            계정 정보
          </h2>
          <p className="text-slate-600">{user.email}</p>
          <p className="text-slate-600">{user.name}</p>
        </div>

        {!formEnabled && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="mb-3 font-semibold text-amber-800">
              Step 0: 팝빌 API 키 설정 (가장 먼저 해야 할 일)
            </h3>
            {envCheck && (
              <div
                className={`mb-4 rounded-lg p-3 text-sm font-medium ${
                  envCheck.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {envCheck.ok ? (
                  <>
                    ✓ 환경변수는 로드되었습니다. 이 페이지를 <strong>새로고침(F5)</strong>
                    해 보세요. 그래도 폼이 안 보이면 로그아웃 후 다시 로그인해 주세요.
                  </>
                ) : (
                  <>⚠ {envCheck.message}</>
                )}
              </div>
            )}
            <p className="mb-3 text-amber-800">
              API 키는 <strong>이 화면이 아닌</strong> 프로젝트 폴더의{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>{" "}
              파일에 입력합니다.
            </p>
            <ol className="mb-3 list-inside list-decimal space-y-1 text-amber-800">
              <li>프로젝트 루트 폴더(d:\AI\jonan)에서 .env.local 파일 열기</li>
              <li>아래 내용 추가 (팝빌 연동신청 후 발급받은 값으로 교체)</li>
              <li>
                <strong>반드시</strong> 터미널에서 실행 중인 <code>npm run dev</code>를{" "}
                <code>Ctrl+C</code>로 종료한 뒤, 다시 <code>npm run dev</code> 실행
              </li>
            </ol>
            <pre className="mb-3 overflow-x-auto rounded-lg bg-amber-100 p-4 text-sm text-amber-900">
{`POPBILL_LINKID=발급받은링크아이디
POPBILL_SECRET_KEY=발급받은비밀키
POPBILL_IS_TEST=true`}
            </pre>
            <p className="text-sm font-medium text-amber-800">
              ⚠ 환경변수는 <strong>서버 시작 시</strong>에만 로드됩니다. .env.local을
              수정한 뒤에는 반드시 서버를 재시작해야 합니다.
            </p>
          </div>
        )}

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            실제 발행 준비 단계
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {popbillStatus?.popbillRegistered ? (
                <CheckCircle className="h-6 w-6 shrink-0 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 shrink-0 text-slate-400" />
              )}
              <div>
                <p className="font-medium">
                  {popbillStatus?.popbillRegistered ? "1. 사업자 등록 완료" : "1. 사업자 등록"}
                </p>
                <p className="text-sm text-slate-500">
                  {popbillStatus?.popbillRegistered
                    ? "완료됨. 아래 2단계로 진행하세요."
                    : "API 키 설정 후 이 페이지를 새로고침하면, 아래에 사업자 등록 폼이 나타납니다. 폼에 입력 후 '사업자 등록' 버튼을 클릭하세요."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {popbillStatus?.certRegistered ? (
                <CheckCircle className="h-6 w-6 shrink-0 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 shrink-0 text-slate-400" />
              )}
              <div>
                <p className="font-medium">
                  {popbillStatus?.certRegistered ? "2. 공인인증서 등록 완료" : "2. 공인인증서 등록"}
                </p>
                <p className="text-sm text-slate-500">
                  {popbillStatus?.certRegistered
                    ? "완료됨. 이제 메인에서 실제 발행이 가능합니다."
                    : "사업자 등록 완료 후 '인증서 등록 창 열기' 버튼이 나타납니다. 클릭하면 팝업에서 인증서를 등록할 수 있습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!popbillStatus?.popbillRegistered && (
          <div
            className={`mb-8 rounded-xl border-2 p-6 ${
              formEnabled
                ? "border-blue-200 bg-blue-50/50"
                : "border-slate-200 bg-slate-50 opacity-90"
            }`}
          >
            <h3 className="mb-2 font-semibold text-slate-800">
              {formEnabled
                ? "↓ 1단계: 아래 폼에 사업자 정보를 입력한 뒤 [사업자 등록] 버튼을 클릭하세요"
                : "1단계: 사업자 정보 등록 (API 키 설정 후 사용 가능)"}
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              {formEnabled
                ? "팝빌 연동회원으로 자동 가입됩니다."
                : "위 Step 0에서 .env.local에 POPBILL_LINKID, POPBILL_SECRET_KEY를 설정하고 서버를 재시작하면 이 폼을 사용할 수 있습니다."}
            </p>
            <form onSubmit={handleRegisterBusiness} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    사업자번호 *
                  </label>
                  <input
                    type="text"
                    value={form.corpNum}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, corpNum: e.target.value.replace(/-/g, "") }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                    placeholder="1234567890"
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    상호명 *
                  </label>
                  <input
                    type="text"
                    value={form.corpName}
                    onChange={(e) => setForm((f) => ({ ...f, corpName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                    placeholder="(주)회사명"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  대표자 성명 *
                </label>
                <input
                  type="text"
                  value={form.ceoName}
                  onChange={(e) => setForm((f) => ({ ...f, ceoName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  placeholder="홍길동"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  사업장 주소 *
                </label>
                <input
                  type="text"
                  value={form.addr}
                  onChange={(e) => setForm((f) => ({ ...f, addr: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  placeholder="서울시 강남구 ..."
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    업태 *
                  </label>
                  <input
                    type="text"
                    value={form.bizType}
                    onChange={(e) => setForm((f) => ({ ...f, bizType: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                    placeholder="제조업"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    종목 *
                  </label>
                  <input
                    type="text"
                    value={form.bizClass}
                    onChange={(e) => setForm((f) => ({ ...f, bizClass: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                    placeholder="소프트웨어 개발"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    담당자명 *
                  </label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                    placeholder="김담당"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">
                    담당자 이메일 *
                  </label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2"
                    placeholder="contact@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">
                  담당자 연락처 *
                </label>
                <input
                  type="tel"
                  value={form.contactTel}
                  onChange={(e) => setForm((f) => ({ ...f, contactTel: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                  placeholder="01012345678"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitLoading || !formEnabled}
                className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLoading
                  ? "등록 중..."
                  : formEnabled
                    ? "사업자 등록"
                    : "API 키 설정 후 사용 가능"}
              </button>
            </form>
          </div>
        )}

        {!popbillStatus?.certRegistered && (
          <div
            className={`mb-8 rounded-xl border-2 p-6 ${
              popbillStatus?.popbillRegistered
                ? "border-blue-200 bg-blue-50/50"
                : "border-slate-200 bg-slate-50 opacity-90"
            }`}
          >
            <h3 className="mb-2 font-semibold text-slate-800">
              {popbillStatus?.popbillRegistered
                ? "↓ 2단계: [인증서 등록 창 열기] 버튼을 클릭하세요"
                : "2단계: 공인인증서 등록 (사업자 등록 완료 후 사용 가능)"}
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              {popbillStatus?.popbillRegistered
                ? "팝빌 인증서 등록 창에서 공동인증서(.pfx)를 업로드하고 비밀번호를 입력해 주세요. 등록 후 이 페이지를 새로고침하면 상태가 반영됩니다."
                : "1단계 사업자 등록을 완료하면 이 버튼이 활성화됩니다. 팝빌 인증서 등록 창에서 공동인증서(.pfx)를 업로드합니다."}
            </p>
            <button
              type="button"
              onClick={handleOpenCertPopup}
              disabled={certLoading || !popbillStatus?.popbillRegistered}
              className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {certLoading
                ? "창 열기 중..."
                : popbillStatus?.popbillRegistered
                  ? "인증서 등록 창 열기"
                  : "사업자 등록 완료 후 사용 가능"}
            </button>
          </div>
        )}

        {popbillStatus?.popbillRegistered && popbillStatus?.certRegistered && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6">
            <p className="font-medium text-green-800">
              실제 세금계산서 발행 준비가 완료되었습니다!
            </p>
            <p className="mt-1 text-sm text-green-700">
              메인 페이지에서 음성/텍스트로 세금계산서를 발행할 수 있습니다.
            </p>
          </div>
        )}

        {message && (
          <div
            ref={messageRef}
            className={`mt-4 rounded-lg p-4 ${
              message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
            role="alert"
          >
            {message.text}
          </div>
        )}
      </main>
    </div>
  );
}
