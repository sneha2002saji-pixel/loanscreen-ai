export interface QuickReply {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  timestamp: Date;
  quickReplies?: QuickReply[];
}

export type ConversationStage =
  | 'greeting'
  | 'loan_type_selection'
  | 'income_employment'
  | 'debts_expenses'
  | 'credit_score_range'
  | 'assets'
  | 'eligibility_calc'
  | 'summary'
  | 'completed';

export interface ConversationState {
  sessionId: string;
  userId: string;
  stage: ConversationStage;
  collectedData: Partial<CollectedData>;
  messages: ChatMessage[];
}

export interface CollectedData {
  loanType: LoanType;
  annualIncome: number;
  employmentStatus: string;
  employerName?: string;
  yearsEmployed?: number;
  monthlyDebts: number;
  creditScoreRange: string;
  totalAssets: number;
  loanAmount?: number;
}

export type LoanType = 'personal' | 'auto' | 'mortgage';

export interface ChatRequest {
  message: string;
  sessionId: string;
  userId: string;
  stage: ConversationStage;
  collectedData: Partial<CollectedData>;
}

export type SSEEventType =
  | 'thinking'
  | 'content'
  | 'stage_update'
  | 'quick_replies'
  | 'result'
  | 'done'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: string;
}
