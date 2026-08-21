import { create } from 'zustand';
import { ResumableUploader, UploadProgress } from '../services/resumableUploader';
import { getSocket } from '../services/socket';

interface UploadStoreState {
  uploader: ResumableUploader | null;
  progress: UploadProgress | null;
  activeFile: File | null;
  isInitializing: boolean;
  error: string | null;
  remoteUploadProgress: {
    progress: UploadProgress;
    fileName: string;
    uploaderName: string;
  } | null;

  startUpload: (file: File) => Promise<void>;
  pauseUpload: () => void;
  resumeUpload: () => void;
  clearUpload: () => void;
  setRemoteUploadProgress: (data: { progress: UploadProgress; fileName: string; uploaderName: string } | null) => void;
}

function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 200);
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        const d = video.duration;
        resolve(d && isFinite(d) && d > 0 ? d : null);
      };
      video.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        resolve(null);
      };
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

export const useUploadStore = create<UploadStoreState>((set, get) => ({
  uploader: null,
  progress: null,
  activeFile: null,
  isInitializing: false,
  error: null,
  remoteUploadProgress: null,

  startUpload: async (file: File) => {
    if (get().isInitializing) return;
    set({ isInitializing: true, error: null, activeFile: file });

    try {
      const socket = getSocket();

      const uploaderInstance = new ResumableUploader(
        file,
        (p) => {
          set({ progress: p });
          socket.emit('upload:progress', {
            progress: p,
            fileName: file.name,
          });
        },
        (earlyVideoId) => {
          socket.emit('video:change', { videoId: earlyVideoId });
        }
      );

      // Instantly set uploader & emit initial progress state in 0ms
      set({ uploader: uploaderInstance, isInitializing: false });
      uploaderInstance.emitProgress('UPLOADING');

      // Probe duration in background without blocking upload execution
      probeVideoDuration(file).then((dur) => {
        if (dur) uploaderInstance.setDuration(dur);
      }).catch(() => {});

      const { videoId } = await uploaderInstance.start();
      socket.emit('video:change', { videoId });
    } catch (err: any) {
      set({ error: err.message || 'Upload failed', progress: null, uploader: null, isInitializing: false });
    }
  },

  pauseUpload: () => {
    const { uploader, progress } = get();
    if (uploader && progress) {
      uploader.pause();
    }
  },

  resumeUpload: () => {
    const { uploader } = get();
    if (uploader) {
      uploader.resume();
    }
  },

  clearUpload: () => {
    set({ uploader: null, progress: null, activeFile: null, error: null, isInitializing: false });
  },

  setRemoteUploadProgress: (data) => {
    set({ remoteUploadProgress: data });
  },
}));
