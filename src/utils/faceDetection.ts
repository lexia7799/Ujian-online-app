import * as faceapi from 'face-api.js';

export class FaceDetectionService {
  private isModelLoaded = false;
  private isDetecting = false;

  async loadModels(): Promise<boolean> {
    try {
      console.log('🤖 Loading face detection models...');
      
      // Use CDN for model files since we can't host them locally
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
      
      // Load required models for face detection
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.isModelLoaded = true;
      console.log('✅ Face detection models loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load face detection models:', error);
      this.isModelLoaded = false;
      return false;
    }
  }

  async detectFaces(videoElement: HTMLVideoElement): Promise<number> {
    if (!this.isModelLoaded || this.isDetecting) {
      return 0;
    }

    if (!videoElement || videoElement.readyState < 2) {
      return 0;
    }

    try {
      this.isDetecting = true;
      
      // Detect faces with tiny face detector (faster)
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        }));

      console.log(`👥 Detected ${detections.length} face(s)`);
      return detections.length;
    } catch (error) {
      console.error('Face detection error:', error);
      return 0;
    } finally {
      this.isDetecting = false;
    }
  }

  isReady(): boolean {
    return this.isModelLoaded;
  }
}

export const faceDetectionService = new FaceDetectionService();