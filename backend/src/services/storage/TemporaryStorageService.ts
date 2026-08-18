import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

export interface StorageService {
  saveSegment(videoId: string, segmentName: string, data: Buffer): Promise<string>;
  deleteSegment(videoId: string, segmentName: string): Promise<boolean>;
  segmentExists(videoId: string, segmentName: string): Promise<boolean>;
  getSegmentStream(videoId: string, segmentName: string): Promise<Readable | null>;
  listSegments(videoId: string): Promise<string[]>;
}

export class LocalTemporaryStorageService implements StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(__dirname, '../../../storage/segments');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async saveSegment(videoId: string, segmentName: string, data: Buffer): Promise<string> {
    const videoDir = path.join(this.baseDir, videoId);
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    const filePath = path.join(videoDir, segmentName);
    fs.writeFileSync(filePath, data);
    return filePath;
  }

  public async deleteSegment(videoId: string, segmentName: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, videoId, segmentName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Physical Storage File Deleted: ${videoId}/${segmentName}`);
      return true;
    }
    return false;
  }

  public async segmentExists(videoId: string, segmentName: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, videoId, segmentName);
    return fs.existsSync(filePath);
  }

  public async getSegmentStream(videoId: string, segmentName: string): Promise<Readable | null> {
    const filePath = path.join(this.baseDir, videoId, segmentName);
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath);
    }
    return null;
  }

  public async listSegments(videoId: string): Promise<string[]> {
    const videoDir = path.join(this.baseDir, videoId);
    if (fs.existsSync(videoDir)) {
      return fs.readdirSync(videoDir).filter((f) => f.endsWith('.ts'));
    }
    return [];
  }
}

export const temporaryStorageService = new LocalTemporaryStorageService();
