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
      console.log('⚠️ Face detection not ready or already detecting');
      return 1; // Return 1 (normal) if not ready
    }

    if (!videoElement || videoElement.readyState < 2) {
      console.log('⚠️ Video element not ready');
      return 1; // Return 1 (normal) if video not ready
    }

    try {
      this.isDetecting = true;
      
      console.log('🔍 Starting face detection...');
      
      // Detect faces with tiny face detector (optimized settings)
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416, // Larger input size for better accuracy
          scoreThreshold: 0.3 // Lower threshold to catch more faces
        }));

      const faceCount = detections.length;
      
      // Always log the detection result for debugging
      console.log(`👥 Face detection result: ${faceCount} face(s) detected`);
      
      // Log detection details for debugging
      if (detections.length > 0) {
        detections.forEach((detection, index) => {
          console.log(`Face ${index + 1}: confidence ${detection.score.toFixed(3)}`);
        });
      }
      
      return faceCount;
    } catch (error) {
      console.error('❌ Face detection error:', error);
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