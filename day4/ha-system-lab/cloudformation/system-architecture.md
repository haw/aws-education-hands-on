# Day4 HA System Lab - System Architecture

## 🏗️ AWS High Availability System Architecture Diagram

This diagram shows the AWS resources created by the `day4-ha-employee-app.yaml` CloudFormation template.

```mermaid
graph TB
    %% Internet
    Internet[🌐 Internet]
    
    %% AWS Cloud
    subgraph AWS["☁️ AWS Cloud"]
        %% Internet Gateway
        IGW[🌐 Internet Gateway]
        
        %% Application Load Balancer
        ALB[⚖️ Application Load Balancer]
        
        %% VPC
        subgraph VPC["🏢 VPC CIDR: 10.0.0.0/16"]
            %% Availability Zone A
            subgraph AZ_A["📍 Availability Zone A"]
                %% Public Subnet 1
                subgraph PubSub1["🌐 Public Subnet 1 CIDR: 10.0.0.0/24"]
                    EC2_1[💻 EC2 Instance 1 Node.js App Port: 3000]
                end
                
                %% Private Subnet 1
                subgraph PrivSub1["🔒 Priv Sub 1: 10.0.2.0/24"]
                    RDS_A[🗄️ RDS MySQL db.t3.micro]
                end
            end
            
            %% Availability Zone B
            subgraph AZ_B["📍 Availability Zone B"]
                %% Public Subnet 2
                subgraph PubSub2["🌐 Public Subnet 2 CIDR: 10.0.1.0/24"]
                    EC2_2[💻 EC2 Instance 2 Node.js App Port: 3000]
                end
                
                %% Private Subnet 2
                subgraph PrivSub2["🔒 Priv Sub 2: 10.0.3.0/24"]
                    Empty_Priv[📦 Available for RDS Multi-AZ]
                end
            end
        end
    end
    
    %% Connections
    Internet --> IGW
    IGW --> ALB
    
    %% EC2 to RDS connections
    EC2_1 -.->|MySQL Connection Port 3306| RDS_A
    EC2_2 -.->|MySQL Connection Port 3306| RDS_A
    
    %% User access
    ALB -.->|HTTP:3000| EC2_1
    ALB -.->|HTTP:3000| EC2_2
    
    %% Styling
    classDef vpc fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef subnet fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef ec2 fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef rds fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef alb fill:#fff8e1,stroke:#f57f17,stroke-width:2px
    classDef igw fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    
    class VPC vpc
    class PubSub1,PubSub2,PrivSub1,PrivSub2 subnet
    class EC2_1,EC2_2 ec2
    class RDS_A rds
    class ALB alb
    class IGW igw
```

## 📋 System Components

### 🌐 Network Infrastructure
- **VPC**: CIDR 10.0.0.0/16
- **Internet Gateway**: Internet connectivity
- **Public Subnets**: 2 subnets across different AZs for web servers
- **Private Subnets**: 2 subnets for database isolation

### ⚖️ Load Balancing & High Availability
- **Application Load Balancer**: Distributes traffic across multiple EC2 instances
- **Multi-AZ Deployment**: EC2 instances in different availability zones

### 💻 Compute Resources
- **EC2 Instance 1**: Located in Public Subnet 1 (AZ-A)
- **EC2 Instance 2**: Located in Public Subnet 2 (AZ-B)
- **Application**: Node.js Employee Management System on both instances
- **Port**: 3000 (HTTP) for application access

### 🗄️ Database Resources
- **RDS MySQL**: Located in Private Subnet 1 (AZ-A)
- **Engine**: MySQL 8.4.3
- **Instance Class**: db.t3.micro
- **Database**: employeedb
- **Multi-AZ Ready**: Private Subnet 2 available for RDS Multi-AZ

## 🎯 High Availability Features

### ✅ Fault Tolerance
- **Multiple EC2 Instances**: If one instance fails, traffic routes to healthy instance
- **Health Checks**: ALB automatically detects and removes unhealthy instances
- **Multi-AZ Architecture**: Resources distributed across availability zones

### ✅ Load Distribution
- **Application Load Balancer**: Distributes incoming requests across instances
- **Target Group**: Manages instance health and traffic routing
- **Scalability**: Easy to add more instances to handle increased load

### ✅ Security & Isolation
- **Database Isolation**: RDS in private subnet (no internet access)
- **Layered Architecture**: Internet → ALB → EC2 → RDS
- **Security Groups**: Restrict access between tiers

## 🔄 Traffic Flow

### 📥 Incoming Requests
1. **User** → Internet (HTTP:80)
2. **Internet** → Internet Gateway
3. **IGW** → Application Load Balancer
4. **ALB** → EC2 Instance (HTTP:3000)

### 🗄️ Database Access
1. **EC2 Instance 1** → RDS MySQL (Port 3306)
2. **EC2 Instance 2** → RDS MySQL (Port 3306)
3. **Shared Database**: Both instances access same data

## 🎓 Educational Value

### ✅ High Availability Concepts
- **Redundancy**: Multiple instances prevent single points of failure
- **Load Balancing**: Even distribution of traffic
- **Health Monitoring**: Automatic failure detection and recovery

### ✅ AWS Best Practices
- **Multi-AZ Deployment**: Geographic distribution for resilience
- **Proper Subnet Design**: Public for web, private for database
- **Security Layering**: Defense in depth architecture

### ✅ Real-World Application
- **Production-Ready Pattern**: Scalable and fault-tolerant design
- **Cost-Effective**: Efficient resource utilization
- **Maintainable**: Clear separation of concerns
