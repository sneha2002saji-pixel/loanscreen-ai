import type { LoanType } from './chat';

export type { LoanType };

export interface RateRange {
  min: number;
  max: number;
}

export interface LoanConfig {
  baseRate: RateRange;
  dtiThreshold: number;
  maxTermMonths: number;
}

export interface EligibilityResult {
  isPrequalified: boolean;
  loanType: LoanType;
  estimatedRateRange: RateRange;
  maxLoanAmount: number;
  dtiRatio: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  nextSteps: string[];
  disclaimer: string;
}

export const LOAN_CONFIGS: Record<LoanType, LoanConfig> = {
  personal: {
    baseRate: { min: 7, max: 24 },
    dtiThreshold: 0.36,
    maxTermMonths: 84,
  },
  auto: {
    baseRate: { min: 4, max: 15 },
    dtiThreshold: 0.36,
    maxTermMonths: 72,
  },
  mortgage: {
    baseRate: { min: 5, max: 8 },
    dtiThreshold: 0.43,
    maxTermMonths: 360,
  },
};

export const CREDIT_SCORE_RANGES = [
  { label: 'Excellent (800+)', value: '800+', adjustment: 0 },
  { label: 'Very Good (740-799)', value: '740-799', adjustment: 0.5 },
  { label: 'Good (670-739)', value: '670-739', adjustment: 2 },
  { label: 'Fair (580-669)', value: '580-669', adjustment: 5 },
  { label: 'Poor (below 580)', value: 'below-580', adjustment: 8 },
] as const;
