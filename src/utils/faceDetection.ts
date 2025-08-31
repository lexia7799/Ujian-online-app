import * as faceapi from 'face-api.js';

export class FaceDetectionService {
  private isModelLoaded = false;
  private isDetecting = false;
  private loadingPromise: Promise<boolean> | null = null;

  async loadModels(): Promise<boolean> {
    // Return existing promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Return true if already loaded
    if (this.isModelLoaded) {
      return true;
    }

    this.loadingPromise = this._loadModels();
    return this.loadingPromise;
  }

  private async _loadModels(): Promise<boolean> {
    try {
      console.log('🤖 Loading face detection models...');
      
      // Use CDN for model files since we can't host them locally
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
      
      // Load only the essential model for face detection
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      
      this.isModelLoaded = true;
      this.loadingPromise = null;
      console.log('✅ Face detection models loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load face detection models:', error);
      this.isModelLoaded = false;
      this.loadingPromise = null;
      return false;
    }
  }

  async detectFaces(videoElement: HTMLVideoElement): Promise<number> {
    if (!this.isModelLoaded || this.isDetecting) {
      return 1; // Return 1 (normal) if not ready
    }

    if (!videoElement || videoElement.readyState < 2) {
      return 1; // Return 1 (normal) if video not ready
    }

    try {
      this.isDetecting = true;
      
      // Detect faces with tiny face detector (faster and lighter)
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320, // Smaller input size for better performance
          scoreThreshold: 0.5 // Higher threshold for more accurate detection
        }));

      const faceCount = detections.length;
      
      // Only log when there's an issue (2+ faces)
      if (faceCount >= 2) {
        console.log(`🚨 Multiple faces detected: ${faceCount} faces`);
      }
      
      return faceCount;
    } catch (error) {
      console.error('Face detection error:', error);
      return 1; // Return 1 (normal) on error to avoid false violations
    } finally {
      this.isDetecting = false;
    }
  }

  isReady(): boolean {
    return this.isModelLoaded;
  }

  isLoading(): boolean {
    return this.loadingPromise !== null;
  }
}

export const faceDetectionService = new FaceDetectionService();