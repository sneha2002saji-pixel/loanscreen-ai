import { describe, it, expect } from 'vitest';
import { calculateEligibility } from '@/lib/rateEngine';
import type { CollectedData } from '@/types/chat';
import { LOAN_CONFIGS, CREDIT_SCORE_RANGES } from '@/types/loan';

/**
 * Covers:
 * - SCRUM-76: Eligibility estimation with rate ranges
 * - SCRUM-77: Pre-qualification summary
 */

function makeData(overrides: Partial<CollectedData> = {}): CollectedData {
  return {
    loanType: 'personal',
    annualIncome: 100000,
    employmentStatus: 'full-time',
    monthlyDebts: 500,
    creditScoreRange: '800+',
    totalAssets: 50000,
    ...overrides,
  };
}

describe('calculateEligibility', () => {
  // ---------- Pre-qualification (happy path) ----------

  describe('pre-qualified scenarios', () => {
    it('should pre-qualify a borrower with excellent credit and low DTI', () => {
      const result = calculateEligibility(makeData());

      expect(result.isPrequalified).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.maxLoanAmount).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.nextSteps.length).toBeGreaterThan(0);
    });

    it('should include asset support reason when totalAssets > 20% of maxLoan', () => {
      const result = calculateEligibility(makeData({ totalAssets: 500000 }));

      expect(result.isPrequalified).toBe(true);
      expect(result.reasons).toContain(
        'Sufficient assets detected to support collateral requirements.'
      );
    });

    it('should not include asset reason when totalAssets are low', () => {
      const result = calculateEligibility(makeData({ totalAssets: 0 }));

      expect(result.isPrequalified).toBe(true);
      expect(result.reasons).not.toContain(
        'Sufficient assets detected to support collateral requirements.'
      );
    });
  });

  // ---------- Denial by credit score ----------

  describe('denial by credit score', () => {
    it('should deny when credit score is below 580', () => {
      const result = calculateEligibility(
        makeData({ creditScoreRange: 'below-580' })
      );

      expect(result.isPrequalified).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.maxLoanAmount).toBe(0);
      expect(result.reasons[0]).toContain('Credit score below 580');
      expect(result.nextSteps.some((s) => s.includes('credit score'))).toBe(true);
    });
  });

  // ---------- Denial by DTI ----------

  describe('denial by DTI ratio', () => {
    it('should deny when DTI exceeds the threshold for personal loans', () => {
      const result = calculateEligibility(
        makeData({
          loanType: 'personal',
          annualIncome: 48000,
          monthlyDebts: 2000,
        })
      );

      expect(result.isPrequalified).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.maxLoanAmount).toBe(0);
      expect(result.reasons[0]).toContain('debt-to-income ratio');
    });

    it('should deny when DTI exceeds the threshold for mortgage', () => {
      const result = calculateEligibility(
        makeData({
          loanType: 'mortgage',
          annualIncome: 48000,
          monthlyDebts: 2000,
        })
      );

      expect(result.isPrequalified).toBe(false);
      expect(result.maxLoanAmount).toBe(0);
    });

    it('should deny when monthly income is zero', () => {
      const result = calculateEligibility(
        makeData({ annualIncome: 0, monthlyDebts: 100 })
      );

      expect(result.isPrequalified).toBe(false);
      expect(result.dtiRatio).toBe(999.99);
    });
  });

  // ---------- Loan type variations ----------

  describe('loan type variations', () => {
    it.each(['personal', 'auto', 'mortgage'] as const)(
      'should use correct base rates for %s loans',
      (loanType) => {
        const data = makeData({ loanType });
        const result = calculateEligibility(data);
        const config = LOAN_CONFIGS[loanType];

        expect(result.loanType).toBe(loanType);
        expect(result.estimatedRateRange.min).toBeGreaterThanOrEqual(config.baseRate.min);
        expect(result.estimatedRateRange.max).toBeGreaterThanOrEqual(config.baseRate.max);
      }
    );

    it('should add mortgage-specific next steps', () => {
      const result = calculateEligibility(makeData({ loanType: 'mortgage' }));

      expect(result.isPrequalified).toBe(true);
      expect(result.nextSteps).toContain('Get a home appraisal scheduled.');
      expect(result.nextSteps).toContain("Secure homeowner's insurance quotes.");
    });

    it('should not include mortgage steps for personal loans', () => {
      const result = calculateEligibility(makeData({ loanType: 'personal' }));

      expect(result.nextSteps).not.toContain('Get a home appraisal scheduled.');
    });

    it('should calculate larger maxLoanAmount for mortgage due to longer term', () => {
      const base = {
        annualIncome: 120000,
        monthlyDebts: 500,
        creditScoreRange: '800+' as const,
        totalAssets: 50000,
        employmentStatus: 'full-time',
      };

      const personal = calculateEligibility({ ...base, loanType: 'personal' });
      const mortgage = calculateEligibility({ ...base, loanType: 'mortgage' });

      expect(mortgage.maxLoanAmount).toBeGreaterThan(personal.maxLoanAmount);
    });
  });

  // ---------- Rate adjustments per credit score range ----------

  describe('rate adjustments by credit score', () => {
    it.each(
      CREDIT_SCORE_RANGES.filter((r) => r.value !== 'below-580').map((r) => ({
        range: r.value,
        adjustment: r.adjustment,
      }))
    )(
      'should apply $adjustment adjustment for $range credit score',
      ({ range, adjustment }) => {
        const result = calculateEligibility(makeData({ creditScoreRange: range }));
        const baseRate = LOAN_CONFIGS.personal.baseRate;

        const expectedMin =
          Math.round((baseRate.min + adjustment) * 100) / 100;
        const expectedMax =
          Math.round((baseRate.max + adjustment) * 100) / 100;

        expect(result.estimatedRateRange.min).toBe(expectedMin);
        expect(result.estimatedRateRange.max).toBe(expectedMax);
      }
    );

    it('should produce higher rates for lower credit scores', () => {
      const excellent = calculateEligibility(
        makeData({ creditScoreRange: '800+' })
      );
      const fair = calculateEligibility(
        makeData({ creditScoreRange: '580-669' })
      );

      expect(fair.estimatedRateRange.min).toBeGreaterThan(
        excellent.estimatedRateRange.min
      );
      expect(fair.estimatedRateRange.max).toBeGreaterThan(
        excellent.estimatedRateRange.max
      );
    });
  });

  // ---------- Max loan amount ----------

  describe('max loan amount calculation', () => {
    it('should return 0 when allowable monthly payment is negative', () => {
      const result = calculateEligibility(
        makeData({ annualIncome: 24000, monthlyDebts: 1500 })
      );

      expect(result.maxLoanAmount).toBe(0);
    });

    it('should compute correct maxLoan for known inputs (personal)', () => {
      // annualIncome=120000 => monthly=10000
      // monthlyDebts=500, dtiThreshold=0.36 (personal)
      // allowable = 10000*0.36 - 500 = 3100
      // personal term = 60 months => 3100*60 = 186000
      const result = calculateEligibility(
        makeData({ annualIncome: 120000, monthlyDebts: 500, loanType: 'personal' })
      );

      expect(result.maxLoanAmount).toBe(186000);
    });

    it('should compute correct maxLoan for mortgage with longer term', () => {
      // annualIncome=120000 => monthly=10000
      // monthlyDebts=500, dtiThreshold=0.43 (mortgage)
      // allowable = 10000*0.43 - 500 = 3800
      // mortgage term = 300 months => 3800*300 = 1140000
      const result = calculateEligibility(
        makeData({ annualIncome: 120000, monthlyDebts: 500, loanType: 'mortgage' })
      );

      expect(result.maxLoanAmount).toBe(1140000);
    });
  });

  // ---------- Risk level ----------

  describe('risk level determination', () => {
    it('should return low risk for excellent credit and very low DTI', () => {
      const result = calculateEligibility(
        makeData({
          creditScoreRange: '800+',
          annualIncome: 200000,
          monthlyDebts: 100,
        })
      );

      expect(result.riskLevel).toBe('low');
    });

    it('should return medium risk for good credit and moderate DTI', () => {
      const result = calculateEligibility(
        makeData({
          creditScoreRange: '670-739',
          annualIncome: 80000,
          monthlyDebts: 1000,
        })
      );

      expect(result.riskLevel).toBe('medium');
    });

    it('should return high risk for fair credit and high DTI', () => {
      const result = calculateEligibility(
        makeData({
          creditScoreRange: '580-669',
          annualIncome: 60000,
          monthlyDebts: 1400,
        })
      );

      expect(result.riskLevel).toBe('high');
    });
  });

  // ---------- DTI ratio formatting ----------

  describe('DTI ratio value', () => {
    it('should express DTI as a percentage with up to 2 decimal places', () => {
      // monthlyDebts=500, annualIncome=100000 => monthly=8333.33
      // DTI = 500/8333.33 = 0.06 => 6.00%
      const result = calculateEligibility(makeData());

      expect(result.dtiRatio).toBeCloseTo(6.0, 0);
      expect(typeof result.dtiRatio).toBe('number');
    });
  });

  // ---------- Disclaimer ----------

  describe('disclaimer', () => {
    it('should always include a disclaimer on pre-qualified results', () => {
      const result = calculateEligibility(makeData());

      expect(result.disclaimer).toBeTruthy();
      expect(result.disclaimer).toContain('pre-qualification estimate only');
    });

    it('should always include a disclaimer on denied results', () => {
      const result = calculateEligibility(
        makeData({ creditScoreRange: 'below-580' })
      );

      expect(result.disclaimer).toBeTruthy();
      expect(result.disclaimer).toContain('pre-qualification estimate only');
    });
  });

  // ---------- Edge case data (bug fix coverage) ----------

  describe('edge case data', () => {
    it('should handle zero monthly debts', () => {
      const result = calculateEligibility(
        makeData({
          loanType: 'personal',
          annualIncome: 60000,
          employmentStatus: 'full-time',
          monthlyDebts: 0,
          creditScoreRange: '740-799',
          totalAssets: 20000,
        })
      );
      expect(result.isPrequalified).toBe(true);
      expect(result.dtiRatio).toBe(0);
    });

    it('should handle zero assets with qualifying profile', () => {
      const result = calculateEligibility(
        makeData({
          loanType: 'auto',
          annualIncome: 80000,
          employmentStatus: 'full-time',
          monthlyDebts: 500,
          creditScoreRange: '800+',
          totalAssets: 0,
        })
      );
      expect(result.isPrequalified).toBe(true);
    });

    it('should handle zero debts and zero assets together', () => {
      const result = calculateEligibility(
        makeData({
          loanType: 'mortgage',
          annualIncome: 100000,
          employmentStatus: 'full-time',
          monthlyDebts: 0,
          creditScoreRange: '740-799',
          totalAssets: 0,
        })
      );
      expect(result.isPrequalified).toBe(true);
      expect(result.dtiRatio).toBe(0);
      expect(result.maxLoanAmount).toBeGreaterThan(0);
    });

    it('should correctly calculate maxLoan when debts are zero for auto loan', () => {
      // annualIncome=60000 => monthly=5000
      // monthlyDebts=0, dtiThreshold=0.36 (auto)
      // allowable = 5000*0.36 - 0 = 1800
      // auto term = 60 months => 1800*60 = 108000
      const result = calculateEligibility(
        makeData({
          loanType: 'auto',
          annualIncome: 60000,
          monthlyDebts: 0,
          creditScoreRange: '800+',
          totalAssets: 10000,
        })
      );
      expect(result.maxLoanAmount).toBe(108000);
    });

    it('should deny when debts consume all DTI capacity even with excellent credit', () => {
      const result = calculateEligibility(
        makeData({
          loanType: 'personal',
          annualIncome: 36000,
          monthlyDebts: 1200,
          creditScoreRange: '800+',
          totalAssets: 100000,
        })
      );
      // monthly=3000, dtiThreshold=0.36, allowable=3000*0.36-1200=-120
      expect(result.isPrequalified).toBe(false);
      expect(result.maxLoanAmount).toBe(0);
    });
  });
});
