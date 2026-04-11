export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}
