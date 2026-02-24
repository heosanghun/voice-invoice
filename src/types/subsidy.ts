export interface BusinessProfile {
  region: string;
  industry: string;
  foundingYear: number;
  ownerAge: number;
}

export interface SubsidyMatch {
  title: string;
  amount: string;
  reason: string;
  applyTip: string;
  url?: string;
}
