import { describe, it, expect } from 'vitest';
import {
  validateChatRequest,
  sanitizeString,
  parseNumericValue,
  extractLoanType,
  extractCreditRange,
  extractEmploymentStatus,
  validateCollectedData,
  isValidLoanType,
  isValidCreditRange,
  isValidStage,
  isPositiveNumber,
} from '@/lib/validators';

/**
 * Covers:
 * - SCRUM-74: Structured question flow (extractors, validators)
 * - SCRUM-73: Chatbot UI with thinking (chat request validation)
 * - SCRUM-79: Next.js scaffold (input sanitization)
 */

// ---------- validateChatRequest ----------

describe('validateChatRequest', () => {
  const validBody = {
    message: 'Hello',
    sessionId: 'abc-123',
    userId: 'user-1',
    stage: 'greeting',
  };

  it('should accept a valid request', () => {
    expect(validateChatRequest(validBody)).toEqual({ valid: true });
  });

  it('should reject null body', () => {
    const result = validateChatRequest(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JSON object');
  });

  it('should reject non-object body', () => {
    expect(validateChatRequest('string')).toEqual({
      valid: false,
      error: 'Request body must be a JSON object',
    });
  });

  it('should reject missing message', () => {
    const result = validateChatRequest({ ...validBody, message: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('message');
  });

  it('should reject non-string message', () => {
    const result = validateChatRequest({ ...validBody, message: 123 });
    expect(result.valid).toBe(false);
  });

  it('should reject missing sessionId', () => {
    const result = validateChatRequest({ ...validBody, sessionId: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('sessionId');
  });

  it('should reject missing userId', () => {
    const result = validateChatRequest({ ...validBody, userId: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('userId');
  });

  it('should reject invalid stage', () => {
    const result = validateChatRequest({ ...validBody, stage: 'invalid_stage' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('stage');
  });

  it('should accept all valid stages', () => {
    const stages = [
      'greeting',
      'loan_type_selection',
      'income_employment',
      'debts_expenses',
      'credit_score_range',
      'assets',
      'eligibility_calc',
      'summary',
      'completed',
    ];

    for (const stage of stages) {
      const result = validateChatRequest({ ...validBody, stage });
      expect(result.valid).toBe(true);
    }
  });
});

// ---------- sanitizeString ----------

describe('sanitizeString', () => {
  it('should remove angle brackets to prevent XSS', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe(
      'scriptalert("xss")/script'
    );
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should truncate to 2000 characters', () => {
    const longInput = 'a'.repeat(3000);
    expect(sanitizeString(longInput).length).toBe(2000);
  });

  it('should handle empty string', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('should preserve normal text', () => {
    expect(sanitizeString('I need a personal loan')).toBe('I need a personal loan');
  });
});

// ---------- parseNumericValue ----------

describe('parseNumericValue', () => {
  it('should parse plain integers', () => {
    expect(parseNumericValue('50000')).toBe(50000);
  });

  it('should parse currency formatted strings', () => {
    expect(parseNumericValue('$75,000')).toBe(75000);
  });

  it('should parse decimals', () => {
    expect(parseNumericValue('1234.56')).toBe(1234.56);
  });

  it('should parse currency with decimals', () => {
    expect(parseNumericValue('$1,234.56')).toBe(1234.56);
  });

  it('should handle strings with extra spaces', () => {
    expect(parseNumericValue(' $50,000 ')).toBe(50000);
  });

  it('should return null for non-numeric text', () => {
    expect(parseNumericValue('not a number')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseNumericValue('')).toBeNull();
  });

  it('should return 0 for zero', () => {
    expect(parseNumericValue('0')).toBe(0);
  });

  it('should extract number from mixed text', () => {
    expect(parseNumericValue('about 65000 per year')).toBe(65000);
  });
});

// ---------- extractLoanType ----------

describe('extractLoanType', () => {
  it('should extract personal loan type', () => {
    expect(extractLoanType('I want a personal loan')).toBe('personal');
  });

  it('should extract auto loan type', () => {
    expect(extractLoanType('I need an auto loan')).toBe('auto');
  });

  it('should extract auto from "car" synonym', () => {
    expect(extractLoanType('Looking for a car loan')).toBe('auto');
  });

  it('should extract auto from "vehicle" synonym', () => {
    expect(extractLoanType('vehicle financing')).toBe('auto');
  });

  it('should extract mortgage loan type', () => {
    expect(extractLoanType('I want a mortgage')).toBe('mortgage');
  });

  it('should extract mortgage from "home" synonym', () => {
    expect(extractLoanType('home loan please')).toBe('mortgage');
  });

  it('should extract mortgage from "house" synonym', () => {
    expect(extractLoanType('I want to buy a house')).toBe('mortgage');
  });

  it('should be case insensitive', () => {
    expect(extractLoanType('PERSONAL LOAN')).toBe('personal');
  });

  it('should return null for unrecognized text', () => {
    expect(extractLoanType('I need money')).toBeNull();
  });
});

// ---------- extractCreditRange ----------

describe('extractCreditRange', () => {
  it('should extract 800+ from number', () => {
    expect(extractCreditRange('my score is around 800')).toBe('800+');
  });

  it('should extract 800+ from "excellent" synonym', () => {
    expect(extractCreditRange('excellent credit')).toBe('800+');
  });

  it('should extract 740-799 from number', () => {
    expect(extractCreditRange('about 740')).toBe('740-799');
  });

  it('should extract 740-799 from "very good" synonym', () => {
    expect(extractCreditRange('very good')).toBe('740-799');
  });

  it('should extract 670-739 from number', () => {
    expect(extractCreditRange('around 670')).toBe('670-739');
  });

  it('should extract 670-739 from "good" synonym', () => {
    expect(extractCreditRange('good credit')).toBe('670-739');
  });

  it('should extract 580-669 from number', () => {
    expect(extractCreditRange('about 580')).toBe('580-669');
  });

  it('should extract 580-669 from "fair" synonym', () => {
    expect(extractCreditRange('fair')).toBe('580-669');
  });

  it('should extract below-580 from "below" keyword', () => {
    expect(extractCreditRange('below average')).toBe('below-580');
  });

  it('should extract below-580 from "poor" synonym', () => {
    expect(extractCreditRange('poor credit')).toBe('below-580');
  });

  it('should extract below-580 from "bad" synonym', () => {
    expect(extractCreditRange('bad credit history')).toBe('below-580');
  });

  it('should return null for unrecognized text', () => {
    expect(extractCreditRange('not sure')).toBeNull();
  });
});

// ---------- extractEmploymentStatus ----------

describe('extractEmploymentStatus', () => {
  it('should extract full-time from "full-time"', () => {
    expect(extractEmploymentStatus('I work full-time')).toBe('full-time');
  });

  it('should extract full-time from "full time" (no hyphen)', () => {
    expect(extractEmploymentStatus('full time employee')).toBe('full-time');
  });

  it('should extract full-time from "employed"', () => {
    expect(extractEmploymentStatus('I am employed')).toBe('full-time');
  });

  it('should extract part-time', () => {
    expect(extractEmploymentStatus('part-time job')).toBe('part-time');
  });

  it('should extract part-time without hyphen', () => {
    expect(extractEmploymentStatus('I work part time')).toBe('part-time');
  });

  it('should extract self-employed', () => {
    expect(extractEmploymentStatus('I am self-employed')).toBe('self-employed');
  });

  it('should extract self-employed from "freelanc" prefix', () => {
    expect(extractEmploymentStatus('I freelance')).toBe('self-employed');
  });

  it('should extract retired', () => {
    expect(extractEmploymentStatus('I am retired')).toBe('retired');
  });

  it('should extract retired from "retirement"', () => {
    expect(extractEmploymentStatus('in retirement')).toBe('retired');
  });

  it('should extract unemployed', () => {
    expect(extractEmploymentStatus('currently unemployed')).toBe('unemployed');
  });

  it('should extract unemployed from "not working"', () => {
    expect(extractEmploymentStatus('not working right now')).toBe('unemployed');
  });

  it('should extract unemployed from "between jobs"', () => {
    expect(extractEmploymentStatus('between jobs')).toBe('unemployed');
  });

  it('should return null for unrecognized text', () => {
    expect(extractEmploymentStatus('student')).toBeNull();
  });
});

// ---------- validateCollectedData ----------

describe('validateCollectedData', () => {
  it('should report complete when all fields present', () => {
    const result = validateCollectedData({
      loanType: 'personal',
      annualIncome: 80000,
      employmentStatus: 'full-time',
      monthlyDebts: 500,
      creditScoreRange: '740-799',
      totalAssets: 20000,
    });

    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should report missing fields for empty data', () => {
    const result = validateCollectedData({});

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('loanType');
    expect(result.missing).toContain('annualIncome');
    expect(result.missing).toContain('employmentStatus');
    expect(result.missing).toContain('monthlyDebts');
    expect(result.missing).toContain('creditScoreRange');
    expect(result.missing).toContain('totalAssets');
    expect(result.missing).toHaveLength(6);
  });

  it('should report only the missing fields', () => {
    const result = validateCollectedData({
      loanType: 'auto',
      annualIncome: 60000,
    });

    expect(result.complete).toBe(false);
    expect(result.missing).not.toContain('loanType');
    expect(result.missing).not.toContain('annualIncome');
    expect(result.missing).toContain('employmentStatus');
    expect(result.missing).toContain('monthlyDebts');
  });

  it('should treat 0 values as present for numeric fields', () => {
    const result = validateCollectedData({
      loanType: 'personal',
      annualIncome: 0,
      employmentStatus: 'unemployed',
      monthlyDebts: 0,
      creditScoreRange: 'below-580',
      totalAssets: 0,
    });

    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

// ---------- Standalone validators ----------

describe('isValidLoanType', () => {
  it.each(['personal', 'auto', 'mortgage'])('should accept "%s"', (type) => {
    expect(isValidLoanType(type)).toBe(true);
  });

  it('should reject invalid types', () => {
    expect(isValidLoanType('student')).toBe(false);
    expect(isValidLoanType('')).toBe(false);
  });
});

describe('isValidCreditRange', () => {
  it.each(['800+', '740-799', '670-739', '580-669', 'below-580'])(
    'should accept "%s"',
    (range) => {
      expect(isValidCreditRange(range)).toBe(true);
    }
  );

  it('should reject invalid ranges', () => {
    expect(isValidCreditRange('excellent')).toBe(false);
  });
});

describe('isValidStage', () => {
  it('should accept all defined stages', () => {
    expect(isValidStage('greeting')).toBe(true);
    expect(isValidStage('eligibility_calc')).toBe(true);
    expect(isValidStage('completed')).toBe(true);
  });

  it('should reject invalid stage', () => {
    expect(isValidStage('unknown')).toBe(false);
  });
});

describe('isPositiveNumber', () => {
  it('should accept positive numbers', () => {
    expect(isPositiveNumber(42)).toBe(true);
    expect(isPositiveNumber(0.01)).toBe(true);
  });

  it('should reject zero', () => {
    expect(isPositiveNumber(0)).toBe(false);
  });

  it('should reject negative numbers', () => {
    expect(isPositiveNumber(-5)).toBe(false);
  });

  it('should reject non-numbers', () => {
    expect(isPositiveNumber('42')).toBe(false);
    expect(isPositiveNumber(null)).toBe(false);
    expect(isPositiveNumber(undefined)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
    expect(isPositiveNumber(Infinity)).toBe(false);
  });
});

// ---------- validateCollectedData edge cases (bug fix coverage) ----------

describe('validateCollectedData edge cases', () => {
  it('should identify all missing fields when data is empty', () => {
    const result = validateCollectedData({});
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual([
      'loanType',
      'annualIncome',
      'employmentStatus',
      'monthlyDebts',
      'creditScoreRange',
      'totalAssets',
    ]);
  });

  it('should identify single missing field', () => {
    const result = validateCollectedData({
      loanType: 'personal',
      annualIncome: 75000,
      employmentStatus: 'full-time',
      monthlyDebts: 500,
      creditScoreRange: '740-799',
      // totalAssets missing
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(['totalAssets']);
  });

  it('should handle zero values for numeric fields as present', () => {
    const result = validateCollectedData({
      loanType: 'auto',
      annualIncome: 50000,
      employmentStatus: 'full-time',
      monthlyDebts: 0,
      creditScoreRange: '670-739',
      totalAssets: 0,
    });
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should detect missing annualIncome when only string fields are provided', () => {
    const result = validateCollectedData({
      loanType: 'mortgage',
      employmentStatus: 'self-employed',
      creditScoreRange: '800+',
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('annualIncome');
    expect(result.missing).toContain('monthlyDebts');
    expect(result.missing).toContain('totalAssets');
    expect(result.missing).not.toContain('loanType');
    expect(result.missing).not.toContain('employmentStatus');
    expect(result.missing).not.toContain('creditScoreRange');
  });

  it('should detect missing string fields when only numeric fields are provided', () => {
    const result = validateCollectedData({
      annualIncome: 60000,
      monthlyDebts: 200,
      totalAssets: 10000,
    });
    expect(result.complete).toBe(false);
    expect(result.missing).toContain('loanType');
    expect(result.missing).toContain('employmentStatus');
    expect(result.missing).toContain('creditScoreRange');
    expect(result.missing).not.toContain('annualIncome');
    expect(result.missing).not.toContain('monthlyDebts');
    expect(result.missing).not.toContain('totalAssets');
  });
});

// ---------- Extraction false positive safety (stage-independent bug fix) ----------

describe('extraction false positive safety', () => {
  it('extractLoanType should not match on unrelated text', () => {
    expect(extractLoanType('My annual income is $75000')).toBeNull();
    expect(extractLoanType('I have 500 in debts')).toBeNull();
  });

  it('extractLoanType should not match on credit score text', () => {
    expect(extractLoanType('My credit score is 740')).toBeNull();
    expect(extractLoanType('I am employed full-time')).toBeNull();
  });

  it('extractEmploymentStatus should not match on credit score text', () => {
    expect(extractEmploymentStatus('My credit score is 740')).toBeNull();
    expect(extractEmploymentStatus('I have $50000 in assets')).toBeNull();
  });

  it('extractEmploymentStatus should not match on loan type text', () => {
    expect(extractEmploymentStatus('I want a personal loan')).toBeNull();
    expect(extractEmploymentStatus('Looking for a mortgage')).toBeNull();
  });

  it('extractCreditRange should not match on income text', () => {
    expect(extractCreditRange('My income is $75000 annually')).toBeNull();
    expect(extractCreditRange('I owe $500 monthly')).toBeNull();
  });

  it('extractCreditRange should not match on employment text', () => {
    expect(extractCreditRange('I work full-time')).toBeNull();
    expect(extractCreditRange('I am self-employed')).toBeNull();
  });
});
