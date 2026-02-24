"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Search, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import type { BusinessProfile } from "@/types/subsidy";
import type { SubsidyMatch } from "@/types/subsidy";

type SubsidyState = "idle" | "voice-recording" | "voice-processing" | "searching";

export default function SubsidiesPage() {
  const { user } = useAuth();
  const [region, setRegion] = useState("");
  const [industry, setIndustry] = useState("");
  const [foundingYear, setFoundingYear] = useState("");
  const [ownerAge, setOwnerAge] = useState("");
  const [state, setState] = useState<SubsidyState>("idle");
  const [results, setResults] = useState<SubsidyMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startVoiceRecording = useCallback(async () => {
    try {
      setError(null);
      setResults(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) {
          setError("녹음된 오디오가 없습니다.");
          setState("idle");
          return;
        }
        setState("voice-processing");
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          const res = await fetch("/api/analyze-profile", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as BusinessProfile | { error?: string };
          if (!res.ok) {
            throw new Error((data as { error?: string }).error || "분석 실패");
          }
          const profile = data as BusinessProfile;
          setRegion(profile.region);
          setIndustry(profile.industry);
          setFoundingYear(profile.foundingYear ? String(profile.foundingYear) : "");
          setOwnerAge(profile.ownerAge ? String(profile.ownerAge) : "");
        } catch (err) {
          setError(err instanceof Error ? err.message : "음성 분석 실패");
        } finally {
          setState("idle");
        }
      };

      mediaRecorder.start();
      setState("voice-recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "마이크 접근 권한을 허용해 주세요.");
      setState("idle");
    }
  }, []);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const handleVoiceClick = () => {
    if (state === "voice-recording") {
      stopVoiceRecording();
    } else if (state === "idle") {
      startVoiceRecording();
    }
  };

  const [profilePrompt, setProfilePrompt] = useState("");
  const handleProfilePromptSubmit = useCallback(async () => {
    const trimmed = profilePrompt.trim();
    if (!trimmed) return;
    setError(null);
    setResults(null);
    setState("voice-processing");
    try {
      const res = await fetch("/api/analyze-profile-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = (await res.json()) as BusinessProfile | { error?: string };
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "분석 실패");
      }
      const profile = data as BusinessProfile;
      setRegion(profile.region);
      setIndustry(profile.industry);
      setFoundingYear(profile.foundingYear ? String(profile.foundingYear) : "");
      setOwnerAge(profile.ownerAge ? String(profile.ownerAge) : "");
      setProfilePrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 실패");
    } finally {
      setState("idle");
    }
  }, [profilePrompt]);

  const handleSearch = useCallback(async () => {
    setError(null);
    setResults(null);
    setState("searching");
    try {
      const res = await fetch("/api/find-subsidies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          industry,
          foundingYear: foundingYear ? Number(foundingYear) : 0,
          ownerAge: ownerAge ? Number(ownerAge) : 0,
        } satisfies BusinessProfile),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "검색 실패");
      }
      setResults(data.subsidies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "지원금 검색 실패");
    } finally {
      setState("idle");
    }
  }, [region, industry, foundingYear, ownerAge]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-slate-800">
            맞춤형 지원금 찾기
          </h1>
          <nav className="flex gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              세금계산서
            </Link>
            <Link
              href="/subsidies"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              지원금 찾기
            </Link>
            <Link
              href="/settings"
              className="text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              설정
            </Link>
            {user ? (
              <span className="text-sm text-slate-500">{user.email}</span>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold text-slate-800">
            사업장 정보 입력
          </h2>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">음성으로 검색:</span>
            <button
              type="button"
              onClick={handleVoiceClick}
              disabled={state === "voice-processing" || state === "searching"}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                state === "voice-recording"
                  ? "bg-red-500 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              <Mic className="h-4 w-4" />
              {state === "voice-recording" ? "녹음 중지" : "마이크로 말하기"}
            </button>
            {state === "voice-recording" && (
              <span className="text-sm text-red-600">듣고 있습니다...</span>
            )}
            {state === "voice-processing" && (
              <span className="text-sm text-slate-600">분석 중...</span>
            )}
          </div>
          <div className="mb-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
              <MessageSquare className="h-4 w-4" />
              음성 입력이 어려우시면 직접 입력해 주세요
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={profilePrompt}
                onChange={(e) => setProfilePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleProfilePromptSubmit();
                }}
                placeholder="예: 마포구에서 카페하는 30대인데 받을 지원금 있어?"
                disabled={state === "voice-processing" || state === "searching"}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={handleProfilePromptSubmit}
                disabled={!profilePrompt.trim() || state === "voice-processing" || state === "searching"}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                분석
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                사업장 주소 (시/구)
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="예: 마포구, 강남구"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                업종
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="예: 요식업, 도소매, 카페"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                창업일 (연도)
              </label>
              <input
                type="number"
                value={foundingYear}
                onChange={(e) => setFoundingYear(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="예: 2023"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                대표자 연령
              </label>
              <input
                type="number"
                value={ownerAge}
                onChange={(e) => setOwnerAge(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="예: 35"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={state === "searching"}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            <Search className="h-5 w-5" />
            {state === "searching"
              ? "지원금을 샅샅이 뒤지고 있습니다..."
              : "내 맞춤 지원금 찾기"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-red-600" role="alert">
            {error}
          </p>
        )}

        {state === "searching" && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">추천 지원금</h3>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="mb-4 h-8 w-1/3 animate-pulse rounded bg-slate-200" />
                <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="mt-4 h-10 w-32 animate-pulse rounded-lg bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {results !== null && state === "idle" && (
          <div className="mt-8">
            <SubsidyResults results={results} />
          </div>
        )}
      </main>
    </div>
  );
}

function SubsidyResults({ results }: { results: SubsidyMatch[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-amber-800">
          현재 조건에 딱 맞는 특별 지원금은 없지만, 상시 신청 가능한
          &quot;소상공인 일반 경영안정자금&quot;을 확인해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">추천 지원금</h3>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {results.map((item, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h4 className="font-semibold text-slate-800">{item.title}</h4>
            <p className="mt-2 text-2xl font-bold text-blue-600">{item.amount}</p>
            <p className="mt-2 flex-1 text-sm text-slate-600">{item.reason}</p>
            <p className="mt-1 text-sm text-slate-500">{item.applyTip}</p>
            <a
              href={item.url ?? "https://www.bizinfo.go.kr"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              상세보기 및 신청하기
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
