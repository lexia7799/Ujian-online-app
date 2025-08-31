// Face detection service removed - no longer needed
// This file is kept for backward compatibility but all functions are disabled

export class FaceDetectionService {
  async loadModels(): Promise<boolean> {
    console.log('Face detection disabled');
    return false;
  }

  async detectFaces(): Promise<number> {
    return 1; // Always return 1 (normal) since face detection is disabled
  }

  isReady(): boolean {
    return false;
  }

  isLoading(): boolean {
    return false;
  }
}

export const faceDetectionService = new FaceDetectionService();