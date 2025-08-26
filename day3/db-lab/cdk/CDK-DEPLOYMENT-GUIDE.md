# 🚀 CDK実行用EC2構築ガイド

## 🎯 概要

Day3 Database Lab CDK版を実行するための専用EC2インスタンスを構築し、CDKデプロイを実行するガイドです。

## 🏗️ EC2インスタンス構築手順

### **Step 1: EC2インスタンス起動（10分）**

#### **基本設定**
1. **EC2コンソール**→「インスタンスを起動」
2. **名前**: `cdk-deployment-server`
3. **AMI**: Amazon Linux 2023 AMI
4. **インスタンスタイプ**: `t3.medium` ⚠️ **重要**: CDK実行にはメモリが必要

#### **キーペア（ログイン）**
- **キーペアなしで続行**（推奨されません）
  - Session Managerを使用するため

#### **ネットワーク設定**
- **VPC**: デフォルトVPC
- **サブネット**: デフォルト（パブリックサブネット）
- **パブリックIPの自動割り当て**: 有効化

#### **セキュリティグループ**
- **（新しい）セキュリティグループを作成**
- **セキュリティグループ名**: `cdk-server-sg`
- **説明**: `CDK deployment server security group`
- **インバウンドルール**: SSH (ポート22) を削除（Session Manager使用のため）

#### **ストレージ設定**
- **ストレージ**: 20 GiB gp3（デフォルトより大きく）

#### **高度な詳細**
- **IAMインスタンスプロファイル**: `LabInstanceProfile`
  
  > **重要**: AWS Academy環境では必須。Session ManagerとCDK実行権限を提供

#### **ユーザーデータ**
```bash
#!/bin/bash
set -euxo pipefail

# ---- System update ----
dnf -y update

# ---- Install Node.js 18 (LTS) ----
dnf -y install nodejs npm git

# ---- Install AWS CDK CLI ----
# npmのグローバルインストールを確実に実行
npm install -g aws-cdk@2.1026.0 --yes --no-audit --no-fund

# ---- Verify installations ----
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo "✅ CDK version: $(cdk --version)"
echo "✅ Git version: $(git --version)"

# ---- Create working directory ----
mkdir -p /home/ec2-user/workspace
chown ec2-user:ec2-user /home/ec2-user/workspace

echo "🚀 CDK実行環境セットアップ完了！"
echo "📝 次の手順: Session Managerで接続し、リポジトリをクローンしてください"
```

### **Step 2: インスタンス起動確認（5分）**

1. インスタンスが「実行中」状態になるまで待機
2. ステータスチェックが「2/2のチェックに合格しました」になるまで待機

### **Step 3: ユーザーデータ実行ログ確認**

ユーザーデータスクリプトの実行状況を確認する方法：

#### **Session Managerで接続後**
```bash
# ec2-userに切り替え
sudo su - ec2-user

# 実行完了後の全ログ確認
sudo cat /var/log/cloud-init-output.log

# エラーログ確認 (エラー発生時のみ)
sudo cat /var/log/cloud-init.log
```

#### **期待されるログ出力例** (`/var/log/cloud-init-output.log`)
```
Cloud-init v. 23.4.4 running 'modules:final' at Fri, 26 Aug 2025 13:20:00 +0000
+ dnf -y update
Complete!
+ dnf -y install nodejs npm git
Complete!
+ npm install -g aws-cdk@2.1026.0 --yes --no-audit --no-fund
added 1 package in 15s
✅ Node.js version: v18.20.4
✅ npm version: 10.7.0
✅ CDK version: 2.1026.0
✅ Git version: 2.40.1
+ mkdir -p /home/ec2-user/workspace
+ chown ec2-user:ec2-user /home/ec2-user/workspace
🚀 CDK実行環境セットアップ完了！
📝 次の手順: Session Managerで接続し、リポジトリをクローンしてください
Cloud-init v. 23.4.4 finished at Fri, 26 Aug 2025 13:22:30 +0000. Datasource DataSourceEc2Local.  Up 150.45 seconds
```

#### **ユーザーデータ実行状況の確認方法**

##### **1. 実行中の確認**
```bash
# cloud-initの実行状況確認
sudo cloud-init status

# 期待される出力
# status: running (実行中)
# status: done (完了)
# status: error (エラー)
```

##### **2. 詳細ステータス確認**
```bash
# 詳細な実行状況
sudo cloud-init status --long

# 実行時間と結果の詳細表示
```

##### **3. リアルタイム監視**
```bash
# ユーザーデータ実行をリアルタイム監視
sudo tail -f /var/log/cloud-init-output.log

# Ctrl+C で監視終了
```

#### **トラブルシューティング用ログ**

##### **エラー発生時の確認手順**
```bash
# 1. メインログ確認
sudo cat /var/log/cloud-init-output.log | grep -i error

# 2. cloud-init内部ログ確認
sudo cat /var/log/cloud-init.log | grep -i error

# 3. システムログ確認
sudo journalctl -u cloud-init-local.service
sudo journalctl -u cloud-init.service

# 4. ユーザーデータスクリプト確認
sudo cat /var/lib/cloud/instance/user-data.txt
```

##### **よくあるエラーパターン**

###### **npm インストールエラー**
```bash
# エラー例
npm ERR! network request failed

# 解決方法
sudo npm install -g aws-cdk@2.1026.0 --yes --no-audit --no-fund --registry https://registry.npmjs.org/
```

###### **権限エラー**
```bash
# エラー例
EACCES: permission denied

# 解決方法（手動実行時）
sudo npm install -g aws-cdk@2.1026.0 --yes --no-audit --no-fund
```

###### **ネットワークエラー**
```bash
# エラー例
getaddrinfo ENOTFOUND registry.npmjs.org

# 確認方法
ping registry.npmjs.org
nslookup registry.npmjs.org
```

## 🔗 CDKデプロイ実行手順

### **Step 1: Session Manager接続**

1. **EC2コンソール**でインスタンスを選択
2. 「接続」→「セッションマネージャー」→「接続」

### **Step 2: リポジトリクローンと準備**

```bash
# ec2-userに切り替え
sudo su - ec2-user

# 作業ディレクトリに移動
cd ~/workspace

# リポジトリクローン
git clone https://github.com/haw/aws-education-hands-on.git

# CDKプロジェクトディレクトリに移動
cd aws-education-hands-on/day3/db-lab/cdk

# 現在のブランチ確認（cdkブランチであることを確認）
git branch -a
git checkout cdk  # 必要に応じて

# Node.js環境確認
node --version  # v18以上であることを確認
npm --version
cdk --version
```

### **Step 3: CDKデプロイ実行**

#### **⚠️ AWS Academy環境での重要な注意事項**

AWS Academy Sandbox環境ではECR権限が制限されているため、通常の`cdk bootstrap`は失敗します。以下の手順で対応してください。

##### **ECRなしBootstrap（AWS Academy専用）**
```bash
# 依存関係インストール
npm install

# AWS Academy環境用Bootstrap（ECRリポジトリを作成しない）
cdk bootstrap --no-bootstrap-customer-key --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess

# 上記でも失敗する場合は、ECRを完全に無効化
cdk bootstrap --toolkit-stack-name CDKToolkit-NoECR --no-bootstrap-customer-key --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess --template-url https://raw.githubusercontent.com/aws/aws-cdk/main/packages/aws-cdk/lib/api/bootstrap/bootstrap-template.yaml
```

##### **Bootstrap失敗時の対処法**
```bash
# 1. 既存の失敗したスタックを削除
aws cloudformation delete-stack --stack-name CDKToolkit

# 2. 削除完了を待機
aws cloudformation wait stack-delete-complete --stack-name CDKToolkit

# 3. 簡易Bootstrap（最小構成）
cdk bootstrap --toolkit-stack-name CDKToolkit-Simple --no-bootstrap-customer-key
```

##### **最終手段: Bootstrap完全スキップ**
```bash
# Bootstrapをスキップして直接デプロイ（小規模プロジェクト用）
cdk deploy --require-approval never
```

#### **通常のデプロイ手順**
```bash
# デプロイ実行（完全自動）
npm run quick-deploy

# または手動デプロイ
cdk deploy --require-approval never
```

### **Step 4: デプロイ結果確認**

デプロイ完了後、以下の出力を確認：

```
✅ Day3DbLabStack

✨  Deployment time: 15m 30s

Outputs:
Day3DbLabStack.ApplicationUrl = http://[EC2-IP]:3000
Day3DbLabStack.DatabaseEndpoint = [RDS-ENDPOINT]
Day3DbLabStack.WebServerPublicIp = [EC2-IP]
```

### **Step 5: アプリケーション確認**

1. 出力された`ApplicationUrl`をブラウザで開く
2. Employee Management Systemが表示されることを確認
3. CRUD操作（追加・表示・編集・削除）をテスト

## 🔍 トラブルシューティング

### **Node.js/CDKインストール確認**
```bash
# バージョン確認
node --version    # v18以上
npm --version     # 9以上
cdk --version     # 2.1026.0

# 再インストール（必要時）
sudo npm install -g aws-cdk@2.1026.0 --yes --no-audit --no-fund
```

### **AWS認証情報確認**
```bash
# 認証情報確認
aws sts get-caller-identity

# 期待される出力例
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/LabRole/i-1234567890abcdef0"
}
```

### **CDK Bootstrap確認**
```bash
# Bootstrap状態確認
aws cloudformation describe-stacks --stack-name CDKToolkit

# Bootstrap済みかどうか確認
aws s3 ls | grep cdk-

# 必要に応じて再実行（AWS Academy環境用）
cdk bootstrap --no-bootstrap-customer-key --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess
```

### **AWS Academy環境特有の問題**

#### **ECR権限エラー**
```bash
# エラー例
ecr:CreateRepository action (Service: Ecr, Status Code: 400)

# 解決方法1: ECRなしBootstrap
cdk bootstrap --no-bootstrap-customer-key

# 解決方法2: 完全スキップ
cdk deploy --require-approval never

# 解決方法3: 失敗スタック削除後再実行
aws cloudformation delete-stack --stack-name CDKToolkit
aws cloudformation wait stack-delete-complete --stack-name CDKToolkit
cdk bootstrap --toolkit-stack-name CDKToolkit-Simple --no-bootstrap-customer-key
```

#### **権限不足エラー**
```bash
# エラー例
User is not authorized to perform: iam:CreateRole

# 確認方法
aws sts get-caller-identity
aws iam list-attached-role-policies --role-name LabRole

# 対処方法: より制限的なポリシーを使用
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess
```

### **デプロイエラー時**
```bash
# 詳細ログでデプロイ
cdk deploy --verbose

# スタック削除（必要時）
cdk destroy --force

# 再デプロイ
npm run quick-deploy
```

## 📊 リソース使用量

### **EC2インスタンス（CDK実行用）**
- **インスタンスタイプ**: t3.medium
- **用途**: CDK実行・管理
- **稼働時間**: デプロイ時のみ（約30分）

### **作成されるリソース（CDK経由）**
- **VPC**: employee-app-vpc
- **EC2**: t3.micro（Webアプリケーション用）
- **RDS**: db.t3.micro（MySQL）
- **その他**: セキュリティグループ、サブネット等

## 🧹 リソース削除

### **CDKスタック削除**
```bash
# CDKで作成したリソースを削除
cd ~/workspace/aws-education-hands-on/day3/db-lab/cdk
npm run quick-destroy
```

### **CDK実行用EC2削除**
1. **EC2コンソール**でCDK実行用インスタンスを選択
2. 「インスタンスの状態」→「インスタンスを終了」

## 🎓 学習ポイント

### **Infrastructure as Code体験**
- **CDK実行環境**: 専用環境での安全な実行
- **完全自動化**: 手動作業の完全排除
- **再現性**: 同じ環境を何度でも構築

### **AWS運用ベストプラクティス**
- **専用インスタンス**: CDK実行専用環境の分離
- **Session Manager**: セキュアなリモートアクセス
- **IAMロール**: 適切な権限管理

### **DevOps実践**
- **Git管理**: ソースコード管理
- **自動デプロイ**: CI/CDの基礎
- **インフラ管理**: コードによるインフラ管理

---

**🔥 CDK実行用EC2でInfrastructure as Codeの真の力を体験しよう！**
