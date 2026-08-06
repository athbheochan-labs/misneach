import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { normalizeWaitlistJoin, PublicFlowValidationError } from '@misneach/public-flows';
import { createDynamoDocumentClient } from '../aws/dynamodb';
import { jsonResponse, parseJsonBody } from '../http/responses';
import { WaitlistRepository } from './repository';

let repository: WaitlistRepository | null = null;

function getRepository() {
  if (repository) return repository;
  const tableName = process.env.WAITLIST_TABLE_NAME;
  if (!tableName) return null;
  repository = new WaitlistRepository(createDynamoDocumentClient(), tableName);
  return repository;
}

export async function handler(event: APIGatewayProxyEventV2) {
  const waitlist = getRepository();
  if (!waitlist) {
    return jsonResponse(500, { error: 'WAITLIST_TABLE_NAME is required' });
  }

  let body: unknown;
  try {
    body = parseJsonBody(event.body, event.isBase64Encoded);
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  try {
    const payload = normalizeWaitlistJoin((body || {}) as Record<string, unknown>);
    const result = await waitlist.join(payload);
    return jsonResponse(200, result);
  } catch (error) {
    if (error instanceof PublicFlowValidationError) {
      return jsonResponse(400, { error: error.message });
    }

    console.error('Failed to join waitlist', error);
    return jsonResponse(500, { error: 'Failed to join waitlist' });
  }
}
