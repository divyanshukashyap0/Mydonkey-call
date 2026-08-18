import { generateRoomCode } from '../utils/roomCode';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function calculateExpectedPosition(position: number, state: string, playbackRate: number, updatedAt: number, currentServerTime: number): number {
  if (state !== 'PLAYING') return position;
  const elapsedSec = (currentServerTime - updatedAt) / 1000;
  return position + (elapsedSec * playbackRate);
}

function calculateTotalChunks(fileSizeBytes: number, chunkSizeMB: number = 10): number {
  const chunkSizeBytes = chunkSizeMB * 1024 * 1024;
  return Math.ceil(fileSizeBytes / chunkSizeBytes);
}

function runTests() {
  console.log('🧪 Starting Automated Unit Test Suite for MyDonkey Call...\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName}`);
    }
  }

  // Test 1: Room Code Generation
  const code1 = generateRoomCode();
  const code2 = generateRoomCode();
  assert(code1.length === 6, 'Room code length is 6 characters');
  assert(code1 !== code2, 'Subsequent generated room codes are unique');
  assert(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(code1), 'Room code contains unambiguous characters');

  // Test 2: YouTube URL Parsing
  const standardUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const shortUrl = 'https://youtu.be/dQw4w9WgXcQ';
  const shortsUrl = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';
  const invalidUrl = 'https://example.com/video.mp4';

  assert(extractYouTubeId(standardUrl) === 'dQw4w9WgXcQ', 'Parses standard YouTube watch URL');
  assert(extractYouTubeId(shortUrl) === 'dQw4w9WgXcQ', 'Parses shortened YouTube URL');
  assert(extractYouTubeId(shortsUrl) === 'dQw4w9WgXcQ', 'Parses YouTube Shorts URL');
  assert(extractYouTubeId(invalidUrl) === null, 'Returns null for invalid YouTube URL');

  // Test 3: Expected Position Math & Latency Compensation
  const initialPos = 120.0;
  const updatedAt = 10000;
  const currentServerTime = 12500; // 2.5 seconds later
  const rate = 1.0;
  const expected = calculateExpectedPosition(initialPos, 'PLAYING', rate, updatedAt, currentServerTime);

  assert(expected === 122.5, 'Calculates expected position with latency compensation (122.5s)');

  const pausedExpected = calculateExpectedPosition(initialPos, 'PAUSED', rate, updatedAt, currentServerTime);
  assert(pausedExpected === 120.0, 'Expected position remains constant when PAUSED');

  // Test 4: Chunk Matrix Calculation for Large Files
  const fileSize4GB = 4 * 1024 * 1024 * 1024; // 4 GB
  const chunks4GB = calculateTotalChunks(fileSize4GB, 10);
  assert(chunks4GB === 410, 'Calculates 410 upload chunks for 4 GB file (10MB chunks)');

  console.log(`\n🎉 Test Results: ${passed}/${total} tests passed.\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
