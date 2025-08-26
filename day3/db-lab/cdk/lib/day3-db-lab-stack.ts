import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { join } from 'path';

export class Day3DbLabStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AWS Academy環境対応: BootstrapVersionチェックを無効化
    this.templateOptions.description = 'Day3 Database Lab - Employee Management System (AWS Academy Compatible)';

    // 🌐 VPC作成 - employee-app-vpc
    const vpc = new ec2.Vpc(this, 'EmployeeAppVpc', {
      vpcName: 'employee-app-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // 🔒 データベース用セキュリティグループ
    const databaseSg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      securityGroupName: 'database-sg',
      description: 'Security group for RDS database',
      allowAllOutbound: false, // アウトバウンドルールを明示的に制御
    });

    // 🔒 Webサーバー用セキュリティグループ
    const webServerSg = new ec2.SecurityGroup(this, 'WebServerSecurityGroup', {
      vpc,
      securityGroupName: 'web-server-sg',
      description: 'Security group for web server',
    });

    // Webサーバーからのポート3000アクセスを許可
    webServerSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Allow HTTP access on port 3000'
    );

    // データベースへのアクセスをWebサーバーからのみ許可
    databaseSg.addIngressRule(
      webServerSg,
      ec2.Port.tcp(3306),
      'Allow MySQL access from web server'
    );

    // 🗄️ RDSサブネットグループ
    const dbSubnetGroup = new rds.SubnetGroup(this, 'EmployeeDbSubnetGroup', {
      vpc,
      description: 'Employee management database subnet group',
      subnetGroupName: 'employee-db-subnet-group',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // 🗄️ RDSインスタンス作成
    const database = new rds.DatabaseInstance(this, 'EmployeeDatabase', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_4_3,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      instanceIdentifier: 'employee-database',
      databaseName: 'employeedb',
      credentials: rds.Credentials.fromPassword('admin', cdk.SecretValue.unsafePlainText('password123')),
      vpc,
      subnetGroup: dbSubnetGroup,
      securityGroups: [databaseSg],
      allocatedStorage: 20,
      storageType: rds.StorageType.GP2,
      publiclyAccessible: false,
      deletionProtection: false,
      backupRetention: cdk.Duration.days(0), // 学習環境のためバックアップ無効
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 学習環境のため削除可能
    });

    // 🔑 AWS Academy既存IAMリソース参照（Session Manager用）
    // AWS Academy環境では既存のLabRole/LabInstanceProfileを使用
    const existingLabRole = iam.Role.fromRoleName(this, 'ExistingLabRole', 'LabRole');
    
    // LabInstanceProfileを参照（AWS Academy環境で事前作成済み）
    const existingInstanceProfile = iam.InstanceProfile.fromInstanceProfileName(
      this, 'ExistingLabInstanceProfile', 'LabInstanceProfile'
    );

    // 📄 ユーザーデータスクリプト（インライン化でS3アセット依存を回避）
    const userDataScript = `#!/bin/bash
set -euxo pipefail

# ---- System update ----
dnf -y update

# ---- Install Node.js 18 (LTS) ----
dnf -y install nodejs npm git mysql

# ---- Create application directory ----
mkdir -p /var/www/html
cd /var/www/html

# ---- Create package.json ----
cat > package.json << 'EOF'
{
  "name": "employee-management-system",
  "version": "1.0.0",
  "description": "Employee Management System with MySQL",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.0",
    "body-parser": "^1.20.2"
  }
}
EOF

# ---- Install dependencies ----
npm install

# ---- Create server.js ----
cat > server.js << 'EOF'
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// MySQL connection configuration
const dbConfig = {
  host: '${database.instanceEndpoint.hostname}',
  user: 'admin',
  password: 'password123',
  database: 'employee_db'
};

// Create MySQL connection
const connection = mysql.createConnection(dbConfig);

// Connect to MySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all employees
app.get('/api/employees', (req, res) => {
  connection.query('SELECT * FROM employees ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('Error fetching employees:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(results);
  });
});

// Add new employee
app.post('/api/employees', (req, res) => {
  const { name, email, department } = req.body;
  
  if (!name || !email || !department) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const query = 'INSERT INTO employees (name, email, department) VALUES (?, ?, ?)';
  connection.query(query, [name, email, department], (err, result) => {
    if (err) {
      console.error('Error adding employee:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json({ id: result.insertId, name, email, department });
  });
});

// Update employee
app.put('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, department } = req.body;
  
  if (!name || !email || !department) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const query = 'UPDATE employees SET name = ?, email = ?, department = ? WHERE id = ?';
  connection.query(query, [name, email, department, id], (err, result) => {
    if (err) {
      console.error('Error updating employee:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    
    res.json({ id: parseInt(id), name, email, department });
  });
});

// Delete employee
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM employees WHERE id = ?';
  connection.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error deleting employee:', err);
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    
    res.json({ message: 'Employee deleted successfully' });
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(\`Employee Management System running at http://0.0.0.0:\${port}\`);
});
EOF

# ---- Create init_db.js ----
cat > init_db.js << 'EOF'
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '${database.instanceEndpoint.hostname}',
  user: 'admin',
  password: 'password123'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL');

  // Create database
  connection.query('CREATE DATABASE IF NOT EXISTS employee_db', (err) => {
    if (err) {
      console.error('Error creating database:', err);
      process.exit(1);
    }
    console.log('Database created or already exists');

    // Use database
    connection.query('USE employee_db', (err) => {
      if (err) {
        console.error('Error selecting database:', err);
        process.exit(1);
      }

      // Create table
      const createTableQuery = \`
        CREATE TABLE IF NOT EXISTS employees (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          department VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      \`;

      connection.query(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          process.exit(1);
        }
        console.log('Table created or already exists');

        // Insert sample data
        const insertQuery = \`
          INSERT IGNORE INTO employees (name, email, department) VALUES
          ('山田太郎', 'yamada@example.com', '開発部'),
          ('佐藤花子', 'sato@example.com', '営業部'),
          ('田中次郎', 'tanaka@example.com', '人事部')
        \`;

        connection.query(insertQuery, (err) => {
          if (err) {
            console.error('Error inserting sample data:', err);
          } else {
            console.log('Sample data inserted');
          }
          
          connection.end();
          console.log('Database initialization completed');
        });
      });
    });
  });
});
EOF

# ---- Create public directory and HTML ----
mkdir -p public

cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Employee Management System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #232526 0%, #414345 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .content {
            padding: 40px;
        }
        
        .form-section {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .form-section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        }
        
        .btn-edit {
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            margin-right: 10px;
        }
        
        .employees-section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .employee-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .employee-card {
            background: white;
            border: 1px solid #e1e5e9;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .employee-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .employee-name {
            font-size: 1.2rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        }
        
        .employee-email {
            color: #666;
            margin-bottom: 8px;
        }
        
        .employee-department {
            color: #667eea;
            font-weight: 600;
            margin-bottom: 15px;
        }
        
        .employee-actions {
            display: flex;
            gap: 10px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .error {
            background: #fee;
            color: #c33;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        
        .success {
            background: #efe;
            color: #363;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 Employee Management System</h1>
            <p>クラウドコンソール風 完全CRUD対応システム</p>
        </div>
        
        <div class="content">
            <div id="message"></div>
            
            <div class="form-section">
                <h2 id="form-title">👤 新しい従業員を追加</h2>
                <form id="employee-form">
                    <input type="hidden" id="employee-id">
                    <div class="form-group">
                        <label for="name">名前</label>
                        <input type="text" id="name" required>
                    </div>
                    <div class="form-group">
                        <label for="email">メールアドレス</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="form-group">
                        <label for="department">部署</label>
                        <select id="department" required>
                            <option value="">部署を選択してください</option>
                            <option value="開発部">開発部</option>
                            <option value="営業部">営業部</option>
                            <option value="人事部">人事部</option>
                            <option value="総務部">総務部</option>
                            <option value="経理部">経理部</option>
                        </select>
                    </div>
                    <button type="submit" class="btn" id="submit-btn">追加</button>
                    <button type="button" class="btn btn-edit" id="cancel-btn" style="display: none;">キャンセル</button>
                </form>
            </div>
            
            <div class="employees-section">
                <h2>👥 従業員一覧</h2>
                <div id="employees-container">
                    <div class="loading">従業員データを読み込み中...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let editingId = null;

        // Load employees on page load
        document.addEventListener('DOMContentLoaded', loadEmployees);

        // Form submission
        document.getElementById('employee-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const department = document.getElementById('department').value;
            
            try {
                let response;
                if (editingId) {
                    response = await fetch(\`/api/employees/\${editingId}\`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name, email, department }),
                    });
                } else {
                    response = await fetch('/api/employees', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name, email, department }),
                    });
                }
                
                if (response.ok) {
                    showMessage(editingId ? '従業員情報を更新しました' : '従業員を追加しました', 'success');
                    resetForm();
                    loadEmployees();
                } else {
                    const error = await response.json();
                    showMessage(error.error || 'エラーが発生しました', 'error');
                }
            } catch (error) {
                showMessage('ネットワークエラーが発生しました', 'error');
            }
        });

        // Cancel editing
        document.getElementById('cancel-btn').addEventListener('click', resetForm);

        async function loadEmployees() {
            try {
                const response = await fetch('/api/employees');
                const employees = await response.json();
                
                const container = document.getElementById('employees-container');
                
                if (employees.length === 0) {
                    container.innerHTML = '<div class="loading">従業員が登録されていません</div>';
                    return;
                }
                
                container.innerHTML = '<div class="employee-grid">' + 
                    employees.map(employee => \`
                        <div class="employee-card">
                            <div class="employee-name">\${employee.name}</div>
                            <div class="employee-email">📧 \${employee.email}</div>
                            <div class="employee-department">🏢 \${employee.department}</div>
                            <div class="employee-actions">
                                <button class="btn btn-edit" onclick="editEmployee(\${employee.id}, '\${employee.name}', '\${employee.email}', '\${employee.department}')">編集</button>
                                <button class="btn btn-danger" onclick="deleteEmployee(\${employee.id}, '\${employee.name}')">削除</button>
                            </div>
                        </div>
                    \`).join('') + 
                '</div>';
            } catch (error) {
                document.getElementById('employees-container').innerHTML = 
                    '<div class="error">従業員データの読み込みに失敗しました</div>';
            }
        }

        function editEmployee(id, name, email, department) {
            editingId = id;
            document.getElementById('employee-id').value = id;
            document.getElementById('name').value = name;
            document.getElementById('email').value = email;
            document.getElementById('department').value = department;
            
            document.getElementById('form-title').textContent = '✏️ 従業員情報を編集';
            document.getElementById('submit-btn').textContent = '更新';
            document.getElementById('cancel-btn').style.display = 'inline-block';
            
            document.getElementById('name').focus();
        }

        async function deleteEmployee(id, name) {
            if (!confirm(\`\${name}さんを削除してもよろしいですか？\`)) {
                return;
            }
            
            try {
                const response = await fetch(\`/api/employees/\${id}\`, {
                    method: 'DELETE',
                });
                
                if (response.ok) {
                    showMessage('従業員を削除しました', 'success');
                    loadEmployees();
                } else {
                    const error = await response.json();
                    showMessage(error.error || '削除に失敗しました', 'error');
                }
            } catch (error) {
                showMessage('ネットワークエラーが発生しました', 'error');
            }
        }

        function resetForm() {
            editingId = null;
            document.getElementById('employee-form').reset();
            document.getElementById('employee-id').value = '';
            document.getElementById('form-title').textContent = '👤 新しい従業員を追加';
            document.getElementById('submit-btn').textContent = '追加';
            document.getElementById('cancel-btn').style.display = 'none';
        }

        function showMessage(message, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.innerHTML = \`<div class="\${type}">\${message}</div>\`;
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 5000);
        }
    </script>
</body>
</html>
EOF

# ---- Create systemd service ----
cat > /etc/systemd/system/employee-app.service << 'EOF'
[Unit]
Description=Employee Management System
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/var/www/html
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# ---- Set permissions ----
chown -R ec2-user:ec2-user /var/www/html

# ---- Enable and start service ----
systemctl daemon-reload
systemctl enable employee-app
systemctl start employee-app

# ---- Database initialization (automatic) ----
echo "🔄 RDS接続待機とデータベース初期化を開始..."
cd /var/www/html

# RDS接続待機ループ（最大30分待機）
RETRY_COUNT=0
MAX_RETRIES=60  # 30秒 × 60回 = 30分

while ! mysqladmin ping -h ${database.instanceEndpoint.hostname} -u admin -ppassword123 --silent; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ RDS接続タイムアウト（30分経過）。手動で確認してください。"
        exit 1
    fi
    echo "⏳ RDSが利用可能になるまで待機中... (\${RETRY_COUNT}/\${MAX_RETRIES}) - 30秒後に再試行"
    sleep 30
done

echo "✅ RDS接続確認完了！データベース初期化開始..."

# データベース初期化実行
if node init_db.js; then
    echo "🎉 データベース初期化完了！"
else
    echo "❌ データベース初期化に失敗しました。ログを確認してください。"
    exit 1
fi

echo "🔄 アプリケーション再起動中..."
# アプリケーション再起動（設定反映のため）
systemctl restart employee-app

# 起動確認
if systemctl is-active --quiet employee-app; then
    echo "🚀 Employee Management System 完全自動セットアップ完了！"
    echo "🌐 アプリケーションURL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
else
    echo "❌ アプリケーション起動に失敗しました。ログを確認してください。"
    echo "🔍 ログ確認: journalctl -u employee-app.service -f"
    exit 1
fi

echo "✅ CDK完全自動化セットアップ完了 - 手動作業は一切不要です！"
echo "🎯 機能: Create(追加) / Read(表示) / Update(編集) / Delete(削除) + クラウドコンソール風UI (Node.js版)"
echo "🔍 サービス状態確認: systemctl status employee-app"
echo "📊 ログ監視: journalctl -u employee-app.service -f"`;

    // 最終的なユーザーデータ（インライン化）
    const userData = ec2.UserData.custom(userDataScript);

    // 💻 EC2インスタンス作成
    const webServer = new ec2.Instance(this, 'EmployeeWebServer', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: webServerSg,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: existingLabRole, // AWS Academy既存ロールを使用
      userData: userData, // インライン化されたユーザーデータを使用
      userDataCausesReplacement: true,
    });

    // EC2インスタンスにタグを追加
    cdk.Tags.of(webServer).add('Name', 'employee-web-server');

    // 📤 出力値
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID for employee app',
      exportName: 'EmployeeAppVpcId',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS MySQL endpoint',
      exportName: 'EmployeeDatabaseEndpoint',
    });

    new cdk.CfnOutput(this, 'WebServerPublicIp', {
      value: webServer.instancePublicIp,
      description: 'Web server public IP address',
      exportName: 'EmployeeWebServerPublicIp',
    });

    new cdk.CfnOutput(this, 'WebServerInstanceId', {
      value: webServer.instanceId,
      description: 'Web server instance ID',
      exportName: 'EmployeeWebServerInstanceId',
    });

    new cdk.CfnOutput(this, 'ApplicationUrl', {
      value: `http://${webServer.instancePublicIp}:3000`,
      description: 'Employee Management Application URL',
      exportName: 'EmployeeAppUrl',
    });

    new cdk.CfnOutput(this, 'DatabaseConnectionInfo', {
      value: JSON.stringify({
        endpoint: database.instanceEndpoint.hostname,
        port: database.instanceEndpoint.port,
        database: 'employeedb',
        username: 'admin',
        // パスワードは出力しない（セキュリティ上の理由）
      }),
      description: 'Database connection information (JSON format)',
    });
  }
}
