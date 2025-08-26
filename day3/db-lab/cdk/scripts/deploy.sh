#!/bin/bash

# Day3 Database Lab CDK Deployment Script
# 🔥 Employee Management System 完全自動デプロイ

set -e

echo "🚀 Day3 Database Lab CDK デプロイ開始"
echo "========================================"

# 現在のディレクトリを確認
if [ ! -f "package.json" ]; then
    echo "❌ エラー: CDKプロジェクトディレクトリで実行してください"
    exit 1
fi

# Node.jsバージョン確認
NODE_VERSION=$(node --version)
echo "📦 Node.js バージョン: $NODE_VERSION"

# 依存関係インストール
echo "📥 依存関係をインストール中..."
npm install

# TypeScriptコンパイル
echo "🔨 TypeScriptをコンパイル中..."
npm run build

# CDK Bootstrap確認
echo "🏗️  CDK Bootstrap状態を確認中..."
if ! cdk bootstrap --show-template > /dev/null 2>&1; then
    echo "⚠️  CDK Bootstrapが必要です。実行中..."
    cdk bootstrap
else
    echo "✅ CDK Bootstrap済み"
fi

# CDK Synth（テンプレート生成）
echo "📋 CloudFormationテンプレートを生成中..."
cdk synth

# デプロイ実行
echo "🚀 デプロイを実行中..."
echo "⏰ 約10-15分かかります（RDS作成のため）"
cdk deploy --require-approval never

echo ""
echo "🎉 デプロイ完了！"
echo "========================================"
echo "📱 アプリケーションURL: 上記の出力を確認してください"
echo "🔍 リソース確認: AWS コンソールで確認可能"
echo "🧹 削除方法: npm run destroy"
echo ""
echo "🔥 Employee Management System が利用可能です！"
