# 🚀 Day3 Database Lab CDK - 使用方法ガイド

## 🎯 クイックスタート

### **1. 依存関係インストール**
```bash
cd hands-on/day3/db-lab/cdk
npm install
```

### **2. ワンコマンドデプロイ**
```bash
npm run quick-deploy
```

### **3. アプリケーションアクセス**
デプロイ完了後、出力されるURLにアクセス：
```
Employee Management Application URL: http://[IP]:3000
```

### **4. リソース削除**
```bash
npm run quick-destroy
```

## 📋 利用可能なコマンド

| コマンド | 説明 |
|:---|:---|
| `npm install` | 依存関係インストール |
| `npm run build` | TypeScriptコンパイル |
| `npm test` | テスト実行 |
| `npm run synth` | CloudFormationテンプレート生成 |
| `npm run deploy` | CDKデプロイ |
| `npm run destroy` | リソース削除 |
| `npm run quick-deploy` | 完全自動デプロイ（推奨） |
| `npm run quick-destroy` | 完全自動削除（推奨） |

## 🔧 手動デプロイ手順

### **詳細制御が必要な場合**

```bash
# 1. 依存関係インストール
npm install

# 2. TypeScriptコンパイル
npm run build

# 3. CDK Bootstrap（初回のみ）
cdk bootstrap

# 4. テンプレート確認
npm run synth

# 5. 差分確認
npm run diff

# 6. デプロイ実行
npm run deploy

# 7. 削除（必要時）
npm run destroy
```

## 🎓 学習ポイント

### **CDKの利点を体験**
1. **Infrastructure as Code**: インフラをコードで管理
2. **再現性**: 同じ環境を何度でも構築
3. **自動化**: 手動作業の完全排除
4. **型安全**: TypeScriptによるコンパイル時チェック

### **従来の手動作業との比較**

| 項目 | 手動作業 | CDK |
|:---|:---|:---|
| RDSエンドポイント設定 | 手動コピー&ペースト | 自動取得・埋め込み |
| セキュリティグループ | 手動設定・依存関係管理 | 自動設定・依存関係解決 |
| 構築時間 | 50分（手動操作含む） | 15分（待機時間のみ） |
| ヒューマンエラー | 発生リスク有り | ゼロ |
| 再現性 | 困難 | 完璧 |

## 🔍 トラブルシューティング

### **よくある問題と解決方法**

#### **1. CDK Bootstrap エラー**
```bash
# 解決方法
cdk bootstrap aws://[ACCOUNT-ID]/[REGION]
```

#### **2. 権限エラー**
```bash
# AWS CLI設定確認
aws sts get-caller-identity
aws configure list
```

#### **3. Node.js バージョンエラー**
```bash
# Node.js 18以上が必要
node --version
# 必要に応じてアップデート
```

#### **4. デプロイ失敗**
```bash
# ログ確認
cdk deploy --verbose

# 強制削除後に再デプロイ
cdk destroy --force
npm run quick-deploy
```

## 📊 リソース監視

### **デプロイ後の確認項目**

1. **CloudFormation**: スタック状態確認
2. **EC2**: インスタンス状態・ログ確認
3. **RDS**: データベース状態確認
4. **VPC**: ネットワーク構成確認

### **ログ確認方法**
```bash
# EC2インスタンスログ（Session Manager経由）
sudo journalctl -u employee-app.service -f
sudo tail -f /var/log/cloud-init-output.log
```

## 🎉 成功の確認

### **✅ チェックリスト**

- [ ] CloudFormationスタックが`CREATE_COMPLETE`状態
- [ ] EC2インスタンスが`running`状態
- [ ] RDSインスタンスが`available`状態
- [ ] アプリケーションURL（ポート3000）にアクセス可能
- [ ] Employee Management Systemが正常動作
- [ ] CRUD操作（追加・表示・編集・削除）が動作

### **🎯 学習成果**

このCDK版を完了すると、以下を習得：

- **Infrastructure as Code**: CDKによるインフラ自動化
- **TypeScript**: 型安全なインフラ記述
- **AWS ベストプラクティス**: セキュリティ・可用性・運用性
- **DevOps**: 開発・運用の統合アプローチ

---

**🔥 CDKで次世代のインフラ管理を体験しよう！**
