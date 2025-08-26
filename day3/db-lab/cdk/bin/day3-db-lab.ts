#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Day3DbLabStack } from '../lib/day3-db-lab-stack';

const app = new cdk.App();

new Day3DbLabStack(app, 'Day3DbLabStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Day3 Database Lab - Employee Management System with RDS and EC2',
});

app.synth();
