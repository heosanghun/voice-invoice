"use client";

import { useState, useCallback, useEffect } from "react";
import type { InvoiceData } from "@/types/invoice";

interface InvoiceFormProps {
  initialData: InvoiceData;
  onIssue: (data: InvoiceData) => Promise<void>;
  onReset: () => void;
}

export function InvoiceForm({ initialData, onIssue, onReset }: InvoiceFormProps) {
  const [buyerName, setBuyerName] = useState(initialData.buyerName);
  const [buyerCorpNum, setBuyerCorpNum] = useState(initialData.buyerCorpNum ?? "");
  const [supplyAmount, setSupplyAmount] = useState(initialData.supplyAmount);
  const [taxAmount, setTaxAmount] = useState(initialData.taxAmount);
  const [itemName, setItemName] = useState(initialData.itemName);
  const [issueDate, setIssueDate] = useState(initialData.issueDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBuyerName(initialData.buyerName);
    setBuyerCorpNum(initialData.buyerCorpNum ?? "");
    setSupplyAmount(initialData.supplyAmount);
    setTaxAmount(initialData.taxAmount);
    setItemName(initialData.itemName);
    setIssueDate(initialData.issueDate);
  }, [initialData]);

  const handleSupplyAmountChange = useCallback((value: number) => {
    setSupplyAmount(value);
    setTaxAmount(Math.floor(value * 0.1));
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onIssue({
        buyerName,
        buyerCorpNum: buyerCorpNum.trim() || undefined,
        supplyAmount,
        taxAmount,
        itemName,
        issueDate,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "발행 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [buyerName, buyerCorpNum, supplyAmount, taxAmount, itemName, issueDate, onIssue]);

  return (
    <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        세금계산서 초안 확인
      </h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            공급받는 자 (상호명)
          </label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="예: 동아"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            공급받는 자 사업자번호
          </label>
          <input
            type="text"
            value={buyerCorpNum}
            onChange={(e) => setBuyerCorpNum(e.target.value.replace(/-/g, ""))}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="하이픈 제외 10자리 (실제 발행 시 필수)"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            품목
          </label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="품목명"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            공급가액 (원)
          </label>
          <input
            type="number"
            value={supplyAmount || ""}
            onChange={(e) =>
              handleSupplyAmountChange(Number(e.target.value) || 0)
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            세액 (원)
          </label>
          <input
            type="number"
            value={taxAmount}
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600"
          />
          <p className="mt-1 text-xs text-slate-500">공급가액의 10%로 자동 계산</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">
            작성일자
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          다시 녹음
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "발행 중..." : "이대로 세금계산서 발행하기"}
        </button>
      </div>
    </div>
  );
}
