import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { join } from 'path';

export class Day3DbLabStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 🌐 VPC作成 - employee-app-vpc
    const vpc = new ec2.Vpc(this, 'EmployeeAppVpc', {
      vpcName: 'employee-app-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // 🔒 データベース用セキュリティグループ
    const databaseSg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      securityGroupName: 'database-sg',
      description: 'Security group for RDS database',
      allowAllOutbound: false, // アウトバウンドルールを明示的に制御
    });

    // 🔒 Webサーバー用セキュリティグループ
    const webServerSg = new ec2.SecurityGroup(this, 'WebServerSecurityGroup', {
      vpc,
      securityGroupName: 'web-server-sg',
      description: 'Security group for web server',
    });

    // Webサーバーからのポート3000アクセスを許可
    webServerSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Allow HTTP access on port 3000'
    );

    // データベースへのアクセスをWebサーバーからのみ許可
    databaseSg.addIngressRule(
      webServerSg,
      ec2.Port.tcp(3306),
      'Allow MySQL access from web server'
    );

    // 🗄️ RDSサブネットグループ
    const dbSubnetGroup = new rds.SubnetGroup(this, 'EmployeeDbSubnetGroup', {
      vpc,
      description: 'Employee management database subnet group',
      subnetGroupName: 'employee-db-subnet-group',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // 🗄️ RDSインスタンス作成
    const database = new rds.DatabaseInstance(this, 'EmployeeDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_4_6,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      instanceIdentifier: 'employee-database',
      databaseName: 'employeedb',
      credentials: rds.Credentials.fromPassword('admin', cdk.SecretValue.unsafePlainText('password123')),
      vpc,
      subnetGroup: dbSubnetGroup,
      securityGroups: [databaseSg],
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      publiclyAccessible: false,
      deletionProtection: false,
      backupRetention: cdk.Duration.days(0), // 学習環境のためバックアップ無効
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 学習環境のため削除可能
    });

    // 🔑 EC2用IAMロール（Session Manager用）
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
      roleName: 'EmployeeAppEC2Role',
    });

    const instanceProfile = new iam.InstanceProfile(this, 'EC2InstanceProfile', {
      role: ec2Role,
      instanceProfileName: 'EmployeeAppInstanceProfile',
    });

    // 📄 ユーザーデータスクリプトの読み込みと動的置換
    const userDataTemplate = readFileSync(
      join(__dirname, '../../materials/user-data-webapp.txt'),
      'utf8'
    );

    // RDSエンドポイントを動的に置換
    const userData = userDataTemplate.replace(
      /YOUR_RDS_ENDPOINT_HERE/g,
      database.instanceEndpoint.hostname
    );

    // 💻 EC2インスタンス作成
    const webServer = new ec2.Instance(this, 'EmployeeWebServer', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: webServerSg,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: ec2Role,
      userData: ec2.UserData.custom(userData),
      userDataCausesReplacement: true,
    });

    // EC2インスタンスにタグを追加
    cdk.Tags.of(webServer).add('Name', 'employee-web-server');

    // 📤 出力値
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID for employee app',
      exportName: 'EmployeeAppVpcId',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS MySQL endpoint',
      exportName: 'EmployeeDatabaseEndpoint',
    });

    new cdk.CfnOutput(this, 'WebServerPublicIp', {
      value: webServer.instancePublicIp,
      description: 'Web server public IP address',
      exportName: 'EmployeeWebServerPublicIp',
    });

    new cdk.CfnOutput(this, 'WebServerInstanceId', {
      value: webServer.instanceId,
      description: 'Web server instance ID',
      exportName: 'EmployeeWebServerInstanceId',
    });

    new cdk.CfnOutput(this, 'ApplicationUrl', {
      value: `http://${webServer.instancePublicIp}:3000`,
      description: 'Employee Management Application URL',
      exportName: 'EmployeeAppUrl',
    });

    new cdk.CfnOutput(this, 'DatabaseConnectionInfo', {
      value: JSON.stringify({
        endpoint: database.instanceEndpoint.hostname,
        port: database.instanceEndpoint.port,
        database: 'employeedb',
        username: 'admin',
        // パスワードは出力しない（セキュリティ上の理由）
      }),
      description: 'Database connection information (JSON format)',
    });
  }
}
