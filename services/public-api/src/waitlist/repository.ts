import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { NormalizedJoinWaitlistInput } from '@misneach/public-flows';
import { randomUUID } from 'crypto';

export type WaitlistJoinResult = {
  ok: true;
  alreadyJoined: boolean;
  id: string;
};

type WaitlistItem = {
  entryKey: string;
  id: string;
  email: string;
  interest: string;
  name?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
};

export class WaitlistRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly now = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  async join(input: NormalizedJoinWaitlistInput): Promise<WaitlistJoinResult> {
    const entryKey = waitlistEntryKey(input.email, input.interest);
    const timestamp = this.now().toISOString();
    const id = this.createId();

    const item: WaitlistItem = {
      entryKey,
      id,
      email: input.email,
      interest: input.interest,
      name: input.name,
      source: input.source,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: 'attribute_not_exists(entryKey)',
        }),
      );

      return {
        ok: true,
        alreadyJoined: false,
        id,
      };
    } catch (error) {
      if (!isConditionalCheckFailed(error)) throw error;

      const existing = await this.client.send(
        new GetCommand({
          TableName: this.tableName,
          Key: { entryKey },
          ProjectionExpression: 'id',
        }),
      );

      const existingId = typeof existing.Item?.id === 'string' ? existing.Item.id : id;
      return {
        ok: true,
        alreadyJoined: true,
        id: existingId,
      };
    }
  }
}

export function waitlistEntryKey(email: string, interest: string) {
  return `${email}#${interest}`;
}

function isConditionalCheckFailed(error: unknown) {
  return (
    error instanceof ConditionalCheckFailedException ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'ConditionalCheckFailedException')
  );
}
