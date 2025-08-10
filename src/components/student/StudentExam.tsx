import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { AlertIcon } from '../ui/Icons';
import Modal from '../ui/Modal';

interface Question {
  id: string;
  text: string;
  type: 'mc' | 'essay';
  options?: string[];
  correctAnswer?: number;
}

interface StudentExamProps {
  appState: any;
}

const StudentExam: React.FC<StudentExamProps> = ({ appState }) => {
  const { exam, studentInfo, sessionId } = appState;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(true);
  
  const calculateTimeLeft = () => {
    const endTime = new Date(exam.endTime).getTime();
    const now = new Date().getTime();
    const diff = (endTime - now) / 1000;
    return diff > 0 ? Math.round(diff) : 0;
  };
  
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);
  const [violations, setViolations] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showUnansweredModal, setShowUnansweredModal] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [violationReason, setViolationReason] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCameraControls, setShowCameraControls] = useState(false);
  
  const sessionDocRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`, sessionId);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tabCountRef = useRef(1);
  const lastFocusTime = useRef(Date.now());
  const fullscreenRetryCount = useRef(0);
  const maxFullscreenRetries = 3;
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraInitRetryCount = useRef(0);
  const maxCameraRetries = 5;

  useEffect(() => {
    // Initialize audio context
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Initialize camera with retry mechanism
    const initializeCamera = async (retryCount = 0) => {
      try {
        // Stop existing stream if any
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log("🛑 Stopping existing camera track");
          });
        }
        
        setCameraError(null);
        setIsCameraReady(false);
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user'
          },
          audio: false
        });
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          
          // Wait for video to be ready with multiple checks
          const checkVideoReady = () => {
            if (videoRef.current && 
                videoRef.current.readyState >= 2 && 
                videoRef.current.videoWidth > 0 && 
                videoRef.current.videoHeight > 0) {
              console.log("📷 Camera ready:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
              setIsCameraReady(true);
              cameraInitRetryCount.current = 0; // Reset retry count on success
            } else {
              setTimeout(checkVideoReady, 100);
            }
          };
          
          videoRef.current.onloadedmetadata = checkVideoReady;
          videoRef.current.oncanplay = checkVideoReady;
          
          // Fallback timeout
          setTimeout(() => {
            if (!isCameraReady && videoRef.current) {
              console.log("📷 Camera timeout, forcing ready state");
              setIsCameraReady(true);
              cameraInitRetryCount.current = 0;
            }
          }, 5000);
        }
      } catch (error) {
        console.error("Camera access failed:", error);
        setCameraError(`Camera error: ${error.message}`);
        
        // Retry camera initialization
        if (retryCount < maxCameraRetries) {
          cameraInitRetryCount.current = retryCount + 1;
          console.log(`🔄 Retrying camera initialization (${retryCount + 1}/${maxCameraRetries})`);
          setTimeout(() => {
            initializeCamera(retryCount + 1);
          }, 2000); // Wait 2 seconds before retry
        } else {
          setIsCameraReady(false);
          setCameraError("Camera failed after multiple attempts");
        }
      }
    };
    
    // Start camera initialization immediately
    initializeCamera();
    
    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log("🛑 Camera track stopped");
        });
      }
    };
  }, []);

  // Function to manually restart camera
  const restartCamera = async () => {
    console.log("🔄 Manually restarting camera...");
    cameraInitRetryCount.current = 0;
    
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Reinitialize camera
    try {
      setCameraError(null);
      setIsCameraReady(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        const checkVideoReady = () => {
          if (videoRef.current && 
              videoRef.current.readyState >= 2 && 
              videoRef.current.videoWidth > 0 && 
              videoRef.current.videoHeight > 0) {
            console.log("📷 Camera restarted successfully:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
            setIsCameraReady(true);
          } else {
            setTimeout(checkVideoReady, 100);
          }
        };
        
        videoRef.current.onloadedmetadata = checkVideoReady;
        videoRef.current.oncanplay = checkVideoReady;
      }
    } catch (error) {
      console.error("Manual camera restart failed:", error);
      setCameraError(`Restart failed: ${error.message}`);
    }
  };

  // Monitor camera stream health
  useEffect(() => {
    if (!isFinished && isCameraReady) {
      const checkCameraHealth = setInterval(() => {
        if (videoRef.current && streamRef.current) {
          const video = videoRef.current;
          const stream = streamRef.current;
          
          // Check if video is still playing and stream is active
          if (video.readyState < 2 || !stream.active || stream.getTracks().length === 0) {
            console.log("⚠️ Camera health check failed, attempting restart...");
            setIsCameraReady(false);
            restartCamera();
          }
        }
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(checkCameraHealth);
    }
  }, [isCameraReady, isFinished]);

  useEffect(() => {
    // Check fullscreen support
    const checkFullscreenSupport = () => {
      const elem = document.documentElement;
      return !!(elem.requestFullscreen || 
               (elem as any).webkitRequestFullscreen || 
               (elem as any).mozRequestFullScreen || 
               (elem as any).msRequestFullscreen);
    };
    
    setIsFullscreenSupported(checkFullscreenSupport());
    
    const fetchQuestions = async () => {
      try {
        const questionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/questions`);
        const querySnapshot = await getDocs(questionsRef);
        setQuestions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
      } catch (error) {
        console.error("Gagal memuat soal:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [exam.id]);

  // Simple photo capture function
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log("❌ Missing video or canvas element");
      return null;
    }
    
    const video = videoRef.current;
    
    // Check if video is actually playing and has dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      console.log("❌ Video not ready:", {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      return null;
    }
    
    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.log("❌ Cannot get canvas context");
        return null;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Clear canvas first
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 with high quality
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Check if image is not just black/empty
      if (imageData.length < 10000) { // Very small image likely means it's black
        console.log("⚠️ Captured image seems too small/black");
        return null;
      }
      
      console.log("✅ Photo captured successfully:", canvas.width, "x", canvas.height);
      return imageData;
      
    } catch (error) {
      console.error("Failed to capture photo:", error);
      return null;
    }
  };

  // Fullscreen functions
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      fullscreenRetryCount.current = 0;
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
      fullscreenRetryCount.current++;
      
      if (fullscreenRetryCount.current < maxFullscreenRetries) {
        setTimeout(() => {
          if (!isFinished) {
            enterFullscreen();
          }
        }, 2000);
      } else {
        handleViolation("Fullscreen Required - Unable to Enter");
      }
    }
  };

  const isInFullscreen = () => {
    return !!(document.fullscreenElement || 
             (document as any).webkitFullscreenElement || 
             (document as any).mozFullScreenElement || 
             (document as any).msFullscreenElement);
  };

  // Auto-enter fullscreen when exam loads
  useEffect(() => {
    if (!isLoading && questions.length > 0 && isFullscreenSupported && !isFinished) {
      const timer = setTimeout(() => {
        enterFullscreen();
      }, 1000); // Small delay to ensure page is ready
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, questions.length, isFullscreenSupported, isFinished]);

  useEffect(() => {
    if (isFinished || isLoading) return;
    
    // Enhanced security monitoring
    const handleVisibilityChange = () => {
      if (document.hidden && !isFinished) {
        handleViolation("Tab/Window Switch");
      }
    };
    
    // Monitor fullscreen changes
    const handleFullscreenChange = () => {
      if (!isInFullscreen() && !isFinished) {
        handleViolation("Exited Fullscreen");
        // Auto re-enter fullscreen after violation
        setTimeout(() => {
          if (!isFinished) {
            enterFullscreen();
          }
        }, 1000);
      }
    };
    
    const handleFocus = () => {
      lastFocusTime.current = Date.now();
    };
    
    const handleBlur = () => {
      if (!isFinished) {
        handleViolation("Focus Lost");
      }
    };
    
    // Detect multiple tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'examTabCount' && !isFinished) {
        const currentCount = parseInt(localStorage.getItem('examTabCount') || '1');
        if (currentCount > 1) {
          handleViolation("Multiple Tabs Detected");
        }
      }
    };
    
    // Set tab count
    const currentTabCount = parseInt(localStorage.getItem('examTabCount') || '0') + 1;
    localStorage.setItem('examTabCount', currentTabCount.toString());
    tabCountRef.current = currentTabCount;
    
    if (currentTabCount > 1) {
      handleViolation("Multiple Tabs Detected");
    }
    
    // Prevent right-click and common shortcuts
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation("Right Click Attempt");
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common cheating shortcuts
      if (
        e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 't' || e.key === 'n' || e.key === 'w') ||
        e.key === 'F12' ||
        e.key === 'F11' || // Block F11 fullscreen toggle
        e.key === 'Escape' || // Block Escape key (exits fullscreen)
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') || // Block save
        (e.key === 'PrintScreen') || // Block screenshot
        e.altKey && e.key === 'Tab'
      ) {
        e.preventDefault();
        if (e.key === 'PrintScreen') {
          handleViolation("Screenshot Attempt");
        } else if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a')) {
          handleViolation("Copy/Paste Attempt");
        } else {
          handleViolation("Prohibited Shortcut");
        }
      }
    };
    
    // Monitor screen changes
    const handleScreenChange = () => {
      if (screen.availWidth !== window.screen.availWidth || screen.availHeight !== window.screen.availHeight) {
        handleViolation("Screen Configuration Change");
      }
    };
    
    // Check for developer tools
    const checkDevTools = () => {
      const threshold = 160;
      if (window.outerHeight - window.innerHeight > threshold || window.outerWidth - window.innerWidth > threshold) {
        handleViolation("Developer Tools Detected");
      }
    };
    
    const devToolsInterval = setInterval(checkDevTools, 1000);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          finishExam("Waktu Habis");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleScreenChange);
    
    return () => {
      clearInterval(timer);
      clearInterval(devToolsInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleScreenChange);
      
      // Cleanup tab count
      const newCount = Math.max(0, tabCountRef.current - 1);
      if (newCount === 0) {
        localStorage.removeItem('examTabCount');
      } else {
        localStorage.setItem('examTabCount', newCount.toString());
      }
    };
  }, [isFinished, isLoading, violations]);

  const playWarningSound = () => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 1);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.5);
  };

  const handleViolation = (reason = "Unknown") => {
    const newViolations = violations + 1;
    setViolations(newViolations);
    setViolationReason(reason);
    
    console.log("🚨 Violation detected:", reason, "- Attempting to capture photo");
    
    // Try to capture photo with retry mechanism
    let photoData = null;
    
    // First attempt
    photoData = capturePhoto();
    
    // If first attempt fails, wait a bit and try again
    if (!photoData && videoRef.current) {
      console.log("🔄 First photo attempt failed, retrying...");
      setTimeout(() => {
        const retryPhoto = capturePhoto();
        if (retryPhoto) {
          // Update the violation record with the retry photo
          const retryViolationData: any = {};
          retryViolationData[`violationSnapshot_${newViolations}`] = {
            imageData: retryPhoto,
            timestamp: new Date().toISOString(),
            violationType: reason
          };
          
          updateDoc(sessionDocRef, retryViolationData).catch(error => {
            console.error("Failed to save retry photo:", error);
          });
        }
      }, 500);
    }
    
    // Prepare violation data
    const violationData: any = {
      violations: newViolations,
      lastViolation: { 
        reason, 
        timestamp: new Date(),
        hasSnapshot: !!photoData
      }
    };
    
    // Add photo if captured
    if (photoData) {
      console.log("✅ Adding photo to violation data");
      violationData[`violationSnapshot_${newViolations}`] = {
        imageData: photoData,
        timestamp: new Date().toISOString(),
        violationType: reason
      };
    } else {
      console.log("❌ No photo captured for violation");
    }
    
    // Save to Firebase
    updateDoc(sessionDocRef, violationData).catch(error => {
      console.error("Failed to save violation data:", error);
    });
    
    playWarningSound();
    
    if (newViolations >= 3) {
      finishExam(`Diskualifikasi: ${reason}`);
    } else {
      setShowViolationModal(true);
      setTimeout(() => setShowViolationModal(false), 3000);
      
      // Auto re-enter fullscreen after violation
      setTimeout(() => {
        if (!isFinished && !isInFullscreen()) {
          enterFullscreen();
        }
      }, 1500);
    }
  };

  const handleViolationOld = (reason = "Unknown") => {
    const newViolations = violations + 1;
    setViolations(newViolations);
    setViolationReason(reason);
    
    // Capture snapshot on violation
    captureViolationSnapshot(reason).then(snapshot => {
      const violationData = {
        violations: newViolations,
        lastViolation: { reason, timestamp: new Date() }
      };
      
      if (snapshot) {
        violationData[`violationSnapshot_${newViolations}`] = snapshot;
      }
      
      updateDoc(sessionDocRef, violationData);
    }).catch(error => {
      console.error("Error in violation handling:", error);
    });
    
    playWarningSound();
    
    if (newViolations >= 3) {
      finishExam(`Diskualifikasi: ${reason}`);
    } else {
      setShowViolationModal(true);
      setTimeout(() => setShowViolationModal(false), 3000);
      
      // Auto re-enter fullscreen after violation
      setTimeout(() => {
        if (!isFinished && !isInFullscreen()) {
          enterFullscreen();
        }
      }, 1500);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    updateDoc(sessionDocRef, { answers: newAnswers });
  };
  
  const checkUnansweredQuestions = () => {
    const unanswered = questions
      .map((q, index) => ({ question: q, index: index + 1 }))
      .filter(({ question }) => !answers[question.id] && answers[question.id] !== 0)
      .map(({ index }) => index);
    
    return unanswered;
  };
  
  const handleFinishAttempt = () => {
    const unanswered = checkUnansweredQuestions();
    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      setShowUnansweredModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };
  
  const finishExam = async (reason = "Selesai") => {
    if (isFinished) return;
    setIsFinished(true);
    setShowConfirmModal(false);
    setShowUnansweredModal(false);
    
    // Exit fullscreen when exam is finished
    if (isInFullscreen()) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      } catch (error) {
        console.error("Failed to exit fullscreen:", error);
      }
    }
    
    let score = 0;
    let status = 'finished';
    
    if (reason.startsWith("Diskualifikasi")) {
      score = 0;
      status = 'disqualified';
    } else {
      const mcQuestions = questions.filter(q => q.type === 'mc');
      mcQuestions.forEach(q => {
        if (q.correctAnswer === answers[q.id]) {
          score++;
        }
      });
      score = mcQuestions.length > 0 ? (score / mcQuestions.length) * 100 : 0;
    }
    
    setFinalScore(score);
    await updateDoc(sessionDocRef, { 
      status, 
      finishTime: new Date(), 
      finalScore: score, 
      answers 
    });
  };

  if (isLoading) {
    return <div className="text-center p-8">Memuat soal ujian...</div>;
  }
  
  if (!isFullscreenSupported) {
    return (
      <div className="text-center h-screen flex flex-col justify-center items-center -mt-16">
        <div className="bg-red-800 p-8 rounded-lg shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Browser Tidak Didukung</h2>
          <p className="text-gray-300 mb-4">
            Browser Anda tidak mendukung mode fullscreen yang diperlukan untuk ujian ini.
          </p>
          <p className="text-sm text-gray-400">
            Silakan gunakan browser modern seperti Chrome, Firefox, atau Edge versi terbaru.
          </p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="text-center h-screen flex flex-col justify-center items-center -mt-16">
        {finalScore === 0 && violations >= 3 ? (
          <>
            <h2 className="text-4xl font-bold text-red-500 mb-4">Ujian Dihentikan!</h2>
            <p className="text-xl text-gray-300">
              Anda telah melebihi batas pelanggaran yang diizinkan.
            </p>
            <p className="text-2xl font-bold mt-4">
              Nilai Anda: <span className="text-red-500">0</span>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-4xl font-bold text-green-400 mb-4">Ujian Selesai!</h2>
            <p className="text-xl text-gray-300">Terima kasih telah menyelesaikan ujian.</p>
            <p className="text-2xl font-bold mt-4">
              Nilai Pilihan Ganda Anda: <span className="text-green-400">{finalScore?.toFixed(2)}</span>
            </p>
            <p className="text-lg text-gray-400 mt-2">
              Nilai esai (jika ada) akan diperiksa oleh dosen.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <Modal 
        isOpen={showConfirmModal} 
        title="Selesaikan Ujian?" 
        onCancel={() => setShowConfirmModal(false)} 
        onConfirm={() => finishExam("Selesai")} 
        confirmText="Ya, Selesaikan" 
        confirmColor="green"
      >
        <p>Apakah Anda yakin ingin menyelesaikan ujian? Anda tidak dapat kembali setelah ini.</p>
      </Modal>

      <Modal 
        isOpen={showUnansweredModal} 
        title="Ada Soal yang Belum Dijawab" 
        onCancel={() => setShowUnansweredModal(false)} 
        onConfirm={() => setShowConfirmModal(true)} 
        confirmText="Tetap Selesaikan" 
        confirmColor="red"
        cancelText="Kembali Mengerjakan"
      >
        <p className="mb-3">Anda belum menjawab soal nomor:</p>
        <div className="bg-gray-700 p-3 rounded-md mb-3">
          <span className="font-bold text-yellow-400">
            {unansweredQuestions.join(', ')}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Apakah Anda yakin ingin menyelesaikan ujian tanpa menjawab soal-soal tersebut?
        </p>
      </Modal>

      {showViolationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 border-2 border-yellow-500 p-8 rounded-lg text-center shadow-2xl">
            <AlertIcon />
            <h3 className="text-3xl font-bold text-yellow-400 mt-4">PERINGATAN!</h3>
            <p className="text-lg mt-2">Pelanggaran Terdeteksi: {violationReason}</p>
            <p className="text-sm text-red-400 mt-1">Sistem monitoring aktif!</p>
            <p className="text-2xl font-bold mt-2">
              Kesempatan tersisa: <span className="text-white">{3 - violations}</span>
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Foto telah diambil sebagai bukti pelanggaran
            </p>
          </div>
        </div>
      )}

      {/* Hidden video element for violation snapshots */}
      {/* Live camera feed for student and violation capture */}
      <div className="fixed top-4 right-4 z-50 bg-gray-800 rounded-lg border-2 border-gray-600 overflow-hidden shadow-lg">
        <div className="bg-gray-700 px-2 py-1 text-xs text-white text-center">
          📷 Live Camera
        </div>
        <div className="relative">
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-40 h-30 object-cover"
          />
          {!isCameraReady && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center text-xs text-gray-400">
                {cameraError ? (
                  <>
                    <div>❌ Camera Error</div>
                    <div className="mt-1">Retry {cameraInitRetryCount.current}/{maxCameraRetries}</div>
                  </>
                ) : (
                  <>
                    <div>⏳ Loading...</div>
                    <div className="mt-1">Initializing</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="bg-gray-700 px-2 py-1 flex justify-between items-center">
          <button
            onClick={() => setShowCameraControls(!showCameraControls)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {showCameraControls ? '▼' : '▶'} Perbaiki Kamera
          </button>
          <div className="text-xs text-gray-400">
            {isCameraReady ? '🟢' : '🔴'}
          </div>
        </div>
        {showCameraControls && (
          <div className="bg-gray-700 px-2 py-2 border-t border-gray-600">
            <button
              onClick={restartCamera}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
            >
              🔄 Restart Camera
            </button>
            {cameraError && (
              <div className="mt-1 text-xs text-red-400 text-center">
                {cameraError}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Hidden canvas for photo capture */}
      <canvas 
        ref={canvasRef}
        style={{ 
          position: 'absolute',
          top: '-1000px',
          left: '-1000px',
          pointerEvents: 'none'
        }}
      />
      
      {/* Camera status indicator with more detail */}
      <div className="fixed top-4 left-4 bg-gray-800 text-white px-3 py-2 rounded text-xs z-40 border">
        {isCameraReady ? (
          <div className="text-green-400">
            ✅ Camera Ready
            {videoRef.current && (
              <div className="text-xs text-gray-300">
                {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
              </div>
            )}
          </div>
        ) : (
          <div>
            {cameraError ? (
              <>
                <div className="text-red-400">❌ Camera Error</div>
                <div className="text-xs text-gray-300">
                  Retry {cameraInitRetryCount.current}/{maxCameraRetries}
                </div>
              </>
            ) : (
              <div className="text-yellow-400">⏳ Initializing Camera...</div>
            )}
          </div>
        )}
        <div className="text-xs text-gray-400 mt-1">
          Jumlah Pelanggaran: {violations}/3
        </div>
        {streamRef.current && (
          <div className="text-xs text-gray-400">
            Stream: {streamRef.current.active ? '🟢 Active' : '🔴 Inactive'}
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-4 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{exam.name}</h2>
          <p className="text-sm text-gray-400">{studentInfo.name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono bg-gray-900 px-4 py-2 rounded-lg">
            {Math.floor(timeLeft / 3600).toString().padStart(2, '0')}:
            {Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}:
            {(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-sm text-red-500 mt-1">Pelanggaran: {violations}/3</div>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center p-8 mt-8 bg-gray-800 rounded-lg">
          <h3 className="text-2xl font-bold text-yellow-400 mb-4">Ujian Belum Siap</h3>
          <p className="text-gray-300">
            Tidak ada soal yang tersedia untuk ujian ini. Silakan hubungi dosen atau pengawas ujian Anda.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-gray-800 p-6 rounded-lg">
              <p className="font-semibold text-lg mb-4">{index + 1}. {q.text}</p>
              
              {q.type === 'mc' && q.options && (
                <div className="space-y-3">
                  {q.options.map((opt, i) => (
                    <label 
                      key={i} 
                      className={`block p-3 rounded-md cursor-pointer transition-colors ${
                        answers[q.id] === i 
                          ? 'bg-indigo-600' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name={q.id} 
                        checked={answers[q.id] === i} 
                        onChange={() => handleAnswerChange(q.id, i)} 
                        className="hidden" 
                      />
                      <span className="ml-2">{String.fromCharCode(65 + i)}. {opt}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {q.type === 'essay' && (
                <textarea 
                  value={answers[q.id] || ''} 
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)} 
                  placeholder="Ketik jawaban esai Anda di sini..." 
                  className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 h-32"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={handleFinishAttempt} 
        className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg" 
        disabled={questions.length === 0}
      >
        Selesaikan Ujian
      </button>
    </div>
  );
};

export default StudentExam;