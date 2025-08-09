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
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  
  const sessionDocRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`, sessionId);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tabCountRef = useRef(1);
  const lastFocusTime = useRef(Date.now());
  const fullscreenRetryCount = useRef(0);
  const maxFullscreenRetries = 3;

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
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
        e.altKey && e.key === 'Tab'
      ) {
        e.preventDefault();
        handleViolation("Prohibited Shortcut");
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
    updateDoc(sessionDocRef, { 
      violations: newViolations,
      lastViolation: { reason, timestamp: new Date() }
    });
    playWarningSound();
    
    if (newViolations >= 3) {
      finishExam(`Diskualifikasi: ${reason}`);
    } else {
      setShowViolationModal(true);
      setTimeout(() => setShowViolationModal(false), 3000);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    updateDoc(sessionDocRef, { answers: newAnswers });
  };
  
  const finishExam = async (reason = "Selesai") => {
    if (isFinished) return;
    setIsFinished(true);
    setShowConfirmModal(false);
    
    // Exit fullscreen when exam is finished
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

      {showViolationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
          <div className="bg-gray-800 border-2 border-yellow-500 p-8 rounded-lg text-center shadow-2xl">
            <AlertIcon />
            <h3 className="text-3xl font-bold text-yellow-400 mt-4">PERINGATAN!</h3>
            <p className="text-lg mt-2">Anda terdeteksi melakukan pelanggaran.</p>
            <p className="text-sm text-red-400 mt-1">Sistem monitoring aktif!</p>
            <p className="text-2xl font-bold mt-2">
              Kesempatan tersisa: <span className="text-white">{3 - violations}</span>
            </p>
          </div>
        </div>
      )}

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
        onClick={() => setShowConfirmModal(true)} 
        className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg" 
        disabled={questions.length === 0}
      >
        Selesaikan Ujian
      </button>
    </div>
  );
};

export default StudentExam;