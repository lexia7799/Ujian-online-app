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
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [showReFullscreenPrompt, setShowReFullscreenPrompt] = useState(false);
  
  const sessionDocRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`, sessionId);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingSoundRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tabCountRef = useRef(1);
  const lastFocusTime = useRef(Date.now());
  const fullscreenRetryCount = useRef(0);
  const maxFullscreenRetries = 3;

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Initialize camera for violation snapshots
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error("Failed to initialize camera for snapshots:", error);
      }
    };
    
    initializeCamera();
    
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

  // Function to capture snapshot on violation
  const captureViolationSnapshot = async (violationType: string) => {
    if (!videoRef.current) return null;
    
    try {
      // Create a new canvas for each snapshot
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;
      
      // Wait for video to be ready if not already
      if (videoRef.current.readyState < videoRef.current.HAVE_CURRENT_DATA) {
        return null; // Video not ready, skip snapshot
      }
      
      // Get actual video dimensions
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        return null; // Video dimensions not available
      }
      
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      // Draw the video frame to canvas
      context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);
      
      // Convert to base64 image
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      return {
        imageData,
        timestamp: new Date().toISOString(),
        violationType,
        dimensions: { width: videoWidth, height: videoHeight }
      };
    } catch (error) {
      console.error("Failed to capture violation snapshot:", error);
    }
    
    return null;
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
    // Fullscreen is now handled by user action in StudentPreCheck
    // This useEffect is removed to prevent permission errors
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
        // Show prompt for user to re-enter fullscreen
        setShowReFullscreenPrompt(true);
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
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'u') ||
        e.altKey && e.key === 'Tab'
      ) {
        e.preventDefault();
        handleViolation("Prohibited Shortcut");
      }
      
      // Handle Escape key specially - prevent default and re-enter fullscreen
      if (e.key === 'Escape') {
        e.preventDefault();
        handleViolation("Escape Key Pressed");
        // Show prompt for user to re-enter fullscreen
        setShowReFullscreenPrompt(true);
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
          finishExam("Waktu Habis", false);
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
    // Prevent sound spam - only play if not already playing
    if (isPlayingSoundRef.current || !audioContextRef.current) return;
    
    isPlayingSoundRef.current = true;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 0.5);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.5);
    
    // Reset sound flag after sound duration
    setTimeout(() => {
      isPlayingSoundRef.current = false;
    }, 600); // Slightly longer than sound duration to prevent overlap
  };

  const handleViolation = (reason = "Unknown") => {
    const newViolations = violations + 1;
    setViolations(newViolations);
    playWarningSound();
    
    if (newViolations >= 3) {
      finishExam(`Diskualifikasi: ${reason}`, false);
    } else {
      // Capture snapshot on violation
      captureViolationSnapshot(reason).then(snapshot => {
        if (snapshot) {
          const violationData = {
            violations: newViolations,
            lastViolation: { reason, timestamp: new Date() },
            [`violationSnapshot_${newViolations}`]: snapshot
          };
          updateDoc(sessionDocRef, violationData);
        } else {
          updateDoc(sessionDocRef, { 
            violations: newViolations,
            lastViolation: { reason, timestamp: new Date() }
          });
        }
      });
      
      setShowViolationModal(true);
      setTimeout(() => setShowViolationModal(false), 3000);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    updateDoc(sessionDocRef, { answers: newAnswers });
  };
  
  const validateAnswers = () => {
    const unansweredQuestions: string[] = [];
    
    questions.forEach((question, index) => {
      const answer = answers[question.id];
      if (question.type === 'mc') {
        if (answer === undefined || answer === null) {
          unansweredQuestions.push(`Soal ${index + 1} (Pilihan Ganda)`);
        }
      } else if (question.type === 'essay') {
        if (!answer || answer.trim() === '') {
          unansweredQuestions.push(`Soal ${index + 1} (Esai)`);
        }
      }
    });
    
    return unansweredQuestions;
  };
  
  const handleSubmitAttempt = () => {
    const unanswered = validateAnswers();
    
    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      setShowValidationModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };
  
  const finishExam = async (reason = "Selesai", userInitiated = false) => {
    if (isFinished) return;
    setIsFinished(true);
    setShowConfirmModal(false);
    
    // Only exit fullscreen when user-initiated to avoid browser security restrictions
    if (userInitiated) {
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
              Nilai esai (jika ada) akan diperiksa oleh pengajar.
            </p>
          </>
        )}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Hidden video element for snapshots */}
      <video 
        ref={videoRef} 
        style={{ 
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '320px',
          height: '240px'
        }} 
        autoPlay 
        playsInline 
        muted
        onLoadedData={() => {
          console.log('Video loaded and ready for snapshots');
        }}
      />
      
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-800 p-4 z-50 border-b border-gray-700">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <p className="text-sm text-gray-400">{studentInfo.name} - {studentInfo.nim}</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-yellow-400">
                {formatTime(timeLeft)}
              </div>
              <div className="text-xs text-gray-400">Waktu Tersisa</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${violations >= 2 ? 'text-red-400' : violations >= 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                {violations}/3
              </div>
              <div className="text-xs text-gray-400">Pelanggaran</div>
            </div>
            <button
              onClick={handleSubmitAttempt}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-8 max-w-4xl mx-auto">
        {questions.map((question, index) => (
          <div key={question.id} className="mb-8 bg-gray-800 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4">{question.text}</h3>
                
                {question.type === 'mc' ? (
                  <div className="space-y-3">
                    {question.options?.map((option, optionIndex) => (
                      <label key={optionIndex} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-700 p-3 rounded-lg transition-colors">
                        <input
                          type="radio"
                          name={question.id}
                          value={optionIndex}
                          checked={answers[question.id] === optionIndex}
                          onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-300">{String.fromCharCode(65 + optionIndex)}. {option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="Tulis jawaban Anda di sini..."
                    className="w-full h-32 p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Violation Modal */}
      {showViolationModal && (
        <Modal isOpen={showViolationModal} onClose={() => setShowViolationModal(false)}>
          <div className="text-center">
            <AlertIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-500 mb-4">Peringatan!</h2>
            <p className="text-gray-300 mb-4">
              Pelanggaran terdeteksi. Anda memiliki {3 - violations} peringatan tersisa.
            </p>
            <p className="text-sm text-gray-400">
              Jika Anda melakukan 3 pelanggaran, ujian akan dihentikan secara otomatis.
            </p>
          </div>
        </Modal>
      )}

      {/* Validation Modal for Unanswered Questions */}
      {showValidationModal && (
        <Modal isOpen={showValidationModal} onClose={() => setShowValidationModal(false)}>
          <div className="text-center">
            <div className="text-yellow-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-500 mb-4">Peringatan!</h2>
            <p className="text-gray-300 mb-4">
              Masih ada <span className="font-bold text-yellow-400">{unansweredQuestions.length}</span> soal yang belum dijawab:
            </p>
            <div className="bg-gray-700 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
              <ul className="text-left text-sm text-gray-300 space-y-1">
                {unansweredQuestions.map((question, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 flex-shrink-0"></span>
                    {question}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Apakah Anda yakin ingin menyelesaikan ujian tanpa menjawab soal-soal tersebut?
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => setShowValidationModal(false)}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Kembali Mengerjakan
              </button>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setShowConfirmModal(true);
                }}
                className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Tetap Selesaikan
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Re-enter Fullscreen Prompt Modal */}
      {showReFullscreenPrompt && (
        <Modal isOpen={showReFullscreenPrompt} onClose={() => {}}>
          <div className="text-center">
            <div className="text-red-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-500 mb-4">Mode Layar Penuh Diperlukan!</h2>
            <p className="text-gray-300 mb-4">
              Anda telah keluar dari mode layar penuh. Untuk melanjutkan ujian, Anda harus kembali ke mode layar penuh.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Klik tombol di bawah untuk kembali ke mode layar penuh dan melanjutkan ujian.
            </p>
            <button
              onClick={() => {
                enterFullscreen();
                setShowReFullscreenPrompt(false);
              }}
              className="bg-red-600 hover:bg-red-700 px-8 py-3 rounded-lg font-semibold transition-colors text-white"
            >
              Kembali ke Layar Penuh
            </button>
          </div>
        </Modal>
      )}
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-yellow-500 mb-4">Konfirmasi</h2>
            <p className="text-gray-300 mb-6">
              Apakah Anda yakin ingin menyelesaikan ujian? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => finishExam("Selesai", true)}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                Ya, Selesai
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StudentExam;