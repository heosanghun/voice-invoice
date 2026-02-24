"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, MessageSquare } from "lucide-react";
import Link from "next/link";
import { InvoiceForm } from "@/components/InvoiceForm";
import { useAuth } from "@/contexts/AuthContext";
import type { InvoiceData } from "@/types/invoice";

type RecordingState = "idle" | "recording" | "processing";

export default function Home() {
  const { user, logout } = useAuth();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<{ approvalNum: string; isMock?: boolean } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIssueSuccess(null);
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
          setRecordingState("idle");
          return;
        }
        setRecordingState("processing");
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          const res = await fetch("/api/analyze-voice", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `서버 오류 (${res.status})`);
          }
          setInvoiceData(data as InvoiceData);
        } catch (err) {
          setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
        } finally {
          setRecordingState("idle");
        }
      };

      mediaRecorder.start();
      setRecordingState("recording");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "마이크 접근 권한을 허용해 주세요."
      );
      setRecordingState("idle");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const handleMicClick = () => {
    if (recordingState === "recording") {
      stopRecording();
    } else if (recordingState === "idle") {
      startRecording();
    }
  };

  const handleIssue = useCallback(async (data: InvoiceData) => {
    const res = await fetch("/api/issue-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "발행 실패");
    }
    setIssueSuccess({
      approvalNum: result.approvalNum ?? "MOCK-001",
      isMock: result.isMock ?? true,
    });
  }, []);

  const handleReset = useCallback(() => {
    setInvoiceData(null);
    setIssueSuccess(null);
    setError(null);
  }, []);

  const [textPrompt, setTextPrompt] = useState("");
  const handleTextSubmit = useCallback(async () => {
    const trimmed = textPrompt.trim();
    if (!trimmed) return;
    setError(null);
    setIssueSuccess(null);
    setRecordingState("processing");
    try {
      const res = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `서버 오류 (${res.status})`);
      }
      setInvoiceData(data as InvoiceData);
      setTextPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setRecordingState("idle");
    }
  }, [textPrompt]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-slate-800">
            음성 세금계산서
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              세금계산서
            </Link>
            <Link
              href="/subsidies"
              className="text-sm font-medium text-slate-600 hover:text-slate-800"
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">{user.email}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  로그아웃
                </button>
              </div>
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
        {issueSuccess ? (
          <div className="flex flex-col items-center">
            <div
              className={`w-full max-w-lg rounded-xl p-6 text-center ${
                issueSuccess.isMock
                  ? "border border-amber-200 bg-amber-50"
                  : "border border-green-200 bg-green-50"
              }`}
            >
              <p
                className={`text-lg font-medium ${
                  issueSuccess.isMock ? "text-amber-800" : "text-green-800"
                }`}
              >
                {issueSuccess.isMock
                  ? "테스트 발행 완료"
                  : "세금계산서 발행이 완료되었습니다!"}
              </p>
              <p
                className={`mt-2 text-sm ${
                  issueSuccess.isMock ? "text-amber-700" : "text-green-700"
                }`}
              >
                승인번호: {issueSuccess.approvalNum}
              </p>
              {issueSuccess.isMock && (
                <p className="mt-2 text-xs text-amber-600">
                  실제 국세청 발행: doc/국세청연동_구현가이드.md 참고 후 팝빌 설정 및
                  공급받는자 사업자번호 입력
                </p>
              )}
              <button
                type="button"
                onClick={handleReset}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  issueSuccess.isMock
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                새로 발행하기
              </button>
            </div>
          </div>
        ) : invoiceData ? (
          <div className="flex flex-col items-center">
            <InvoiceForm
              initialData={invoiceData}
              onIssue={handleIssue}
              onReset={handleReset}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <p className="mb-6 text-center text-slate-600">
              마이크 버튼을 눌러 말하거나, 아래에 직접 입력해 주세요.
              <br />
              <span className="text-sm text-slate-500">
                예: &quot;오늘 날짜로 삼성전자에 소프트웨어 개발 용역비 100만 원 세금계산서 발행해 줘&quot;
              </span>
            </p>

            <button
              type="button"
              onClick={handleMicClick}
              disabled={recordingState === "processing"}
              className={`group flex h-32 w-32 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
                recordingState === "recording"
                  ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
                  : recordingState === "processing"
                    ? "cursor-wait bg-slate-400 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105"
              }`}
              aria-label={recordingState === "recording" ? "녹음 중지" : "녹음 시작"}
            >
              {recordingState === "recording" ? (
                <MicOff className="h-16 w-16" />
              ) : (
                <Mic className="h-16 w-16" />
              )}
            </button>

            <div className="mt-6 min-h-[2rem] text-center">
              {recordingState === "recording" && (
                <p className="flex items-center gap-2 text-red-600">
                  <span className="inline-block h-2 w-2 animate-ping rounded-full bg-red-500" />
                  듣고 있습니다...
                </p>
              )}
              {recordingState === "processing" && (
                <p className="text-slate-600">분석 중입니다...</p>
              )}
              {error && (
                <p className="text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-10 w-full max-w-lg">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                <MessageSquare className="h-4 w-4" />
                음성 입력이 어려우시면 직접 입력해 주세요
              </p>
              <div className="flex gap-2">
                <textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit();
                    }
                  }}
                  placeholder="예: 삼성전자에 용역비 100만 원 세금계산서 발행해 줘"
                  rows={3}
                  disabled={recordingState === "processing"}
                  className="flex-1 resize-none rounded-lg border border-slate-300 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleTextSubmit}
                  disabled={!textPrompt.trim() || recordingState === "processing"}
                  className="self-end rounded-lg bg-slate-700 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  분석
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
