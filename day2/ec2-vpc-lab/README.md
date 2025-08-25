# 💻 Day 2: コンピュート・ネットワーク ハンズオン

## 🎯 このハンズオンで学ぶこと

- **EC2インスタンス**: 仮想サーバの起動と管理
- **VPC**: 自分専用の仮想データセンター構築
- **セキュリティグループ**: 仮想ファイアウォールの設定
- **ネットワーク設計**: パブリック・プライベートサブネットの理解

## 🏗️ 構築するシステム

### Phase 1: Default VPCでの基本体験
```
🌐 インターネット → 🔒 セキュリティグループ → 💻 EC2(Apache)
```

### Phase 2: カスタムVPCでの本格構築
```
🌐 インターネット → 🚪 IGW → 🏢 VPC → 🔒 セキュリティグループ → 💻 EC2(Apache)
```

## ⏰ 所要時間

- Phase 1: 約25分
- Phase 2: 約30分

## 📋 前提条件

- AWS Academy Sandbox環境へのアクセス
- 基本的なWebの知識（HTML、HTTP）

---

## 🚀 Phase 1: Default VPCでEC2起動（25分）

### 目標
「まずは簡単に！Default VPCでWebサーバを起動してみよう」

### Step 1: EC2インスタンス起動（15分）

1. **EC2コンソール**にアクセス
2. 「インスタンスを起動」をクリック

#### 基本設定
- **名前**: `my-first-webserver`
- **AMI**: Amazon Linux 2023 AMI
- **インスタンスタイプ**: t3.micro

#### キーペア（ログイン）

- キーベアなしで続行（推奨されません）

#### ネットワーク設定

「編集」ボタンを押す  

![](images/ec2-network-settings-edit.png)

- **VPC**: デフォルトVPC（そのまま）
- **サブネット**: 指定なし（そのまま）
- **アベイラビリティゾーン**: 指定なし（そのまま）
- **パブリックIPの自動割り当て**: 有効化

#### セキュリティグループ
- **（新しい）セキュリティグループを作成**
- **セキュリティグループ名**: `web-server-sg`
- **説明**: `web-server-sg`
- **インバウンドルール**:
  - ssh (ポート22): 削除
  - HTTP (ポート80): ソース 任意の場所（0.0.0.0/0） を追加

![](images/ec2-sg-delete-ssh.png)

---
---

![](images/ec2-sg-add-http.png)

#### ストレージを設定

8GiB (gp3) デフォルトのまま。  


#### 高度な詳細
- **IAMインスタンスプロファイル**: `LabInstanceProfile`
  
  > **AWS Academy環境ではない方は**: セッションマネージャーを使用するため、`AmazonSSMManagedInstanceCore`ポリシーがアタッチされたIAMロールを作成し、インスタンスプロファイルとして設定してください。

- **ユーザーデータ**: <a href="https://github.com/haw/aws-education-materials/blob/main/day2/ec2-vpc-lab/materials/user-data-apache.txt" target="_blank" rel="noopener noreferrer">user-data-apache.txt</a> の内容をコピー&ペースト

    `user-data-apache.txt`: Apacheの自動セットアップとカスタムWebページ作成を行うスクリプト  

#### インスタンスを起動

![](images/ec2-launch-button.png)

#### すべてのインスタンスを表示

![](images/ec2-show-all-instances.png)

### Step 2: 動作確認（5分）

1. インスタンスが「実行中」状態かつステータスチェックが「2/2のチェックに合格しました」になるまで待機 (2分〜5分程度)

    ![](images/ec2-running.png)  

    [Status checks for Amazon EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-system-instance-status-check.html)  

2. パブリックIPアドレスをコピー

    ![](images/ec2-copy-publicip.png)

3. ブラウザで `http://[パブリックIP]` にアクセス
4. 🎉 Webページが表示されれば成功！

    ![](images/ec2-web-app.png)

### Step 3: Session Managerで接続体験（5分）

1. インスタンスを選択
2. 「接続」→「セッションマネージャー」
3. 「接続」をクリック
4. ブラウザ内でLinuxコマンドを実行
    ```bash
    sudo su - ec2-user
    sudo cat /var/www/html/index.html
    sudo tail -f /var/log/httpd/access_log
    ```

    ※ `sudo` = superuser do とする説とsubstitute user, doとする説がある  
    ※ `su` = substitute user  
    ※ `ec2-user` = Amazon Linux AMIで作ったマシンに作られるユーザー名  
    ※ `cat` = ファイルの中身を確認するコマンド。  
    ※ `tail` = ファイルの末尾を表示するコマンド。オプションの`-f`は、`--follow`の短縮系で、「output appended data as the file grows（ファイルが育つ（grows）につれて、新しいデータを追いかけて（follow）表示する）」の意味  
    ※ `sudo tail -f /var/log/httpd/access_log` した後、`http://[パブリックIP]` にアクセスし、ブラウザをリロードすると、ログが成長する様子が見える  
    ※ `sudo tail -f /var/log/httpd/access_log` の止め方は、「Ctl + c」  

---

## 🏗️ Phase 2: カスタムVPCでの本格構築（30分）

### 目標
「本格的なネットワーク設計！自分専用のVPCを構築しよう」

### Step 1: VPC作成（10分）

1. **VPCコンソール**にアクセス
2. 「VPCを作成」をクリック

    #### VPC設定
    - **作成するリソース**: VPCなど
    - **名前タグの自動生成**: ✅️ チェック ON
    - **名前タグ**: `プロジェクト` => `my-custom` に変更
    - **IPv4 CIDR**: `10.0.0.0/16` (デフォルトのまま)

    #### サブネット設定
    - **アベイラビリティーゾーン数**: 1
    - **パブリックサブネット数**: 1
    - **プライベートサブネット数**: 0

    #### その他設定
    - **NATゲートウェイ**: なし
    - **VPCエンドポイント**: なし

    ![](images/vpc-01.png)

3. 「VPCを作成」をクリック

    ![](images/vpc-02.png)

### Step 2: カスタムVPCでEC2起動（15分）

1. **EC2コンソール**で「インスタンスを起動」

#### 基本設定
- **名前**: `custom-vpc-webserver`
- **AMI**: Amazon Linux 2023 AMI
- **インスタンスタイプ**: t3.micro

#### キーペア（ログイン）

- キーベアなしで続行（推奨されません）

#### ネットワーク設定

「編集」ボタンを押す  

- **VPC**: `my-custom-vpc`（作成したVPC）
- **サブネット**: パブリックサブネットを選択
- **パブリックIPの自動割り当て**: 有効化

#### セキュリティグループ
- **（新しい）セキュリティグループを作成**
- **セキュリティグループ名**: `custom-web-sg`
- **説明**: `custom-web-sg`
- **インバウンドルール**:
  - ssh (ポート22): 削除
  - HTTP (ポート80): ソース 任意の場所（0.0.0.0/0） を追加

#### ストレージを設定

8GiB (gp3) デフォルトのまま。  

#### 高度な詳細
- **IAMインスタンスプロファイル**: `LabInstanceProfile`
  
  > **AWS Academy環境ではない方は**: セッションマネージャーを使用するため、`AmazonSSMManagedInstanceCore`ポリシーがアタッチされたIAMロールを作成し、インスタンスプロファイルとして設定してください。

- **ユーザーデータ**: <a href="https://github.com/haw/aws-education-materials/blob/main/day2/ec2-vpc-lab/materials/user-data-apache.txt" target="_blank" rel="noopener noreferrer">user-data-apache.txt</a>  の内容をコピー&ペースト

#### インスタンスを起動

![](images/ec2-launch-button.png)

#### すべてのインスタンスを表示

![](images/ec2-show-all-instances.png)

### Step 3: 動作確認と比較（5分）

1. 新しいインスタンスの動作確認 (Phase 1と同じ)
2. Default VPCとカスタムVPCの違いを確認
   - VPCコンソールでネットワーク構成を比較
   - セキュリティグループの所属VPCを確認

![](images/vpc-resource-map.png)

---

## 🎯 学習ポイント

### **Default VPC vs カスタムVPC**
- **Default VPC**: AWSが自動作成、すぐに使える
- **カスタムVPC**: 自分で設計、完全制御可能

### **セキュリティグループの重要性**
- **ステートフル**: 受信許可すれば応答も自動許可
- **最小権限の原則**: 必要なポートのみ開放
- **送信元制御**: 特定IPからのみアクセス許可

### **ユーザーデータの活用**
- **起動時自動実行**: インスタンス起動時にスクリプト実行
- **環境構築自動化**: 手動設定作業を削減
- **一貫性確保**: 同じ環境を確実に再現

---

## 🚨 トラブルシューティング

### **Webページにアクセスできない**
1. **インスタンス状態確認**: 「実行中」になっているか
2. **セキュリティグループ確認**: ポート80が開いているか
3. **パブリックIP確認**: 正しいIPアドレスを使用しているか
4. **プロトコル確認**: `http`を使っているか。`https`でアクセスしていないか。
5. **ユーザーデータ確認**: Apacheが正常にインストールされているか

### **Session Managerで接続できない**
1. **IAMロール確認**: `LabInstanceProfile`が設定されているか
2. **VPC設定確認**: インターネット接続が可能か
3. **時間待機**: インスタンス起動直後は接続できない場合がある

### **VPC作成でエラー**
1. **CIDR重複確認**: 既存VPCと重複していないか
2. **リージョン確認**: 正しいリージョンで作業しているか

---

## 🎊 完了！

おめでとうございます！あなたは今、以下を達成しました：

✅ **仮想サーバの起動**: EC2インスタンスを自在に操作  
✅ **ネットワーク設計**: VPCで自分専用のデータセンター構築  
✅ **セキュリティ設定**: ファイアウォールで通信制御  
✅ **自動化体験**: ユーザーデータでサーバ設定自動化  

### 🚀 次のステップ

明日（Day3）は、データベースでデータを永続化します。今日構築したWebサーバにデータベースを接続して、本格的なWebアプリケーションを作りましょう！

### 💡 今日の気づきを記録しよう

- VPCとセキュリティグループの関係は？
- Default VPCとカスタムVPCの使い分けは？
- 実際のシステムでどう活用できそう？

**今日もお疲れさまでした！** 🔥