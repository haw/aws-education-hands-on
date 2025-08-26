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

    // AWS Academy環境対応: BootstrapVersionチェックを無効化
    this.templateOptions.description = 'Day3 Database Lab - Employee Management System (AWS Academy Compatible)';

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
        version: rds.MysqlEngineVersion.VER_8_4_3,
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

    // 🔑 AWS Academy既存IAMリソース参照（Session Manager用）
    // AWS Academy環境では既存のLabRole/LabInstanceProfileを使用
    const existingLabRole = iam.Role.fromRoleName(this, 'ExistingLabRole', 'LabRole');
    
    // LabInstanceProfileを参照（AWS Academy環境で事前作成済み）
    const existingInstanceProfile = iam.InstanceProfile.fromInstanceProfileName(
      this, 'ExistingLabInstanceProfile', 'LabInstanceProfile'
    );

    // 📄 ユーザーデータスクリプトの読み込みと動的置換
    const userDataTemplate = readFileSync(
      join(__dirname, '../../materials/user-data-webapp.txt'),
      'utf8'
    );

    // RDSエンドポイントを動的に置換
    const userDataWithEndpoint = userDataTemplate.replace(
      /YOUR_RDS_ENDPOINT_HERE/g,
      database.instanceEndpoint.hostname
    );

    // 完全自動化スクリプトを追加
    const automationScript = `

# ---- Database initialization (automatic) ----
echo "🔄 RDS接続待機とデータベース初期化を開始..."
cd /var/www/html

# RDS接続待機ループ（最大30分待機）
RETRY_COUNT=0
MAX_RETRIES=60  # 30秒 × 60回 = 30分

while ! mysqladmin ping -h ${database.instanceEndpoint.hostname} -u admin -ppassword123 --silent; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ RDS接続タイムアウト（30分経過）。手動で確認してください。"
        exit 1
    fi
    echo "⏳ RDSが利用可能になるまで待機中... (\${RETRY_COUNT}/\${MAX_RETRIES}) - 30秒後に再試行"
    sleep 30
done

echo "✅ RDS接続確認完了！データベース初期化開始..."

# データベース初期化実行
if node init_db.js; then
    echo "🎉 データベース初期化完了！"
else
    echo "❌ データベース初期化に失敗しました。ログを確認してください。"
    exit 1
fi

echo "🔄 アプリケーション再起動中..."
# アプリケーション再起動（設定反映のため）
systemctl restart employee-app

# 起動確認
if systemctl is-active --quiet employee-app; then
    echo "🚀 Employee Management System 完全自動セットアップ完了！"
    echo "🌐 アプリケーションURL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
else
    echo "❌ アプリケーション起動に失敗しました。ログを確認してください。"
    echo "🔍 ログ確認: journalctl -u employee-app.service -f"
    exit 1
fi

echo "✅ CDK完全自動化セットアップ完了 - 手動作業は一切不要です！"
echo "🎯 機能: Create(追加) / Read(表示) / Update(編集) / Delete(削除) + クラウドコンソール風UI (Node.js版)"
echo "🔍 サービス状態確認: systemctl status employee-app"
echo "📊 ログ監視: journalctl -u employee-app.service -f"
`;

    // 最終的なユーザーデータ（元のスクリプト + 自動化スクリプト）
    const userData = userDataWithEndpoint + automationScript;

    // 💻 EC2インスタンス作成
    const webServer = new ec2.Instance(this, 'EmployeeWebServer', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: webServerSg,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: existingLabRole, // AWS Academy既存ロールを使用
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
