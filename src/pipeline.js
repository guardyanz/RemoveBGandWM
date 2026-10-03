export const DEFAULT_BACKGROUND_TIMEOUT_MS = 180_000;

export class BackgroundRemovalTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`Background model did not become ready within ${timeoutMs}ms`);
    this.name = 'BackgroundRemovalTimeoutError';
    this.code = 'BACKGROUND_MODEL_TIMEOUT';
    this.timeoutMs = timeoutMs;
  }
}

export async function removeBackgroundWithTimeout(input, {
  removeBackgroundFn,
  timeoutMs = DEFAULT_BACKGROUND_TIMEOUT_MS,
  onProgress,
} = {}) {
  if (typeof removeBackgroundFn !== 'function') {
    throw new TypeError('removeBackgroundFn must be a function');
  }

  const controller = new AbortController();
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new BackgroundRemovalTimeoutError(timeoutMs);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  const operation = Promise.resolve().then(() => removeBackgroundFn(input, {
    model: 'isnet_fp16',
    output: { format: 'image/png' },
    fetchArgs: { signal: controller.signal },
    progress: onProgress,
  }));

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function processImagePipeline({
  input,
  removeBackgroundRequested,
  watermarkRequested,
  removeBackground,
  removeWatermark,
  onStage = () => {},
}) {
  let currentBlob = input;
  let backgroundCompleted = false;

  if (removeBackgroundRequested) {
    if (typeof removeBackground !== 'function') {
      throw new TypeError('removeBackground must be a function');
    }
    onStage('background');
    currentBlob = await removeBackground(currentBlob);
    backgroundCompleted = true;
  }

  let watermarkError = null;
  if (watermarkRequested) {
    if (typeof removeWatermark !== 'function') {
      throw new TypeError('removeWatermark must be a function');
    }
    onStage('watermark');
    try {
      currentBlob = await removeWatermark(currentBlob);
    } catch (error) {
      if (!backgroundCompleted) throw error;
      watermarkError = error;
    }
  }

  return { blob: currentBlob, watermarkError };
}

