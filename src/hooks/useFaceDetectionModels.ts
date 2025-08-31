// Face detection models hook removed - no longer needed
// This file is kept for backward compatibility

export const useFaceDetectionModels = () => {
  return { 
    isLoaded: false, 
    isLoading: false, 
    error: 'Face detection disabled' 
  };
};