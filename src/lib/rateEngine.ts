import type { CollectedData } from '@/types/chat';
import type { EligibilityResult, RateRange } from '@/types/loan';
import { LOAN_CONFIGS, CREDIT_SCORE_RANGES } from '@/types/loan';

function getCreditAdjustment(creditRange: string): number {
  const entry = CREDIT_SCORE_RANGES.find((r) => r.value === creditRange);
  return entry?.adjustment ?? 5;
}

function isDeniedByCreditScore(creditRange: string): boolean {
  return creditRange === 'below-580';
}

function calculateDTI(annualIncome: number, monthlyDebts: number): number {
  const monthlyIncome = annualIncome / 12;
  if (monthlyIncome <= 0) return Infinity;
  return monthlyDebts / monthlyIncome;
}

function calculateMaxLoanAmount(
  annualIncome: number,
  monthlyDebts: number,
  dtiThreshold: number,
  loanType: string
): number {
  const monthlyIncome = annualIncome / 12;
  const allowableMonthlyPayment = monthlyIncome * dtiThreshold - monthlyDebts;

  if (allowableMonthlyPayment <= 0) return 0;

  const termMultipliers: Record<string, number> = {
    personal: 60,
    auto: 60,
    mortgage: 300,
  };

  const termMonths = termMultipliers[loanType] ?? 60;
  return Math.round(allowableMonthlyPayment * termMonths);
}

function determineRiskLevel(
  dti: number,
  creditRange: string,
  dtiThreshold: number
): 'low' | 'medium' | 'high' {
  const dtiRatio = dti / dtiThreshold;
  const isGoodCredit = creditRange === '800+' || creditRange === '740-799';
  const isFairCredit = creditRange === '670-739';

  if (dtiRatio < 0.6 && isGoodCredit) return 'low';
  if (dtiRatio < 0.8 && (isGoodCredit || isFairCredit)) return 'medium';
  return 'high';
}

export function calculateEligibility(
  data: CollectedData
): EligibilityResult {
  const config = LOAN_CONFIGS[data.loanType];
  const creditAdjustment = getCreditAdjustment(data.creditScoreRange);
  const dti = calculateDTI(data.annualIncome, data.monthlyDebts);
  const maxLoan = calculateMaxLoanAmount(
    data.annualIncome,
    data.monthlyDebts,
    config.dtiThreshold,
    data.loanType
  );
  const riskLevel = determineRiskLevel(dti, data.creditScoreRange, config.dtiThreshold);

  const adjustedRate: RateRange = {
    min: Math.round((config.baseRate.min + creditAdjustment) * 100) / 100,
    max: Math.round((config.baseRate.max + creditAdjustment) * 100) / 100,
  };

  const reasons: string[] = [];
  const nextSteps: string[] = [];

  if (isDeniedByCreditScore(data.creditScoreRange)) {
    reasons.push('Credit score below 580 does not meet minimum requirements.');
    reasons.push('Most lenders require a minimum credit score of 580 for pre-qualification.');
    nextSteps.push('Work on improving your credit score by paying down existing debts.');
    nextSteps.push('Consider credit counseling services.');
    nextSteps.push('Re-apply after your credit score improves above 580.');

    return {
      isPrequalified: false,
      loanType: data.loanType,
      estimatedRateRange: adjustedRate,
      maxLoanAmount: 0,
      dtiRatio: Number.isFinite(dti) ? Math.round(dti * 10000) / 100 : 999.99,
      riskLevel: 'high',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER,
    };
  }

  if (dti > config.dtiThreshold) {
    reasons.push(
      `Your debt-to-income ratio (${(dti * 100).toFixed(1)}%) exceeds the maximum threshold of ${(config.dtiThreshold * 100).toFixed(0)}%.`
    );
    reasons.push('Reducing existing monthly debts would improve your eligibility.');
    nextSteps.push('Pay down existing debts to lower your DTI ratio.');
    nextSteps.push('Consider a smaller loan amount.');
    nextSteps.push('Explore debt consolidation options.');

    return {
      isPrequalified: false,
      loanType: data.loanType,
      estimatedRateRange: adjustedRate,
      maxLoanAmount: 0,
      dtiRatio: Number.isFinite(dti) ? Math.round(dti * 10000) / 100 : 999.99,
      riskLevel: 'high',
      reasons,
      nextSteps,
      disclaimer: DISCLAIMER,
    };
  }

  if (riskLevel === 'low') {
    reasons.push('Strong credit profile and healthy debt-to-income ratio.');
    reasons.push('You are likely to qualify for competitive rates.');
  } else if (riskLevel === 'medium') {
    reasons.push('Moderate risk profile based on your credit and financial data.');
    reasons.push('You may qualify, but rates may be higher than the lowest available.');
  } else {
    reasons.push('Higher risk profile detected.');
    reasons.push('You may still qualify, but expect rates toward the higher end of the range.');
  }

  if (data.totalAssets > maxLoan * 0.2) {
    reasons.push('Sufficient assets detected to support collateral requirements.');
  }

  nextSteps.push('Gather required documents: pay stubs, tax returns, bank statements.');
  nextSteps.push('Submit a formal loan application with a lender.');
  nextSteps.push('Compare offers from multiple lenders to find the best rate.');

  if (data.loanType === 'mortgage') {
    nextSteps.push('Get a home appraisal scheduled.');
    nextSteps.push('Secure homeowner\'s insurance quotes.');
  }

  return {
    isPrequalified: true,
    loanType: data.loanType,
    estimatedRateRange: adjustedRate,
    maxLoanAmount: maxLoan,
    dtiRatio: Number.isFinite(dti) ? Math.round(dti * 10000) / 100 : 999.99,
    riskLevel,
    reasons,
    nextSteps,
    disclaimer: DISCLAIMER,
  };
}

const DISCLAIMER =
  'This is a pre-qualification estimate only and does not constitute a loan offer, commitment, or guarantee of approval. ' +
  'Actual rates, terms, and approval are subject to a formal application, credit check, income verification, and lender underwriting. ' +
  'Interest rates and loan amounts may vary based on market conditions and individual circumstances. ' +
  'Please consult with a licensed loan officer for personalized guidance.';
