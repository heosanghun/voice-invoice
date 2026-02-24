export interface InvoiceData {
  buyerName: string;
  /** 공급받는자 사업자번호 (실제 발행 시 필수, 하이픈 제외) */
  buyerCorpNum?: string;
  supplyAmount: number;
  taxAmount: number;
  itemName: string;
  issueDate: string;
}
