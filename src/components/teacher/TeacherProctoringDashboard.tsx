import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import Modal from '../ui/Modal';

interface Session {
  id: string;
  studentInfo: {
    name: string;
    nim: string;
  };
  status: string;
  violations: number;
  violationSnapshot_1?: {
    imageData: string;
    timestamp: string;
    violationType: string;
  };
  violationSnapshot_2?: {
    imageData: string;
    timestamp: string;
    violationType: string;
  };
}

interface TeacherProctoringDashboardProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  appState: any;
}

const TeacherProctoringDashboard: React.FC<TeacherProctoringDashboardProps> = ({ navigateTo, navigateBack, appState }) => {
  const { exam } = appState;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<{
    imageData: string;
    timestamp: string;
    violationType: string;
    studentName: string;
  } | null>(null);

  const handleBackToVerifiedDashboard = () => {
    if (appState.fromVerifiedDashboard) {
      navigateTo('teacher_dashboard_verified', { exam, verifiedExam: exam });
    } else {
      navigateBack();
    }
  };

  useEffect(() => {
    if (!exam?.id) return;
    
    const sessionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
    const unsubSessions = onSnapshot(query(sessionsRef), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
    });
    
    return () => unsubSessions();
  }, [exam?.id]);

  const viewSnapshot = (snapshot: any, studentName: string) => {
    setSelectedSnapshot({
      ...snapshot,
      studentName
    });
  };

  if (!exam) {
    return <div className="text-center p-8">Memuat data ujian...</div>;
  }

  return (
    <div>
      <Modal 
        isOpen={!!selectedSnapshot} 
        title={`Foto Pelanggaran - ${selectedSnapshot?.studentName}`}
        onCancel={() => setSelectedSnapshot(null)}
        cancelText="Tutup"
      >
        {selectedSnapshot && (
          <div className="text-center">
            <div className="w-full max-w-md mx-auto mb-4">
              {selectedSnapshot.imageData ? (
                <img 
                  src={selectedSnapshot.imageData} 
                  alt="Violation Snapshot" 
                  className="w-full h-auto rounded-lg border border-gray-600"
                  onError={(e) => {
                    console.error("Failed to load modal image:", selectedSnapshot.imageData?.substring(0, 50));
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log("Modal image loaded successfully");
                  }}
                />
              ) : (
                <div className="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Foto tidak tersedia</p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400">Jenis: {selectedSnapshot.violationType}</p>
            <p className="text-sm text-gray-400">Waktu: {new Date(selectedSnapshot.timestamp).toLocaleString('id-ID')}</p>
          </div>
        )}
      </Modal>
      
      <button 
        onClick={handleBackToVerifiedDashboard} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <h2 className="text-3xl font-bold">Snapshot Pelanggaran</h2>
      <p className="text-lg text-indigo-400 mb-6">{exam.name} ({exam.code}) - Foto diambil saat pelanggaran terdeteksi</p>
      
      {sessions.length === 0 ? (
        <p className="text-gray-400 text-center mt-8 bg-gray-800 p-6 rounded-lg">
          Belum ada siswa yang bergabung dalam ujian ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 ${
                session.violations > 0 
                  ? 'border-yellow-500' 
                  : 'border-gray-700'
              } ${
                session.status === 'disqualified' 
                  ? 'border-red-600' 
                  : ''
              }`}
            >
              <div className="w-full aspect-video bg-gray-900 flex items-center justify-center">
                {session.violations > 0 ? (
                  <div className="text-center p-4">
                    {(session.violationSnapshot_1?.imageData || session.violationSnapshot_2?.imageData) ? (
                      <div>
                        {session.violationSnapshot_1?.imageData ? (
                          <img 
                            src={session.violationSnapshot_1.imageData} 
                            alt="Preview Violation 1" 
                            className="w-full h-full object-cover rounded"
                            onLoad={() => {
                              console.log("Preview image 1 loaded successfully");
                            }}
                            onError={(e) => {
                              console.error("Failed to load preview image 1:", {
                                hasImageData: !!session.violationSnapshot_1?.imageData,
                                imageDataLength: session.violationSnapshot_1?.imageData?.length,
                                imageDataStart: session.violationSnapshot_1?.imageData?.substring(0, 50)
                              });
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : session.violationSnapshot_2?.imageData ? (
                          <img 
                            src={session.violationSnapshot_2.imageData} 
                            alt="Preview Violation 2" 
                            className="w-full h-full object-cover rounded"
                            onLoad={() => {
                              console.log("Preview image 2 loaded successfully");
                            }}
                            onError={(e) => {
                              console.error("Failed to load preview image 2:", {
                                hasImageData: !!session.violationSnapshot_2?.imageData,
                                imageDataLength: session.violationSnapshot_2?.imageData?.length,
                                imageDataStart: session.violationSnapshot_2?.imageData?.substring(0, 50)
                              });
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div>
                        <div className="text-yellow-400 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <p className="text-sm text-yellow-400 font-bold">Ada Pelanggaran!</p>
                        <p className="text-xs text-gray-400">
                          Foto sedang diproses atau gagal diambil
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Debug: {JSON.stringify({
                            snap1: !!session.violationSnapshot_1,
                            snap2: !!session.violationSnapshot_2,
                            violations: session.violations
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="text-green-400 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-green-400 font-bold">Tidak Ada Pelanggaran</p>
                    <p className="text-xs text-gray-400">Siswa mengerjakan dengan baik</p>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-bold text-lg">{session.studentInfo.name}</h4>
                <p className="text-sm text-gray-400">{session.studentInfo.nim}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span 
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      session.status === 'started' 
                        ? 'bg-blue-600' 
                        : session.status === 'finished' 
                        ? 'bg-green-600' 
                        : 'bg-red-600'
                    }`}
                  >
                    {session.status}
                  </span>
                  <span 
                    className={`font-bold text-lg ${
                      session.violations > 0 ? 'text-yellow-400' : ''
                    }`}
                  >
                    Pelanggaran: {session.violations}/3
                  </span>
                </div>
                {session.violations > 0 && (
                  <div className="mt-3 space-y-1">
                    {session.violationSnapshot_1?.imageData && (
                      <button 
                        onClick={() => viewSnapshot(session.violationSnapshot_1!, session.studentInfo.name)}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold py-1 px-2 rounded mb-1"
                      >
                        📸 Foto Pelanggaran 1: {session.violationSnapshot_1.violationType}
                      </button>
                    )}
                    {session.violationSnapshot_2?.imageData && (
                      <button 
                        onClick={() => viewSnapshot(session.violationSnapshot_2!, session.studentInfo.name)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded"
                      >
                        📸 Foto Pelanggaran 2: {session.violationSnapshot_2.violationType}
                      </button>
                    )}
                    {!session.violationSnapshot_1?.imageData && !session.violationSnapshot_2?.imageData && (
                      <div className="w-full bg-gray-600 text-white text-xs font-bold py-1 px-2 rounded text-center">
                        ⚠️ Foto pelanggaran tidak tersedia
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherProctoringDashboard;