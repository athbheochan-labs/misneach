import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface PublicApiStackProps extends cdk.StackProps {
  environmentName: string;
}

export class PublicApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PublicApiStackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('Application', 'decyphr');
    cdk.Tags.of(this).add('Service', 'public-api');
    cdk.Tags.of(this).add('Environment', props.environmentName);

    const waitlistTable = new dynamodb.Table(this, 'WaitlistTable', {
      tableName: `decyphr-${props.environmentName}-waitlist`,
      partitionKey: {
        name: 'entryKey',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const waitlistJoinHandler = new nodejs.NodejsFunction(this, 'WaitlistJoinHandler', {
      functionName: `decyphr-${props.environmentName}-waitlist-join`,
      entry: path.join(__dirname, '../../../services/public-api/src/waitlist/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      environment: {
        WAITLIST_TABLE_NAME: waitlistTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });
    waitlistTable.grantReadWriteData(waitlistJoinHandler);

    const httpApi = new apigatewayv2.HttpApi(this, 'PublicHttpApi', {
      apiName: `decyphr-${props.environmentName}-public-api`,
      corsPreflight: {
        allowHeaders: ['content-type'],
        allowMethods: [apigatewayv2.CorsHttpMethod.OPTIONS, apigatewayv2.CorsHttpMethod.POST],
        allowOrigins: ['*'],
      },
    });

    httpApi.addRoutes({
      path: '/waitlist/join',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('WaitlistJoinIntegration', waitlistJoinHandler),
    });

    new cdk.CfnOutput(this, 'EnvironmentName', {
      value: props.environmentName,
      description: 'Deployment environment name used for resource naming.',
    });

    new cdk.CfnOutput(this, 'PublicApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'Base URL for public waitlist and survey API calls.',
    });

    new cdk.CfnOutput(this, 'WaitlistTableName', {
      value: waitlistTable.tableName,
      description: 'DynamoDB table backing public waitlist joins.',
    });
  }
}
