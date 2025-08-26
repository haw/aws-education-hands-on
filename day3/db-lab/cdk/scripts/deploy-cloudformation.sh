#!/bin/bash

# Day3 Database Lab CloudFormation Deployment Script
# 🔥 AWS Academy環境専用 - CDK Bootstrap不要

set -e

echo "🔥 AWS Academy環境用CloudFormationデプロイ開始"
echo "=================================================="

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

# CloudFormationテンプレート生成
echo "📋 CloudFormationテンプレートを生成中..."
TEMPLATE_FILE="day3-db-lab-template.yaml"

# CDK synthでテンプレート生成（Bootstrapなし）
if cdk synth > "$TEMPLATE_FILE"; then
    echo "✅ CloudFormationテンプレート生成完了: $TEMPLATE_FILE"
else
    echo "❌ テンプレート生成に失敗しました"
    exit 1
fi

# テンプレートファイル確認
TEMPLATE_SIZE=$(wc -l < "$TEMPLATE_FILE")
echo "📊 生成されたテンプレート: $TEMPLATE_SIZE 行"

# スタック名設定
STACK_NAME="Day3DbLabStack"

# 既存スタック確認
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
    echo "⚠️  既存のスタック '$STACK_NAME' が存在します"
    echo "🔄 スタックを更新中..."
    
    # スタック更新
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_FILE" \
        --capabilities CAPABILITY_IAM || {
        echo "ℹ️  更新する変更がありません"
    }
    
    # 更新完了待機
    echo "⏳ スタック更新完了を待機中..."
    aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME"
    
else
    echo "🚀 新しいスタック '$STACK_NAME' を作成中..."
    
    # スタック作成
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body "file://$TEMPLATE_FILE" \
        --capabilities CAPABILITY_IAM
    
    # 作成完了待機
    echo "⏳ スタック作成完了を待機中（約15分）..."
    aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"
fi

# デプロイ結果確認
echo "📊 デプロイ結果を確認中..."

# スタック出力取得
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs' \
    --output table)

echo ""
echo "🎉 CloudFormationデプロイ完了！"
echo "=================================================="
echo "📱 スタック出力:"
echo "$OUTPUTS"
echo ""
echo "🌐 アプリケーションURL確認方法:"
echo "   aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==\`ApplicationUrl\`].OutputValue' --output text"
echo ""
echo "🔍 次の手順:"
echo "1. 上記のApplicationUrlにブラウザでアクセス"
echo "2. Employee Management Systemの動作確認"
echo "3. CRUD操作（追加・表示・編集・削除）をテスト"
echo ""
echo "🧹 削除方法:"
echo "   aws cloudformation delete-stack --stack-name $STACK_NAME"
echo ""
echo "🔥 AWS Academy環境でのデプロイ成功！"
