import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface StudentPreCheckProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  appState: any;
  user: any;
}

interface DeviceChecks {
  device: boolean | null;
  camera: boolean | null;
  screenCount: boolean | null;
}

const StudentPreCheck: React.FC<StudentPreCheckProps> = ({ navigateTo, navigateBack, appState, user }) => {
  const { studentInfo } = appState;
  const [checks, setChecks] = useState<DeviceChecks>({ device: null, camera: null, screenCount: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Enhanced mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                     window.screen.width < 1024;
    
    // Check screen count
    const checkScreens = async () => {
      try {
        if ('getScreenDetails' in window) {
          const screenDetails = await (window as any).getScreenDetails();
          setChecks(c => ({ ...c, screenCount: screenDetails.screens.length === 1 }));
        } else {
          // Fallback: assume single screen if API not available
          setChecks(c => ({ ...c, screenCount: true }));
        }
      } catch {
        setChecks(c => ({ ...c, screenCount: true }));
      }
    };
    
    setChecks(c => ({ ...c, device: !isMobile }));
    checkScreens();
    
    if (isMobile) return;
    
    // Initial camera setup
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setChecks(c => ({ ...c, camera: true }));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
        
        // Handle specific permission errors
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
            console.log("Camera permission denied by user");
          } else if (err.name === 'NotFoundError') {
            console.log("No camera device found");
          } else if (err.name === 'NotReadableError') {
            console.log("Camera is being used by another application");
          }
        }
        
        setChecks(c => ({ ...c, camera: false }));
      }
    };
    
    setupCamera();
    
    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const retryCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setChecks(c => ({ ...c, camera: true }));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error retrying camera access:", err);
      setChecks(c => ({ ...c, camera: false }));
    }
  };

  const allChecksPassed = checks.device && checks.camera && checks.screenCount;

  const startExam = async () => {
    // Request fullscreen immediately on user interaction
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
    } catch (error) {
      console.warn("Failed to enter fullscreen:", error);
      // Continue with exam even if fullscreen fails
    }

    // Validate that exam and user are defined
    if (!appState.exam || !user) {
      console.error("Missing exam or user data");
      alert("Data ujian tidak lengkap. Silakan coba lagi.");
      navigateBack();
      return;
    }

    // Ensure studentInfo is properly defined
    const finalStudentInfo = studentInfo || {
      fullName: user.fullName || '',
      nim: user.nim || '',
      major: user.major || '',
      className: user.className || ''
    };

    const { exam } = appState;
    
    // Validate exam time
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);
    
    console.log("Exam time validation:");
    console.log("Current time:", now.toISOString());
    console.log("Exam start time:", startTime.toISOString());
    console.log("Exam end time:", endTime.toISOString());
    
    if (now < startTime) {
      alert("Ujian belum dimulai. Silakan tunggu hingga waktu yang ditentukan.");
      navigateBack();
      return;
    }
    
    if (now > endTime) {
      alert("Waktu ujian telah berakhir. Anda tidak dapat lagi mengikuti ujian ini.");
      navigateBack();
      return;
    }
    
    const sessionRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
    
    try {
      console.log("Creating exam session...");
      const docRef = await addDoc(sessionRef, {
        studentId: user.id,
        studentInfo: finalStudentInfo,
        startTime: new Date(),
        status: 'started',
        violations: 0,
        answers: {},
        finalScore: null
      });
      
      console.log("Session created with ID:", docRef.id);
      
      navigateTo('student_exam', { 
        sessionId: docRef.id, 
        exam: exam,
        studentInfo: finalStudentInfo 
      });
    } catch (error) {
      console.error("Gagal memulai sesi ujian:", error);
      alert("Gagal memulai sesi ujian. Silakan coba lagi.");
    }
  };

  const renderCheckItem = (label: string, status: boolean | null) => {
    let statusText = "Memeriksa...";
    let colorClass = "text-yellow-400";
    
    if (status === true) {
      statusText = "OK";
      colorClass = "text-green-400";
    } else if (status === false) {
      statusText = "Gagal/Ditolak";
      colorClass = "text-red-400";
    }
    
    return (
      <li className="flex justify-between items-center p-3 bg-gray-700 rounded-md">
        <span>{label}</span>
        <span className={`font-bold ${colorClass}`}>{statusText}</span>
      </li>
    );
  };

  return (
    <div>
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      <h2 className="text-3xl font-bold mb-6 text-center">Pemeriksaan Perangkat</h2>
      <div className="w-full max-w-lg mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
        <ul className="space-y-3 mb-6">
          {renderCheckItem("Akses dari Desktop", checks.device)}
          {renderCheckItem("Layar Tunggal", checks.screenCount)}
          {renderCheckItem("Akses Kamera", checks.camera)}
        </ul>
        
        {checks.device === false && (
          <p className="text-red-400 text-center mb-4">
            ❌ Ujian hanya bisa diakses dari Laptop/Desktop dengan layar minimal 1024px.
          </p>
        )}
        
        {checks.screenCount === false && (
          <p className="text-red-400 text-center mb-4">
            ❌ Ujian hanya bisa diakses dengan satu layar. Matikan layar tambahan.
          </p>
        )}
        
        {checks.camera === false && (
          <div className="text-red-400 text-center mb-4 p-3 bg-red-900 border border-red-500 rounded-md">
            <p className="font-bold mb-2">❌ Akses Kamera Diperlukan</p>
            <p className="text-sm mb-2">
              Ujian memerlukan akses kamera untuk proctoring. Silakan:
            </p>
            <ol className="text-xs text-left list-decimal list-inside space-y-1">
              <li>Klik ikon kamera di address bar browser</li>
              <li>Pilih "Allow" atau "Izinkan" untuk akses kamera</li>
              <li>Pastikan tidak ada aplikasi lain yang menggunakan kamera</li>
              <li>Klik tombol "Coba Lagi Kamera" di bawah</li>
            </ol>
            <button 
              onClick={retryCamera}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              🔄 Coba Lagi Kamera
            </button>
          </div>
        )}
        
        {checks.camera === false && (
          <p className="text-yellow-400 text-center mb-4 text-sm">
            💡 <strong>Tips:</strong> Jika masih bermasalah, coba tutup aplikasi video call lain dan restart browser.
          </p>
        )}
        
        {checks.screenCount === false && (
          <p className="text-red-400 text-center mb-4">
            ⚠️ Sistem mendeteksi multiple layar. Mohon gunakan hanya satu layar untuk ujian.
          </p>
        )}
        
        <div className="my-4 w-full aspect-video bg-gray-900 rounded-md overflow-hidden">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
        </div>
        
        {checks.device && (
          <div className="mb-4 p-3 bg-blue-900 border border-blue-500 rounded-md">
            <p className="text-blue-300 text-sm">
              ℹ️ <strong>Penting:</strong> Ujian akan otomatis masuk mode fullscreen. 
              Keluar dari fullscreen akan dianggap sebagai pelanggaran.
            </p>
          </div>
        )}
        
        <button 
          onClick={startExam} 
          disabled={!allChecksPassed} 
          className={`w-full font-bold py-3 px-4 rounded-lg transition-colors ${
            allChecksPassed 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gray-500 text-gray-300 cursor-not-allowed'
          }`}
        >
          {allChecksPassed ? '🚀 Mulai Ujian' : '⏳ Menunggu Semua Pemeriksaan Lulus'}
        </button>
        
        {!allChecksPassed && (
          <div className="mt-3 p-3 bg-yellow-900 border border-yellow-500 rounded-md">
            <p className="text-yellow-300 text-sm text-center">
              ⚠️ <strong>Perhatian:</strong> Pastikan semua pemeriksaan menunjukkan status "OK" sebelum memulai ujian.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPreCheck;