export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<void>;
  copy(fromKey: string, toKey: string): Promise<void>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}
