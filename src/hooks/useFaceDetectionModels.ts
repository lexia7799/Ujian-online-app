import { useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceDetectionModels = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      if (isLoaded || isLoading) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🤖 Loading face detection models...');
        
        // Load models from CDN as fallback since we can't host model files
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        
        setIsLoaded(true);
        console.log('✅ Face detection models loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load face detection models:', error);
        setError('Failed to load face detection models');
        setIsLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  return { isLoaded, isLoading, error };
};