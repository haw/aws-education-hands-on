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
npm install -g aws-cdk@2.87.0

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

```bash
# 依存関係インストール
npm install

# CDK Bootstrap（初回のみ）
cdk bootstrap

# デプロイ実行（完全自動）
npm run quick-deploy
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
cdk --version     # 2.87.0

# 再インストール（必要時）
sudo npm install -g aws-cdk@2.87.0
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
cdk bootstrap --show-template

# 必要に応じて再実行
cdk bootstrap
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
