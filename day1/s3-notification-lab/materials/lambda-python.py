import json
import boto3
import urllib.parse

def lambda_handler(event, context):
    sns = boto3.client('sns')
    
    # SNSトピックARN（実際のARNに置き換えてください）
    topic_arn = 'YOUR_TOPIC_ARN_HERE'
    
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(record['s3']['object']['key'])
        size = record['s3']['object']['size']
        
        message = f"""
🔔 S3ファイルアップロード通知

📁 バケット: {bucket}
📄 ファイル名: {key}
📊 サイズ: {size} bytes
⏰ 時刻: {record['eventTime']}

おめでとうございます！サーバーレス通知システムが正常に動作しています！
        """
        
        sns.publish(
            TopicArn=topic_arn,
            Subject='🚀 S3アップロード通知',
            Message=message
        )
    
    return {
        'statusCode': 200,
        'body': json.dumps('通知送信完了!')
    }