# 🗄️ Day3 Database Lab - CDK版

## 🎯 概要

Day3のデータベース実習をAWS CDKで自動化したバージョンです。手動でのRDSエンドポイント設定が不要になり、完全自動でEmployee Management Systemが構築されます。

## 🏗️ 構築されるリソース

### **ネットワーク**
- **VPC**: `employee-app-vpc` (10.0.0.0/16)
- **パブリックサブネット**: 2つのAZ (10.0.0.0/24, 10.0.1.0/24)
- **プライベートサブネット**: 2つのAZ (10.0.2.0/24, 10.0.3.0/24)

### **データベース**
- **RDS MySQL 8.4.6**: `employee-database`
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
- **IAMロール**: Session Manager用権限

## 🚀 デプロイ手順

### **前提条件**
- AWS CLI設定済み
- Node.js 18以上
- AWS CDK CLI (`npm install -g aws-cdk`)

### **1. 依存関係インストール**
```bash
cd hands-on/day3/db-lab/cdk
npm install
```

### **2. CDK初期化（初回のみ）**
```bash
cdk bootstrap
```

### **3. デプロイ実行**
```bash
cdk deploy
```

### **4. 確認**
デプロイ完了後、出力される`ApplicationUrl`にアクセス：
```
http://[EC2のパブリックIP]:3000
```

## 🎯 主要な改善点

### **🔧 完全自動化**
- **RDSエンドポイント**: CDKが自動取得してユーザーデータに埋め込み
- **手動編集不要**: `YOUR_RDS_ENDPOINT_HERE`の置換が自動化
- **即座に利用可能**: デプロイ完了と同時にアプリケーション稼働

### **🔒 セキュリティ強化**
- **最小権限**: セキュリティグループの依存関係を適切に設定
- **プライベート配置**: データベースは完全にプライベートサブネット
- **IAM最適化**: Session Manager用の最小権限ロール

### **📊 運用性向上**
- **出力値**: 重要な情報をCloudFormation出力として提供
- **タグ付け**: リソースの識別と管理を容易化
- **削除保護**: 学習環境用に削除を簡単化

## 📤 出力値

| 出力名 | 説明 |
|:---|:---|
| `ApplicationUrl` | Employee Management SystemのURL |
| `WebServerPublicIp` | WebサーバーのパブリックIP |
| `DatabaseEndpoint` | RDSエンドポイント |
| `VpcId` | 作成されたVPCのID |
| `WebServerInstanceId` | EC2インスタンスID |

## 🧹 リソース削除

```bash
cdk destroy
```

## 🔍 トラブルシューティング

### **アプリケーションにアクセスできない**
1. EC2インスタンスの状態確認
2. セキュリティグループ設定確認
3. ユーザーデータログ確認: `/var/log/cloud-init-output.log`

### **データベース接続エラー**
1. RDS状態確認（Available状態か）
2. セキュリティグループ設定確認
3. アプリケーションログ確認: `sudo journalctl -u employee-app.service`

## 🎓 学習ポイント

### **Infrastructure as Code**
- **再現性**: 同じ環境を何度でも構築可能
- **バージョン管理**: インフラ変更の履歴管理
- **自動化**: 手動作業の排除によるヒューマンエラー防止

### **CDKの利点**
- **プログラマブル**: TypeScriptでインフラを記述
- **型安全**: コンパイル時エラー検出
- **再利用性**: コンストラクトによる部品化

### **セキュリティベストプラクティス**
- **多層防御**: ネットワーク・セキュリティグループ・IAM
- **最小権限**: 必要最小限のアクセス権限
- **分離**: パブリック・プライベートサブネットの適切な使い分け

## 🔗 関連リンク

- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/)
- [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [Day3 Manual Lab](../README.md)

---

**🔥 CDKによる完全自動化で、インフラ構築の新しい世界を体験しよう！**
