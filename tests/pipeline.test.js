import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BackgroundRemovalTimeoutError,
  processImagePipeline,
  removeBackgroundWithTimeout,
} from '../src/pipeline.js';

test('returns the background-removed image with a warning when watermark removal fails', async () => {
  const original = { id: 'original' };
  const backgroundRemoved = { id: 'background-removed' };
  const watermarkError = new Error('watermark engine failed');

  const result = await processImagePipeline({
    input: original,
    removeBackgroundRequested: true,
    watermarkRequested: true,
    removeBackground: async (value) => {
      assert.equal(value, original);
      return backgroundRemoved;
    },
    removeWatermark: async (value) => {
      assert.equal(value, backgroundRemoved);
      throw watermarkError;
    },
  });

  assert.equal(result.blob, backgroundRemoved);
  assert.equal(result.watermarkError, watermarkError);
});

test('propagates a watermark error when there is no successful background result', async () => {
  const watermarkError = new Error('watermark-only operation failed');

  await assert.rejects(
    processImagePipeline({
      input: { id: 'original' },
      removeBackgroundRequested: false,
      watermarkRequested: true,
      removeBackground: async () => assert.fail('background removal should not run'),
      removeWatermark: async () => {
        throw watermarkError;
      },
    }),
    watermarkError,
  );
});

test('runs background and watermark stages in order', async () => {
  const stages = [];
  const result = await processImagePipeline({
    input: 'original',
    removeBackgroundRequested: true,
    watermarkRequested: true,
    removeBackground: async () => 'background-removed',
    removeWatermark: async () => 'watermark-removed',
    onStage: (stage) => stages.push(stage),
  });

  assert.deepEqual(stages, ['background', 'watermark']);
  assert.equal(result.blob, 'watermark-removed');
  assert.equal(result.watermarkError, null);
});

test('aborts and rejects when the background model exceeds its timeout', async () => {
  let receivedSignal;

  await assert.rejects(
    removeBackgroundWithTimeout('image', {
      timeoutMs: 10,
      removeBackgroundFn: (_input, options) => {
        receivedSignal = options.fetchArgs.signal;
        return new Promise(() => {});
      },
    }),
    (error) => {
      assert.ok(error instanceof BackgroundRemovalTimeoutError);
      assert.equal(error.code, 'BACKGROUND_MODEL_TIMEOUT');
      return true;
    },
  );

  assert.equal(receivedSignal.aborted, true);
});

