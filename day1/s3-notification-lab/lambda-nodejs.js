import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: 'us-east-1' });

export const handler = async (event) => {
    // SNSトピックARN（実際のARNに置き換えてください）
    const topicArn = 'YOUR_TOPIC_ARN_HERE';
    
    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        const size = record.s3.object.size;
        
        const message = `
🔔 S3ファイルアップロード通知

📁 バケット: ${bucket}
📄 ファイル名: ${key}
📊 サイズ: ${size} bytes
⏰ 時刻: ${record.eventTime}

おめでとうございます！サーバーレス通知システムが正常に動作しています！
        `;
        
        const command = new PublishCommand({
            TopicArn: topicArn,
            Subject: '🚀 S3アップロード通知',
            Message: message
        });
        
        await snsClient.send(command);
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify('通知送信完了!')
    };
};