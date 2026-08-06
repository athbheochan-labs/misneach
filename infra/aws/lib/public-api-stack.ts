import * as cdk from 'aws-cdk-lib';
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

    new cdk.CfnOutput(this, 'EnvironmentName', {
      value: props.environmentName,
      description: 'Deployment environment name used for resource naming.',
    });
  }
}
