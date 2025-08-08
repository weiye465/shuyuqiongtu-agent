import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

interface StorageConfig {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
}

export function newStorage(config?: StorageConfig) {
  return new Storage(config);
}

export class Storage {
  private s3: S3Client;

  constructor(config?: StorageConfig) {
    const endpoint = config?.endpoint || process.env.STORAGE_ENDPOINT || "";
    const region = config?.region || process.env.STORAGE_REGION || "auto";
    const accessKeyId = config?.accessKey || process.env.STORAGE_ACCESS_KEY || "";
    const secretAccessKey = config?.secretKey || process.env.STORAGE_SECRET_KEY || "";
    
    console.log('🔧 Storage config:', {
      endpoint,
      region,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      bucket: process.env.STORAGE_BUCKET,
      domain: process.env.STORAGE_DOMAIN
    });
    
    this.s3 = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile({
    body,
    key,
    contentType,
    bucket,
    onProgress,
    disposition = "inline",
  }: {
    body: Buffer;
    key: string;
    contentType?: string;
    bucket?: string;
    onProgress?: (progress: number) => void;
    disposition?: "inline" | "attachment";
  }) {
    console.log('📤 uploadFile called with:', {
      key,
      contentType,
      bucket,
      bodySize: body.length,
      disposition
    });
    
    if (!bucket) {
      bucket = process.env.STORAGE_BUCKET || "";
    }

    if (!bucket) {
      console.error('❌ Bucket is required but not found');
      throw new Error("Bucket is required");
    }
    
    console.log('🪣 Using bucket:', bucket);

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentDisposition: disposition,
        ...(contentType && { ContentType: contentType }),
      },
    });

    if (onProgress) {
      upload.on("httpUploadProgress", (progress) => {
        const percentage =
          ((progress.loaded || 0) / (progress.total || 1)) * 100;
        console.log(`📊 Upload progress event: ${percentage.toFixed(1)}%`);
        onProgress(percentage);
      });
    }

    console.log('⏳ Starting upload to R2...');
    const res = await upload.done();
    console.log('✅ Upload complete, response:', res);

    const resultUrl = process.env.STORAGE_DOMAIN
      ? `${process.env.STORAGE_DOMAIN}/${res.Key}`
      : res.Location;
    
    console.log('🔗 Final URL:', resultUrl);
    
    return {
      location: res.Location,
      bucket: res.Bucket,
      key: res.Key,
      filename: res.Key?.split("/").pop(),
      url: resultUrl,
    };
  }

  async downloadAndUpload({
    url,
    key,
    bucket,
    contentType,
    disposition = "inline",
  }: {
    url: string;
    key: string;
    bucket?: string;
    contentType?: string;
    disposition?: "inline" | "attachment";
  }) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No body in response");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return this.uploadFile({
      body: buffer,
      key,
      bucket,
      contentType,
      disposition,
    });
  }
}