import { S3 } from 'aws-sdk';
import { StoreItems, Storage } from 'botbuilder-core';

export default class S3Storage implements Storage {
  private s3Client: S3;
  private bucketName: string;
  protected etag: number;

  constructor(bucketName: string, options: any = {}) {
    this.bucketName = bucketName;
    this.s3Client = new S3({
      ...options,
    });
  }

  private async getJsonObject(key: string) {
    const object = await this.s3Client
      .getObject({
        Bucket: this.bucketName,
        Key: key.replace(/\/$/, ''),
      })
      .promise();
    const item = JSON.parse(object.Body.toString());
    item.eTag = object.ETag;
    return item;
  }

  private async putObject(key: string, payload: string) {
    return this.s3Client
      .putObject({
        Bucket: this.bucketName,
        Key: key.replace(/\/$/, ''),
        Body: JSON.stringify(payload),
      })
      .promise();
  }

  async read(keys: string[]): Promise<StoreItems> {
    const data: StoreItems = {};
    for (let key of keys) {
      try {
        data[key] = await this.getJsonObject(key);
      } catch (e) {
        // console.log(e);
      }
    }
    return data;
  }
  async write(changes: StoreItems): Promise<void> {
    let oldItem: any;
    for (let key of Object.keys(changes)) {
      const newItem = changes[key];
      try {
        oldItem = await this.getJsonObject(key);
      } catch {
        oldItem = false;
      }
      if (!oldItem || newItem.eTag === '*') {
        await this.putObject(key, newItem);
      } else {
        if (newItem.eTag === oldItem.eTag) {
          await this.putObject(key, newItem);
        } else {
          throw new Error(`Storage: error writing "${key}" due to eTag conflict.`);
        }
      }
    }
  }
  async delete(keys: string[]): Promise<void> {
    for (let key of keys) {
      try {
        await this.s3Client
          .deleteObject({
            Bucket: this.bucketName,
            Key: key.replace(/\/$/, ''),
          })
          .promise();
      } catch (e) {
        // console.log(e);
      }
    }
  }
}
