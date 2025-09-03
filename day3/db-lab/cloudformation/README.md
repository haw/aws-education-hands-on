# 🗄️ Day3 Database Lab - CloudFormation版

## 🎯 概要

Day3のデータベース実習をCloudFormationで自動化したバージョンです。手動でのRDSエンドポイント設定が不要になり、完全自動でEmployee Management Systemが構築されます。

## 🏗️ 構築されるリソース

### **ネットワーク**
- **VPC**: `employee-app-vpc` (10.0.0.0/16)
- **パブリックサブネット**: 2つのAZ (10.0.0.0/24, 10.0.1.0/24)
- **プライベートサブネット**: 2つのAZ (10.0.2.0/24, 10.0.3.0/24)

### **データベース**
- **RDS MySQL 8.4.3**: `employee-database-cf`
- **インスタンスクラス**: db.t3.micro
- **ストレージ**: 20GB GP2
- **配置**: プライベートサブネット

### **Webサーバー**
- **EC2**: Amazon Linux 2023 (t3.micro)
- **アプリケーション**: Node.js Employee Management System
- **配置**: パブリックサブネット

### **セキュリティ**
- **データベースSG**: Webサーバーからのみポート3306アクセス許可
- **WebサーバーSG**: インターネットからポート3000アクセス許可
- **IAMロール**: AWS Academy既存の`LabInstanceProfile`を使用

## 🚀 デプロイ手順

### **CloudFormationコンソールからのデプロイ**

1. **CloudFormationコンソール**にアクセス
2. 「スタックの作成」→「新しいリソースを使用（標準）」
3. **テンプレートファイル**: <a href="https://github.com/haw/aws-education-materials/blob/main/day3/db-lab/cloudformation/day3-db-lab-manual.yaml" target="_blank" rel="noopener noreferrer">day3-db-lab-manual.yaml</a> をアップロードし、「次へ」
4. **スタック名**: `Day3DbLabStack`を入力し、「次へ」
4. **スタックオプションの設定**: デフォルト値のまま「次へ」
5. 「送信」をクリック

### **AWS CLIからのデプロイ**

_CloudFormationコンソールからのデプロイした場合は実施不要_

```bash
# スタック作成
aws cloudformation create-stack \
  --stack-name Day3DbLabStack \
  --template-body file://day3-db-lab-manual.yaml \
  --capabilities CAPABILITY_IAM \
  --region us-east-1

# デプロイ状況確認
aws cloudformation describe-stacks \
  --stack-name Day3DbLabStack \
  --query 'Stacks[0].StackStatus' \
  --region us-east-1
```

### **🧹 リソース削除**

```bash
# CloudFormationスタック削除
aws cloudformation delete-stack \
  --stack-name Day3DbLabStack \
  --region us-east-1
```

## ⏰ デプロイ時間

- **EC2インスタンス**: 2-3分
- **RDS作成**: 10-15分（最も時間がかかる）
- **合計**: 約15-20分

## 🎯 主要な改善点

### **🔧 完全自動化**
- **RDSエンドポイント**: CloudFormationが自動取得してユーザーデータに埋め込み
- **データベース初期化**: RDS接続待機 + `node init_db.js` 自動実行
- **アプリケーション起動**: `systemctl start employee-app` 自動実行
- **即座に利用可能**: デプロイ完了と同時にアプリケーション稼働

### **🔒 セキュリティ強化**
- **最小権限**: セキュリティグループの依存関係を適切に設定
- **プライベート配置**: データベースは完全にプライベートサブネット
- **AWS Academy対応**: 既存の`LabInstanceProfile`を活用

### **📊 運用性向上**
- **出力値**: 重要な情報をCloudFormation出力として提供
- **タグ付け**: リソースの識別と管理を容易化
- **削除保護**: 学習環境用に削除を簡単化

## 📤 出力値

| 出力名 | 説明 |
|:---|:---|
| `ApplicationUrl` | Employee Management SystemのURL |
| `DatabaseEndpoint` | RDSエンドポイント |
| `VpcId` | 作成されたVPCのID |

## 🔍 トラブルシューティング

### **アプリケーションにアクセスできない**
1. **EC2インスタンス状態確認**
   ```bash
   aws ec2 describe-instances --filters "Name=tag:Name,Values=employee-web-server"
   ```

2. **セキュリティグループ設定確認**
   - ポート3000が0.0.0.0/0に開放されているか確認

3. **ユーザーデータログ確認**
   ```bash
   # EC2にSession Managerで接続後
   sudo cat /var/log/cloud-init-output.log
   ```

### **データベース接続エラー**
1. **RDS状態確認**
   ```bash
   aws rds describe-db-instances --db-instance-identifier employee-database-cf
   ```

2. **セキュリティグループ設定確認**
   - データベースSGがWebサーバーSGからのポート3306を許可しているか

3. **アプリケーションログ確認**
   ```bash
   # EC2にSession Managerで接続後
   sudo journalctl -u employee-app.service -f
   ```

### **CloudFormationスタック作成失敗**
1. **権限確認**: AWS Academy環境で必要な権限があるか
2. **リソース制限**: 同じリージョンでリソース上限に達していないか
3. **テンプレート構文**: YAMLファイルの構文エラーがないか

## 🎓 学習ポイント

### **Infrastructure as Code**
- **再現性**: 同じ環境を何度でも構築可能
- **バージョン管理**: インフラ変更の履歴管理
- **自動化**: 手動作業の排除によるヒューマンエラー防止

### **CloudFormationの利点**
- **宣言的**: 望ましい状態を記述
- **依存関係管理**: リソース間の依存関係を自動解決
- **ロールバック**: 失敗時の自動ロールバック機能

### **セキュリティベストプラクティス**
- **多層防御**: ネットワーク・セキュリティグループ・IAM
- **最小権限**: 必要最小限のアクセス権限
- **分離**: パブリック・プライベートサブネットの適切な使い分け

## 📋 テンプレートファイル

- **`day3-db-lab-manual.yaml`**: CloudFormationテンプレート
  - VPC、サブネット、セキュリティグループ
  - RDS MySQL インスタンス
  - EC2 インスタンス（Node.js アプリケーション）
  - 完全自動化されたユーザーデータスクリプト

## 🔗 関連リンク

- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/)
- [AWS CloudFormation Template Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-reference.html)
- [Day3 Manual Lab](../README.md)

---

**🔥 CloudFormationによる完全自動化で、Infrastructure as Codeの威力を体験しよう！**
