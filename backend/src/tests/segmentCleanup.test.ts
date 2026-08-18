import { segmentReferenceTracker, ParticipantTelemetry } from '../services/segment/SegmentReferenceTracker';
import { temporaryStorageService } from '../services/storage/TemporaryStorageService';

async function runSegmentCleanupTests() {
  console.log('🧪 Starting Automated Unit Test Suite for Temporary Segment Storage & Cleanup...\n');

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

  const roomId = `TEST_ROOM_${Date.now()}`;
  const videoId = `TEST_VIDEO_${Date.now()}`;

  // Register segments 0..60
  for (let i = 0; i <= 60; i++) {
    await segmentReferenceTracker.registerSegment(roomId, videoId, i, `segment_${String(i).padStart(4, '0')}.ts`);
  }

  // Test 1: Multi-Participant Protection (Host at seg 60, User B at seg 48)
  const hostTelemetry: ParticipantTelemetry = {
    userId: 'HOST_USER',
    roomId,
    segmentNumber: 60,
    position: 360,
    state: 'playing',
    lastActiveAt: Date.now(),
  };

  const userBTelemetry: ParticipantTelemetry = {
    userId: 'USER_B',
    roomId,
    segmentNumber: 48,
    position: 288,
    state: 'playing',
    lastActiveAt: Date.now(),
  };

  await segmentReferenceTracker.updateParticipantPosition(hostTelemetry);
  await segmentReferenceTracker.updateParticipantPosition(userBTelemetry);

  const isSeg48Needed = await segmentReferenceTracker.isSegmentNeededByAnyParticipant(roomId, 48);
  assert(isSeg48Needed === true, 'Segment 48 is protected because User B is at segment 48');

  const isSeg10Needed = await segmentReferenceTracker.isSegmentNeededByAnyParticipant(roomId, 10);
  assert(isSeg10Needed === false, 'Segment 10 is unneeded by all active participants');

  // Test 2: 10-Minute Deletion Scheduling for Unneeded Segment
  await segmentReferenceTracker.reevaluateRoomSegments(roomId);
  const seg10Meta = await segmentReferenceTracker.getSegmentMetadata(roomId, 10);

  assert(seg10Meta?.status === 'DELETE_SCHEDULED', 'Unneeded Segment 10 transitions to DELETE_SCHEDULED state');
  assert(
    !!seg10Meta?.deleteAfter && seg10Meta.deleteAfter > Date.now() + 500000,
    'Deletion timer set 10 minutes in future (server time)'
  );

  // Test 3: Seek-Back Cancellation (Participant seeks back to Segment 10)
  const userCSeekTelemetry: ParticipantTelemetry = {
    userId: 'USER_C',
    roomId,
    segmentNumber: 10,
    position: 60,
    state: 'playing',
    lastActiveAt: Date.now(),
  };

  await segmentReferenceTracker.updateParticipantPosition(userCSeekTelemetry);
  const seg10MetaAfterSeek = await segmentReferenceTracker.getSegmentMetadata(roomId, 10);

  assert(seg10MetaAfterSeek?.status === 'AVAILABLE', 'Seeking back to Segment 10 CANCELS DELETE and reverts to AVAILABLE');
  assert(seg10MetaAfterSeek?.deleteAfter === undefined, 'DeleteAfter timestamp cleared upon seek-back');

  // Test 4: Disconnect Grace Period (User C disconnects)
  await segmentReferenceTracker.handleParticipantDisconnect(roomId, 'USER_C');
  const isSeg10StillProtected = await segmentReferenceTracker.isSegmentNeededByAnyParticipant(roomId, 10);
  assert(isSeg10StillProtected === true, 'Segment 10 remains protected during 2-minute disconnect grace period');

  // Test 5: Physical Storage Save & Delete
  const dummyData = Buffer.from('FAKE_HLS_SEGMENT_DATA');
  await temporaryStorageService.saveSegment(videoId, 'test_segment_9999.ts', dummyData);
  const existsBefore = await temporaryStorageService.segmentExists(videoId, 'test_segment_9999.ts');
  assert(existsBefore === true, 'Saved temporary segment exists in storage');

  await temporaryStorageService.deleteSegment(videoId, 'test_segment_9999.ts');
  const existsAfter = await temporaryStorageService.segmentExists(videoId, 'test_segment_9999.ts');
  assert(existsAfter === false, 'Physical temporary segment file deleted from storage');

  console.log(`\n🎉 Test Results: ${passed}/${total} tests passed.\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSegmentCleanupTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
