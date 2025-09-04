# 問題11: S3静的ウェブサイトホスティング（実技試験）

## 🎯 問題

S3を使用して静的ウェブサイトをホスティングし、インターネットからアクセス可能にしてください。

## 🔧 参考手順

<a href="https://haw.github.io/aws-education-hands-on/day1/5min-impact-lab/" target="_blank" rel="noopener noreferrer">Day 1: Amazon S3 を使用して静的ウェブサイトをホスティングする</a> (※リンクを右クリックして、別タブで開いてください)  

※ 参考手順を参照しつつ、後述する「要件」に従って「S3を使用した静的ウェブサイトホスティング」を実施してください。

---

## 要件

### 1. S3バケット作成

- **バケット名**: `your-name-final-exam-website`（your-nameは自分の名前など）
- **リージョン**: us-east-1
- **パブリックアクセス**: 有効

### 2. ウェブサイトファイル

以下のファイルをアップロードしてください：

- <a href="https://github.com/haw/aws-education-hands-on/blob/main/final-exam/materials/index.html" target="_blank" rel="noopener noreferrer">**index.html**</a>（メインページ）
- <a href="https://github.com/haw/aws-education-hands-on/blob/main/final-exam/materials/error.html" target="_blank" rel="noopener noreferrer">**error.html**</a>（エラーページ）
- <a href="https://github.com/haw/aws-education-hands-on/blob/main/final-exam/materials/style.css" target="_blank" rel="noopener noreferrer">**style.css**</a>（スタイルシート）

※リンクを右クリックして、別タブで開いてください。  

### 3. 静的ウェブサイトホスティング設定

- **インデックスドキュメント**: index.html
- **エラードキュメント**: error.html

### 4. パブリックアクセス設定

- 適切なバケットポリシーの設定
- インターネットからのアクセス許可

---

## 📝 設問

- a) 作成したバケット名を答えてください。
- b) 作成したバケットポリシーをJSON形式で答えてください。
- c) バケットウェブサイトエンドポイントを答えてください。
- d) バケットウェブサイトエンドポイントに、ブラウザでアクセスした場合、ページを表示できましたか？
