import type { ConversationStage, CollectedData, LoanType } from '@/types/chat';

const VALID_LOAN_TYPES = new Set<string>(['personal', 'auto', 'mortgage']);
const VALID_CREDIT_RANGES = new Set<string>([
  '800+',
  '740-799',
  '670-739',
  '580-669',
  'below-580',
]);
const VALID_STAGES = new Set<string>([
  'greeting',
  'loan_type_selection',
  'income_employment',
  'debts_expenses',
  'credit_score_range',
  'assets',
  'eligibility_calc',
  'summary',
  'completed',
]);

export function isValidLoanType(value: string): value is LoanType {
  return VALID_LOAN_TYPES.has(value);
}

export function isValidCreditRange(value: string): boolean {
  return VALID_CREDIT_RANGES.has(value);
}

export function isValidStage(value: string): value is ConversationStage {
  return VALID_STAGES.has(value);
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 2000);
}

export function validateChatRequest(body: unknown): {
  valid: boolean;
  error?: string;
} {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const data = body as Record<string, unknown>;

  if (typeof data.message !== 'string' || data.message.trim().length === 0) {
    return { valid: false, error: 'message is required and must be a non-empty string' };
  }

  if (typeof data.sessionId !== 'string' || data.sessionId.trim().length === 0) {
    return { valid: false, error: 'sessionId is required' };
  }

  if (typeof data.userId !== 'string' || data.userId.trim().length === 0) {
    return { valid: false, error: 'userId is required' };
  }

  if (typeof data.stage !== 'string' || !isValidStage(data.stage)) {
    return { valid: false, error: 'stage must be a valid conversation stage' };
  }

  return { valid: true };
}

export function parseNumericValue(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (match?.[1] !== undefined) {
    const num = parseFloat(match[1]);
    if (Number.isFinite(num) && num >= 0) {
      return num;
    }
  }
  return null;
}

export function extractLoanType(text: string): LoanType | null {
  const lower = text.toLowerCase();
  if (lower.includes('personal')) return 'personal';
  if (lower.includes('auto') || lower.includes('car') || lower.includes('vehicle')) return 'auto';
  if (lower.includes('mortgage') || lower.includes('home') || lower.includes('house')) return 'mortgage';
  return null;
}

export function extractCreditRange(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('800') || lower.includes('excellent')) return '800+';
  if (lower.includes('740') || lower.includes('very good')) return '740-799';
  if (lower.includes('670') || lower.includes('good')) return '670-739';
  if (lower.includes('below') || lower.includes('poor') || lower.includes('bad')) return 'below-580';
  if (lower.includes('580') || lower.includes('fair')) return '580-669';
  return null;
}

export function extractEmploymentStatus(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('self-employed') || lower.includes('self employed') || lower.includes('freelanc')) return 'self-employed';
  if (lower.includes('unemployed') || lower.includes('not working') || lower.includes('between jobs')) return 'unemployed';
  if (lower.includes('full-time') || lower.includes('full time') || lower.includes('employed')) return 'full-time';
  if (lower.includes('part-time') || lower.includes('part time')) return 'part-time';
  if (lower.includes('retired') || lower.includes('retirement')) return 'retired';
  return null;
}

export function validateCollectedData(
  data: Partial<CollectedData>
): { complete: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!data.loanType) missing.push('loanType');
  if (data.annualIncome === undefined) missing.push('annualIncome');
  if (!data.employmentStatus) missing.push('employmentStatus');
  if (data.monthlyDebts === undefined) missing.push('monthlyDebts');
  if (!data.creditScoreRange) missing.push('creditScoreRange');
  if (data.totalAssets === undefined) missing.push('totalAssets');

  return { complete: missing.length === 0, missing };
}
