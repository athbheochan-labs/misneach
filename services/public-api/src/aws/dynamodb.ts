import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export function createDynamoDocumentClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL || process.env.FLOCI_AWS_ENDPOINT_URL;
  const client = new DynamoDBClient({
    ...(endpoint ? { endpoint } : {}),
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-1',
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
}
