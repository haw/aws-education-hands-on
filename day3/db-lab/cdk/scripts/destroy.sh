#!/bin/bash

# Day3 Database Lab CDK Destruction Script
# 🧹 Employee Management System リソース削除

set -e

echo "🧹 Day3 Database Lab CDK リソース削除"
echo "========================================"

# 確認プロンプト
read -p "⚠️  本当にすべてのリソースを削除しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 削除をキャンセルしました"
    exit 1
fi

echo "🗑️  リソース削除を開始します..."

# CDK Destroy実行
cdk destroy --force

echo ""
echo "✅ 削除完了！"
echo "========================================"
echo "🔍 AWS コンソールで削除を確認してください"
echo "💰 課金が停止されました"
echo ""
echo "🔥 お疲れさまでした！"
