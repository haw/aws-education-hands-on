import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Day3DbLab from '../lib/day3-db-lab-stack';

describe('Day3DbLabStack', () => {
  test('VPC Created', () => {
    const app = new cdk.App();
    const stack = new Day3DbLab.Day3DbLabStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // VPCが作成されることを確認
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });
  });

  test('RDS Instance Created', () => {
    const app = new cdk.App();
    const stack = new Day3DbLab.Day3DbLabStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // RDSインスタンスが作成されることを確認
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.micro',
      Engine: 'mysql',
      DBName: 'employeedb',
      MasterUsername: 'admin',
      AllocatedStorage: '20',
      PubliclyAccessible: false,
    });
  });

  test('EC2 Instance Created', () => {
    const app = new cdk.App();
    const stack = new Day3DbLab.Day3DbLabStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // EC2インスタンスが作成されることを確認
    template.hasResourceProperties('AWS::EC2::Instance', {
      InstanceType: 't3.micro',
    });
  });

  test('Security Groups Created', () => {
    const app = new cdk.App();
    const stack = new Day3DbLab.Day3DbLabStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // セキュリティグループが2つ作成されることを確認
    template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
  });

  test('Outputs Defined', () => {
    const app = new cdk.App();
    const stack = new Day3DbLab.Day3DbLabStack(app, 'MyTestStack');
    const template = Template.fromStack(stack);

    // 必要な出力値が定義されていることを確認
    template.hasOutput('VpcId', {});
    template.hasOutput('DatabaseEndpoint', {});
    template.hasOutput('WebServerPublicIp', {});
    template.hasOutput('ApplicationUrl', {});
  });
});
