const { S3Client, GetBucketLocationCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testS3Region() {
  const s3Client = new S3Client({
    region: 'us-east-1', // Default region to send the request
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log('Fetching location for bucket:', process.env.AWS_S3_BUCKET_NAME);
    const response = await s3Client.send(new GetBucketLocationCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME }));
    console.log('Bucket location constraint:', response.LocationConstraint);
  } catch (error) {
    console.error('Error fetching bucket location:', error.message);
  }
}

testS3Region();
