/**
 * Reusable P2P WebRTC DataChannel Binary Transfer Utility with Backpressure
 * Ensures safe packetization <= 16KB and uses event-driven `bufferedamountlow` backpressure.
 */

export interface SendBinaryOptions {
  packetSize?: number;      // Default: 16 * 1024 (16 KB)
  highWaterMark?: number;  // Default: 512 * 1024 (512 KB)
  lowWaterMark?: number;   // Default: 128 * 1024 (128 KB)
  signal?: AbortSignal;
  viewerId?: string;
  debug?: boolean;
}

const DEFAULT_PACKET_SIZE = 16 * 1024;   // 16 KB per RTCDataChannel.send() call
const DEFAULT_HIGH_WATER_MARK = 512 * 1024; // 512 KB backpressure trigger
const DEFAULT_LOW_WATER_MARK = 128 * 1024;  // 128 KB backpressure release threshold

/**
 * Sends a binary payload (ArrayBuffer or Uint8Array) across an RTCDataChannel in 16KB sub-packets,
 * using event-driven backpressure via `bufferedamountlow` to prevent WebRTC SCTP buffer overflow.
 */
export async function sendBinaryWithBackpressure(
  channel: RTCDataChannel,
  data: ArrayBuffer | Uint8Array,
  options?: SendBinaryOptions
): Promise<void> {
  const packetSize = options?.packetSize ?? DEFAULT_PACKET_SIZE;
  const highWaterMark = options?.highWaterMark ?? DEFAULT_HIGH_WATER_MARK;
  const lowWaterMark = options?.lowWaterMark ?? DEFAULT_LOW_WATER_MARK;
  const signal = options?.signal;
  const viewerId = options?.viewerId || 'unknown';
  const debug = options?.debug ?? (import.meta.env ? import.meta.env.MODE !== 'production' : true);

  if (channel.readyState !== 'open') {
    if (debug) {
      console.warn(`[MovieTransfer] viewer=${viewerId} skipped - DataChannel not open (${channel.readyState})`);
    }
    return;
  }

  if (signal?.aborted) {
    if (debug) {
      console.log(`[MovieTransfer] viewer=${viewerId} transfer aborted before start`);
    }
    return;
  }

  // Set threshold on RTCDataChannel so browser fires 'bufferedamountlow' event
  channel.bufferedAmountLowThreshold = lowWaterMark;

  const uint8Data = data instanceof Uint8Array ? data : new Uint8Array(data);
  const totalBytes = uint8Data.byteLength;
  let offset = 0;
  let packetCount = 0;

  if (debug) {
    console.log(`[MovieTransfer] viewer=${viewerId} transfer started (${totalBytes} bytes, ${Math.ceil(totalBytes / packetSize)} packets)`);
  }

  while (offset < totalBytes) {
    if (signal?.aborted) {
      if (debug) console.log(`[MovieTransfer] viewer=${viewerId} transfer aborted during transmission`);
      return;
    }

    if (channel.readyState !== 'open') {
      if (debug) console.warn(`[MovieTransfer] viewer=${viewerId} channel closed during transmission`);
      return;
    }

    // Backpressure Check: wait for 'bufferedamountlow' event if buffer exceeds highWaterMark
    if (channel.bufferedAmount > highWaterMark) {
      if (debug) {
        console.log(`[MovieTransfer] viewer=${viewerId} waiting for backpressure (bufferedAmount=${channel.bufferedAmount})`);
      }

      await new Promise<void>((resolve) => {
        let isResolved = false;

        const cleanup = () => {
          if (isResolved) return;
          isResolved = true;
          channel.removeEventListener('bufferedamountlow', onLowBuffer);
          channel.removeEventListener('close', onClose);
          if (signal) signal.removeEventListener('abort', onAbort);
        };

        const onLowBuffer = () => {
          cleanup();
          if (debug) {
            console.log(`[MovieTransfer] viewer=${viewerId} resumed (bufferedAmount=${channel.bufferedAmount})`);
          }
          resolve();
        };

        const onClose = () => {
          cleanup();
          resolve(); // Resolve cleanly to allow outer loop to exit gracefully
        };

        const onAbort = () => {
          cleanup();
          resolve();
        };

        channel.addEventListener('bufferedamountlow', onLowBuffer, { once: true });
        channel.addEventListener('close', onClose, { once: true });
        if (signal) {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });

      // Check state again after awaiting backpressure release
      if (signal?.aborted || channel.readyState !== 'open') {
        if (debug) console.log(`[MovieTransfer] viewer=${viewerId} cancelled during backpressure wait`);
        return;
      }
    }

    // Extract next sub-packet
    const end = Math.min(offset + packetSize, totalBytes);
    const subView = uint8Data.subarray(offset, end);
    const frameBuffer = subView.buffer.slice(subView.byteOffset, subView.byteOffset + subView.byteLength) as ArrayBuffer;

    try {
      (channel as any).send(frameBuffer);
      packetCount++;
      offset = end;
    } catch (err: any) {
      console.error(`[MovieTransfer] viewer=${viewerId} packet error:`, err);
      throw err;
    }
  }


  if (debug) {
    console.log(`[MovieTransfer] viewer=${viewerId} transfer complete (${packetCount} packets, ${totalBytes} bytes)`);
  }
}
