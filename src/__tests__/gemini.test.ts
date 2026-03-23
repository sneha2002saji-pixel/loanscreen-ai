import { describe, it, expect } from 'vitest';
import { parseAssistantResponse } from '@/lib/gemini';

/**
 * Covers:
 * - SCRUM-73: Chatbot UI with thinking (response parsing)
 * - SCRUM-74: Structured question flow (stage transitions)
 * - SCRUM-75: Gemini AI backend (response format handling)
 */

describe('parseAssistantResponse', () => {
  // ---------- STAGE directive extraction ----------

  describe('STAGE directive', () => {
    it('should extract a valid STAGE directive', () => {
      const text = 'Great, a personal loan!\nSTAGE: income_employment\nWhat is your annual income?';
      const result = parseAssistantResponse(text);

      expect(result.newStage).toBe('income_employment');
      expect(result.content).not.toContain('STAGE:');
    });

    it('should extract each valid stage', () => {
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
        const result = parseAssistantResponse(`Hello\nSTAGE: ${stage}\nContent`);
        expect(result.newStage).toBe(stage);
      }
    });

    it('should return null newStage for invalid stage values', () => {
      const text = 'Hello\nSTAGE: invalid_stage\nContent';
      const result = parseAssistantResponse(text);

      expect(result.newStage).toBeNull();
    });

    it('should return null newStage when no STAGE directive is present', () => {
      const text = 'Welcome to LoanScreen AI! How can I help you?';
      const result = parseAssistantResponse(text);

      expect(result.newStage).toBeNull();
      expect(result.content).toBe(text);
    });
  });

  // ---------- QUICK_REPLIES extraction ----------

  describe('QUICK_REPLIES directive', () => {
    it('should extract quick replies from pipe-delimited list', () => {
      const text = 'What type of loan?\nQUICK_REPLIES: Personal Loan|Auto Loan|Mortgage';
      const result = parseAssistantResponse(text);

      expect(result.quickReplies).toHaveLength(3);
      expect(result.quickReplies[0]).toEqual({
        label: 'Personal Loan',
        value: 'Personal Loan',
      });
      expect(result.quickReplies[1]).toEqual({
        label: 'Auto Loan',
        value: 'Auto Loan',
      });
      expect(result.quickReplies[2]).toEqual({
        label: 'Mortgage',
        value: 'Mortgage',
      });
    });

    it('should trim whitespace from quick reply options', () => {
      const text = 'Pick one:\nQUICK_REPLIES:  Yes | No | Maybe ';
      const result = parseAssistantResponse(text);

      expect(result.quickReplies).toEqual([
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' },
        { label: 'Maybe', value: 'Maybe' },
      ]);
    });

    it('should remove QUICK_REPLIES line from content', () => {
      const text = 'What type?\nQUICK_REPLIES: A|B|C';
      const result = parseAssistantResponse(text);

      expect(result.content).not.toContain('QUICK_REPLIES');
      expect(result.content).toBe('What type?');
    });

    it('should return empty array when no QUICK_REPLIES present', () => {
      const text = 'Please tell me your income.';
      const result = parseAssistantResponse(text);

      expect(result.quickReplies).toEqual([]);
    });
  });

  // ---------- Combined directives ----------

  describe('combined STAGE and QUICK_REPLIES', () => {
    it('should extract both STAGE and QUICK_REPLIES from one response', () => {
      const text = [
        'Great, let me ask about your credit.',
        'STAGE: credit_score_range',
        'What is your approximate credit score?',
        'QUICK_REPLIES: Excellent (800+)|Very Good (740-799)|Good (670-739)|Fair (580-669)|Poor (below 580)',
      ].join('\n');

      const result = parseAssistantResponse(text);

      expect(result.newStage).toBe('credit_score_range');
      expect(result.quickReplies).toHaveLength(5);
      expect(result.content).not.toContain('STAGE:');
      expect(result.content).not.toContain('QUICK_REPLIES:');
      expect(result.content).toContain('Great, let me ask about your credit.');
      expect(result.content).toContain('What is your approximate credit score?');
    });
  });

  // ---------- Content cleaning ----------

  describe('content cleaning', () => {
    it('should preserve normal content without directives', () => {
      const text = 'Welcome! I am here to help you with loan pre-qualification.';
      const result = parseAssistantResponse(text);

      expect(result.content).toBe(text);
    });

    it('should handle empty string', () => {
      const result = parseAssistantResponse('');

      expect(result.content).toBe('');
      expect(result.quickReplies).toEqual([]);
      expect(result.newStage).toBeNull();
    });

    it('should clean up extra whitespace after removing directives', () => {
      const text = 'Hello\nSTAGE: greeting\n';
      const result = parseAssistantResponse(text);

      expect(result.content).toBe('Hello');
    });
  });
});
