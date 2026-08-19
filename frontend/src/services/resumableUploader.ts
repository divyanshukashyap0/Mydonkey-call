import { API_BASE } from '../config/apiConfig';

export interface UploadProgress {
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speedMBs: number;
  etaSeconds: number;
  currentChunk: number;
  totalChunks: number;
  status: 'UPLOADING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export class ResumableUploader {
  private file: File;
  private uploadId: string | null = null;
  private videoId: string | null = null;
  private chunkSize: number = 3 * 1024 * 1024; // 3MB default
  private totalChunks: number = 0;
  private completedChunks: Set<number> = new Set();
  private isPaused: boolean = false;
  private startTime: number = 0;
  private uploadedBytesSnapshot: number = 0;
  private hasTriggeredEarlyReady: boolean = false;
  private onProgress: (progress: UploadProgress) => void;
  private onEarlyReady?: (videoId: string) => void;

  constructor(file: File, onProgress: (progress: UploadProgress) => void, onEarlyReady?: (videoId: string) => void) {
    this.file = file;
    this.onProgress = onProgress;
    this.onEarlyReady = onEarlyReady;
  }

  public async start(): Promise<{ videoId: string }> {
    this.isPaused = false;
    this.startTime = Date.now();
    this.emitProgress('UPLOADING');

    const token = localStorage.getItem('mydonkey_token');
    const initRes = await fetch(`${API_BASE}/uploads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type,
      }),
    });

    const initData = await initRes.json();
    if (!initRes.ok) throw new Error(initData.error || 'Failed to initiate upload');

    this.uploadId = initData.uploadId;
    this.videoId = initData.videoId;
    this.chunkSize = initData.chunkSize;
    this.totalChunks = initData.totalChunks;
    this.emitProgress('UPLOADING');

    await this.uploadLoop();
    return { videoId: this.videoId! };
  }

  public pause() {
    this.isPaused = true;
    this.emitProgress('PAUSED');
  }

  public async resume() {
    if (!this.uploadId) return;
    this.isPaused = false;
    this.startTime = Date.now();

    // Query status to get existing completed chunk indexes
    const token = localStorage.getItem('mydonkey_token');
    const statusRes = await fetch(`${API_BASE}/uploads/${this.uploadId}/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const statusData = await statusRes.json();
    if (statusRes.ok && statusData.completedIndexes) {
      statusData.completedIndexes.forEach((idx: number) => this.completedChunks.add(idx));
    }

    await this.uploadLoop();
  }

  private async uploadSingleChunk(index: number, token: string | null): Promise<boolean> {
    if (this.isPaused || this.completedChunks.has(index)) return true;

    const start = index * this.chunkSize;
    const end = Math.min(this.file.size, start + this.chunkSize);
    const chunkBlob = this.file.slice(start, end);

    let attempts = 0;
    while (attempts < 3 && !this.isPaused) {
      try {
        const res = await fetch(`${API_BASE}/uploads/${this.uploadId}/chunks/${index}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: chunkBlob,
        });

        if (res.ok) {
          this.completedChunks.add(index);
          this.emitProgress('UPLOADING');

          if (this.completedChunks.size >= 1 && !this.hasTriggeredEarlyReady && this.videoId) {
            this.hasTriggeredEarlyReady = true;
            if (this.onEarlyReady) {
              this.onEarlyReady(this.videoId);
            }
          }
          return true;
        } else {
          attempts++;
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (err) {
        attempts++;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    return false;
  }

  private async uploadLoop() {
    const token = localStorage.getItem('mydonkey_token');
    const CONCURRENCY = 3; // 3 Parallel chunk upload streams

    const pendingIndexes = Array.from({ length: this.totalChunks }, (_, i) => i).filter(
      (idx) => !this.completedChunks.has(idx)
    );

    const worker = async () => {
      while (pendingIndexes.length > 0 && !this.isPaused) {
        const idx = pendingIndexes.shift();
        if (idx !== undefined) {
          const success = await this.uploadSingleChunk(idx, token);
          if (!success && !this.isPaused) {
            this.emitProgress('FAILED', `Failed to upload chunk ${idx}`);
            throw new Error(`Failed to upload chunk ${idx}`);
          }
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, pendingIndexes.length) },
      () => worker()
    );
    await Promise.all(workers);

    if (this.completedChunks.size === this.totalChunks) {
      this.emitProgress('COMPLETED');
    }
  }

  private emitProgress(status: 'UPLOADING' | 'PAUSED' | 'COMPLETED' | 'FAILED', error?: string) {
    const uploadedBytes = Math.min(this.file.size, this.completedChunks.size * this.chunkSize);
    const percentage = Math.min(100, Math.round((uploadedBytes / this.file.size) * 100));

    const elapsedSec = (Date.now() - this.startTime) / 1000;
    const bytesSinceStart = Math.max(0, uploadedBytes - this.uploadedBytesSnapshot);
    const speedBytesPerSec = elapsedSec > 0 ? bytesSinceStart / elapsedSec : 0;
    const speedMBs = parseFloat((speedBytesPerSec / (1024 * 1024)).toFixed(2));

    const remainingBytes = this.file.size - uploadedBytes;
    const etaSeconds = speedBytesPerSec > 0 ? Math.round(remainingBytes / speedBytesPerSec) : 0;

    this.onProgress({
      percentage,
      uploadedBytes,
      totalBytes: this.file.size,
      speedMBs,
      etaSeconds,
      currentChunk: this.completedChunks.size,
      totalChunks: this.totalChunks,
      status,
      error,
    });
  }
}
