import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent } from '@/lib/utils';

/**
 * Covers:
 * - SCRUM-77: Pre-qualification summary (display formatting)
 * - SCRUM-79: Next.js scaffold (utility functions)
 */

describe('formatCurrency', () => {
  it('should format a standard amount', () => {
    expect(formatCurrency(50000)).toBe('$50,000');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should format large amounts with commas', () => {
    expect(formatCurrency(1500000)).toBe('$1,500,000');
  });

  it('should round and remove decimals', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });

  it('should format small amounts', () => {
    expect(formatCurrency(99)).toBe('$99');
  });

  it('should handle negative amounts', () => {
    const result = formatCurrency(-5000);
    expect(result).toContain('5,000');
  });
});

describe('formatPercent', () => {
  it('should format a decimal percentage', () => {
    expect(formatPercent(5.5)).toBe('5.50%');
  });

  it('should format zero', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('should format integer values with two decimal places', () => {
    expect(formatPercent(7)).toBe('7.00%');
  });

  it('should format values with many decimals to two places', () => {
    expect(formatPercent(3.14159)).toBe('3.14%');
  });

  it('should format large percentages', () => {
    expect(formatPercent(100)).toBe('100.00%');
  });
});
