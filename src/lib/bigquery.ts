import { BigQuery } from '@google-cloud/bigquery';
import type { CollectedData, ConversationStage } from '@/types/chat';
import type { UserProfile } from '@/types/user';
import type { EligibilityResult } from '@/types/loan';

const PROJECT_ID = process.env.GCP_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
const DATASET = 'loanscreen';

let bigqueryClient: BigQuery | null = null;

function getClient(): BigQuery {
  if (!bigqueryClient) {
    bigqueryClient = new BigQuery({
      projectId: PROJECT_ID,
    });
  }
  return bigqueryClient;
}

function isBigQueryConfigured(): boolean {
  return Boolean(PROJECT_ID);
}

export interface SessionRow {
  session_id: string;
  user_id: string;
  stage: ConversationStage;
  collected_data: string;
  eligibility_result: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  if (!isBigQueryConfigured()) {
    console.warn('[BigQuery] Not configured — skipping user lookup');
    return null;
  }

  const client = getClient();
  const query = `
    SELECT id, name, email, created_at
    FROM \`${DATASET}.users\`
    WHERE id = @userId
    LIMIT 1
  `;

  const [rows] = await client.query({
    query,
    params: { userId: id },
  });

  if (!rows || rows.length === 0) return null;

  const row = rows[0] as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    createdAt: String(row.created_at),
  };
}

export async function createSession(data: {
  sessionId: string;
  userId: string;
  stage: ConversationStage;
  collectedData: Partial<CollectedData>;
}): Promise<void> {
  if (!isBigQueryConfigured()) {
    console.warn('[BigQuery] Not configured — skipping session creation');
    return;
  }

  const client = getClient();
  const query = `
    INSERT INTO \`${DATASET}.sessions\`
      (session_id, user_id, stage, collected_data, created_at, updated_at)
    VALUES
      (@sessionId, @userId, @stage, @collectedData, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
  `;

  await client.query({
    query,
    params: {
      sessionId: data.sessionId,
      userId: data.userId,
      stage: data.stage,
      collectedData: JSON.stringify(data.collectedData),
    },
  });
}

export async function updateSession(
  sessionId: string,
  data: {
    stage: ConversationStage;
    collectedData: Partial<CollectedData>;
    eligibilityResult?: EligibilityResult;
  }
): Promise<void> {
  if (!isBigQueryConfigured()) {
    console.warn('[BigQuery] Not configured — skipping session update');
    return;
  }

  const client = getClient();
  const query = `
    UPDATE \`${DATASET}.sessions\`
    SET
      stage = @stage,
      collected_data = @collectedData,
      eligibility_result = @eligibilityResult,
      updated_at = CURRENT_TIMESTAMP()
    WHERE session_id = @sessionId
  `;

  await client.query({
    query,
    params: {
      sessionId,
      stage: data.stage,
      collectedData: JSON.stringify(data.collectedData),
      eligibilityResult: data.eligibilityResult
        ? JSON.stringify(data.eligibilityResult)
        : null,
    },
  });
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  if (!isBigQueryConfigured()) {
    return null;
  }

  const client = getClient();
  const query = `
    SELECT session_id, user_id, stage, collected_data, eligibility_result, created_at, updated_at
    FROM \`${DATASET}.sessions\`
    WHERE session_id = @sessionId
    LIMIT 1
  `;

  const [rows] = await client.query({
    query,
    params: { sessionId },
  });

  if (!rows || rows.length === 0) return null;

  const row = rows[0] as Record<string, unknown>;
  return {
    session_id: String(row.session_id),
    user_id: String(row.user_id),
    stage: String(row.stage) as ConversationStage,
    collected_data: String(row.collected_data),
    eligibility_result: row.eligibility_result ? String(row.eligibility_result) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
