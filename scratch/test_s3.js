const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testS3Connection() {
  const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log('Testing S3 connection...');
    console.log('Region:', process.env.AWS_REGION);
    console.log('Bucket:', process.env.AWS_S3_BUCKET_NAME);

    // Check if the specific bucket exists and is accessible
    console.log(`\nChecking access to bucket: ${process.env.AWS_S3_BUCKET_NAME}...`);
    try {
      const listObjectsResponse = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          MaxKeys: 5,
        })
      );
      console.log(`Successfully accessed bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
      if (listObjectsResponse.Contents) {
        console.log('Found objects in bucket:');
        listObjectsResponse.Contents.forEach((obj) => {
          console.log(` - ${obj.Key} (${obj.Size} bytes)`);
        });
      } else {
        console.log('Bucket is empty.');
      }
    } catch (err) {
      console.error(`Failed to list objects in bucket ${process.env.AWS_S3_BUCKET_NAME}:`, err.message);
    }

    // Try to upload a small test file
    console.log(`\nTesting upload to bucket: ${process.env.AWS_S3_BUCKET_NAME}...`);
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const testKey = `test-connection-${Date.now()}.txt`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: testKey,
        Body: 'This is a test file to verify S3 upload permissions.',
        ContentType: 'text/plain',
      })
    );
    console.log(`Successfully uploaded test file: ${testKey}`);

    // Clean up: delete the test file
    console.log(`Deleting test file: ${testKey}...`);
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: testKey,
      })
    );
    console.log('Successfully deleted test file.');

    console.log('\nAWS S3 connection and bucket permissions test PASSED!');

  } catch (error) {
    console.error('\nAWS S3 connection test FAILED!');
    console.error('Error details:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.$metadata) console.error('Status code:', error.$metadata.httpStatusCode);
  }
}

testS3Connection();
