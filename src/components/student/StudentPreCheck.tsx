import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import { faceDetectionService } from '../../utils/faceDetection';

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
  faceDetection: boolean | null;
}

const StudentPreCheck: React.FC<StudentPreCheckProps> = ({ navigateTo, navigateBack, appState, user }) => {
  const { studentInfo } = appState;
  const [checks, setChecks] = useState<DeviceChecks>({ device: null, camera: null, screenCount: null, faceDetection: null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>('Memuat...');

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
    
    // Load face detection models first
    const loadFaceModels = async () => {
      setIsLoadingModels(true);
      setFaceDetectionStatus('Memuat model deteksi wajah...');
      
      const modelsLoaded = await faceDetectionService.loadModels();
      
      if (modelsLoaded) {
        setFaceDetectionStatus('Siap - Sistem akan mendeteksi 2+ wajah sebagai pelanggaran');
      } else {
        setFaceDetectionStatus('Gagal memuat - Refresh halaman dan coba lagi');
      }
      
      setChecks(c => ({ ...c, faceDetection: modelsLoaded }));
      setIsLoadingModels(false);
    };
    
    loadFaceModels();
    
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        facingMode: 'user'
      }
    })
      .then(stream => {
        setChecks(c => ({ ...c, camera: true }));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Error accessing media devices.", err);
        setChecks(c => ({ ...c, camera: false }));
      });
  }, []);

  const allChecksPassed = checks.device && checks.camera && checks.screenCount && checks.faceDetection;

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
    const sessionRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
    
    try {
      const docRef = await addDoc(sessionRef, {
        studentId: user.id,
        studentInfo: finalStudentInfo,
        startTime: new Date(),
        status: 'started',
        violations: 0,
        answers: {},
        finalScore: null
      });
      navigateTo('student_exam', { sessionId: docRef.id });
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

  const renderCheckItem = (label: string, status: boolean | null, additionalInfo?: string) => {
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
        {additionalInfo && (
          <div className="mt-2 text-xs text-gray-400">
            {additionalInfo}
          </div>
        )}
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
          {renderCheckItem("Sistem Deteksi Wajah", checks.faceDetection, faceDetectionStatus)}
        </ul>
        
        {isLoadingModels && (
          <div className="mb-4 p-3 bg-blue-900 border border-blue-500 rounded-md">
            <p className="text-blue-300 text-sm">
              🤖 Memuat model deteksi wajah... Mohon tunggu sebentar.
            </p>
          </div>
        )}
        
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
          <p className="text-yellow-400 text-center mb-4">
            ⚠️ Mohon izinkan akses kamera di browser Anda, lalu segarkan halaman ini.
          </p>
        )}
        
        {checks.faceDetection === false && (
          <p className="text-red-400 text-center mb-4">
            ❌ Gagal memuat sistem deteksi wajah. Refresh halaman dan coba lagi.
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
              🤖 Memuat model deteksi wajah... Mohon tunggu sebentar (ini hanya sekali).
            </p>
            <ul className="text-blue-200 text-xs mt-2 space-y-1">
              <li>• Ujian akan otomatis masuk mode fullscreen</li>
              <li>• Sistem akan mendeteksi jika ada 2 wajah atau lebih (PELANGGARAN)</li>
              <li>• 1 wajah = normal, tidak ada pelanggaran</li>
              <li>• Foto akan diambil secara berkala untuk absensi</li>
              <li>• Keluar dari fullscreen akan dianggap pelanggaran</li>
            </ul>
          </div>
        )}
        
        {checks.faceDetection && (
          <div className="mb-4 p-3 bg-green-900 border border-green-500 rounded-md">
            <p className="text-green-300 text-sm">
              🤖 <strong>Sistem Deteksi Wajah Siap:</strong> Sistem akan mendeteksi jika ada 2 wajah atau lebih.
            </p>
            <ul className="text-green-200 text-xs mt-2 space-y-1">
              <li>• ✅ 1 Wajah = Normal</li>
              <li>• 🚨 2+ Wajah = Pelanggaran (Ada orang lain)</li>
            </ul>
            <p className="text-yellow-300 text-xs mt-2">
              <strong>Penting:</strong> Pastikan hanya Anda yang berada di depan kamera selama ujian!
            </p>
          </div>
        )}
        
        <button 
          onClick={startExam} 
          disabled={!allChecksPassed} 
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {allChecksPassed ? 'Mulai Ujian' : 'Menunggu Pemeriksaan Selesai'}
        </button>
      </div>
    </div>
  );
};

export default StudentPreCheck;