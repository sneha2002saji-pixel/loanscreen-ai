export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const DEMO_USERS: UserProfile[] = [
  { id: 'user-001', name: 'Alice Johnson', email: 'alice@example.com', createdAt: '2025-01-15T10:00:00Z' },
  { id: 'user-002', name: 'Bob Martinez', email: 'bob@example.com', createdAt: '2025-02-20T14:30:00Z' },
  { id: 'user-003', name: 'Carol Chen', email: 'carol@example.com', createdAt: '2025-03-10T09:15:00Z' },
  { id: 'user-004', name: 'David Kim', email: 'david@example.com', createdAt: '2025-04-05T16:45:00Z' },
  { id: 'user-005', name: 'Eva Rossi', email: 'eva@example.com', createdAt: '2025-05-12T11:00:00Z' },
];
