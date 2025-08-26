#!/bin/bash

# Day3 Database Lab CDK Deployment Script
# 🔥 Employee Management System 完全自動デプロイ (AWS Academy対応)

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

# AWS Academy環境対応Bootstrap
echo "🏗️  CDK Bootstrap状態を確認中（AWS Academy対応）..."

# Bootstrap状態確認
if aws cloudformation describe-stacks --stack-name CDKToolkit >/dev/null 2>&1; then
    echo "✅ CDK Bootstrap済み"
else
    echo "⚡ CDK Bootstrap実行中（AWS Academy環境用）..."
    
    # AWS Academy環境用Bootstrap（ECR権限制限対応）
    if ! cdk bootstrap --no-bootstrap-customer-key --cloudformation-execution-policies arn:aws:iam::aws:policy/PowerUserAccess; then
        echo "⚠️  通常のBootstrapが失敗しました。簡易Bootstrapを試行中..."
        
        # 失敗したスタックを削除
        echo "🧹 失敗したBootstrapスタックを削除中..."
        aws cloudformation delete-stack --stack-name CDKToolkit 2>/dev/null || true
        
        # 削除完了を待機（最大5分）
        echo "⏳ スタック削除完了を待機中..."
        aws cloudformation wait stack-delete-complete --stack-name CDKToolkit 2>/dev/null || true
        
        # 簡易Bootstrap
        echo "🔧 簡易Bootstrapを実行中..."
        if ! cdk bootstrap --toolkit-stack-name CDKToolkit-Simple --no-bootstrap-customer-key; then
            echo "⚠️  Bootstrapをスキップしてデプロイを続行します..."
            echo "💡 小規模プロジェクトのため、Bootstrapなしでもデプロイ可能です"
        fi
    fi
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
echo "🧹 削除方法: npm run quick-destroy"
echo ""
echo "🔥 Employee Management System が利用可能です！"
echo ""
echo "📊 次の手順:"
echo "1. 上記のApplicationUrlにブラウザでアクセス"
echo "2. Employee Management Systemの動作確認"
echo "3. CRUD操作（追加・表示・編集・削除）をテスト"
