import 'server-only'
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const bucket = process.env.S3_BUCKET ?? 'teranga-media'

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? '',
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  },
})

let bucketReady: Promise<void> | null = null

function ensureBucket() {
  bucketReady ??= client
    .send(new HeadBucketCommand({ Bucket: bucket }))
    .then(() => undefined)
    .catch(async () => {
      await client.send(new CreateBucketCommand({ Bucket: bucket }))
    })
    .catch((error) => {
      bucketReady = null
      throw error
    })
  return bucketReady
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await ensureBucket()
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  )
}

export async function getObject(key: string, range?: string) {
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: range }))
}
