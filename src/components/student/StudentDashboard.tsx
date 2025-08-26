import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, collectionGroup } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface CustomUser {
  id: string;
  username: string;
  role: string;
  [key: string]: any;
}

interface StudentDashboardProps {
  user: CustomUser;
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
}

interface ExamResult {
  id: string;
  examName: string;
  finalScore: number;
  finishTime: Date;
  status: string;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, navigateTo, navigateBack }) => {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableExams, setAvailableExams] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [rejectedApplications, setRejectedApplications] = useState<any[]>([]);

  // Cache for student profile to avoid repeated fetches
  const [profileCache, setProfileCache] = useState<any>(null);

  useEffect(() => {
    // Check if user and user.id exist
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    // Optimized data fetching with concurrent operations
    const loadDashboardData = async () => {
      try {
        // Start all operations concurrently
        const [studentProfilePromise, examsPromise, sessionsPromise] = await Promise.allSettled([
          // Get student profile (cached)
          profileCache ? Promise.resolve(profileCache) : getDoc(doc(db, `artifacts/${appId}/public/data/students`, user.id)),
          // Get all exams
          getDocs(collection(db, `artifacts/${appId}/public/data/exams`)),
          // Get all sessions for this student using collection group query
          getDocs(query(collectionGroup(db, 'sessions'), where('studentId', '==', user.id)))
        ]);

        // Process student profile
        if (studentProfilePromise.status === 'fulfilled') {
          const profileData = profileCache || (studentProfilePromise.value.exists() ? studentProfilePromise.value.data() : null);
          if (profileData && !profileCache) {
            setProfileCache(profileData);
          }
          setStudentProfile(profileData);
        }

        // Process results concurrently
        const results: ExamResult[] = [];
        const available: any[] = [];
        const pending: any[] = [];
        const rejected: any[] = [];

        if (examsPromise.status === 'fulfilled' && sessionsPromise.status === 'fulfilled') {
          const examsSnapshot = examsPromise.value;
          const sessionsSnapshot = sessionsPromise.value;

          // Create a map of sessions by examId for faster lookup
          const sessionsByExam = new Map();
          sessionsSnapshot.docs.forEach(sessionDoc => {
            const sessionData = sessionDoc.data();
            const examId = sessionDoc.ref.parent.parent?.id;
            if (examId) {
              if (!sessionsByExam.has(examId)) {
                sessionsByExam.set(examId, []);
              }
              sessionsByExam.get(examId).push({ id: sessionDoc.id, ...sessionData });
            }
          });

          // Process exams and applications concurrently
          const examProcessingPromises = examsSnapshot.docs.map(async (examDoc) => {
            const examData = examDoc.data();
            const examId = examDoc.id;
            const examSessions = sessionsByExam.get(examId) || [];

            // Process sessions for this exam
            examSessions.forEach(sessionData => {
              if (['finished', 'disqualified', 'started'].includes(sessionData.status)) {
                let essayScore = undefined;
                let totalScore = undefined;
                
                if (sessionData.essayScores) {
                  const essayScores = Object.values(sessionData.essayScores);
                  if (essayScores.length > 0) {
                    essayScore = essayScores.reduce((sum: number, score: number) => sum + score, 0) / essayScores.length;
                    const mcScore = sessionData.finalScore || 0;
                    totalScore = (mcScore * 0.5) + (essayScore * 0.5);
                  }
                }
                
                results.push({
                  id: sessionData.id,
                  examName: examData.name || 'Unknown Exam',
                  examCode: examData.code,
                  finalScore: sessionData.finalScore || 0,
                  essayScore,
                  totalScore,
                  finishTime: sessionData.finishTime?.toDate() || new Date(),
                  status: sessionData.status
                });
              }
            });

            // Check applications only if no sessions exist
            if (examSessions.length === 0) {
              try {
                const applicationsSnapshot = await getDocs(
                  query(
                    collection(db, `artifacts/${appId}/public/data/exams/${examId}/applications`),
                    where('studentId', '==', user.id)
                  )
                );
                
                applicationsSnapshot.forEach(appDoc => {
                  const appData = appDoc.data();
                  const examWithApp = {
                    id: examId,
                    name: examData.name,
                    code: examData.code,
                    applicationStatus: appData.status,
                    appliedAt: appData.appliedAt?.toDate() || new Date(),
                    ...examData
                  };
                  
                  if (appData.status === 'approved') {
                    const now = new Date();
                    const startTime = new Date(examData.startTime);
                    const endTime = new Date(examData.endTime);
                    
                    if (now >= startTime && now <= endTime && examData.status === 'published') {
                      available.push(examWithApp);
                    }
                  } else if (appData.status === 'pending') {
                    pending.push(examWithApp);
                  } else if (appData.status === 'rejected') {
                    rejected.push(examWithApp);
                  }
                });
              } catch (error) {
                console.warn(`Failed to fetch applications for exam ${examId}:`, error);
              }
            }
          });

          // Wait for all exam processing to complete
          await Promise.allSettled(examProcessingPromises);
        }

        // Update state with processed data
        setExamResults(results.sort((a, b) => {
          if (!a.finishTime && !b.finishTime) return 0;
          if (!a.finishTime) return -1;
          if (!b.finishTime) return 1;
          return b.finishTime.getTime() - a.finishTime.getTime();
        }));
        
        setAvailableExams(available);
        setPendingApplications(pending.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()));
        setRejectedApplications(rejected.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()));
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setExamResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Start loading immediately
    loadDashboardData();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.id) {
    return <div className="text-center p-8 text-red-400">Error: User data tidak valid</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={navigateBack} 
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          &larr; Kembali
        </button>
        <button 
          onClick={() => navigateTo('home')} 
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          Logout
        </button>
      </div>
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4">Dashboard Siswa</h2>
        {studentProfile && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {studentProfile.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{studentProfile.fullName}</h3>
                <p className="text-gray-400">{studentProfile.major} - {studentProfile.className}</p>
                <p className="text-gray-400">{studentProfile.university}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold">Riwayat Ujian</h3>
        <div className="flex space-x-4">
          <button 
            onClick={() => navigateTo('student_join_exam', { currentUser: user })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Ajukan Ujian
          </button>
          {availableExams.length > 0 && (
            <button 
              onClick={() => navigateTo('student_precheck', { exam: availableExams[0], currentUser: user })}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Mulai Ujian ({availableExams.length})
            </button>
          )}
        </div>
      </div>

      {availableExams.length > 0 && (
        <div className="mb-6 bg-green-800 border border-green-500 p-4 rounded-lg">
          <h4 className="text-lg font-bold text-green-400 mb-2">🎯 Ujian Siap Dimulai</h4>
          <div className="space-y-2">
            {availableExams.map(exam => (
              <div key={exam.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                <div>
                  <span className="font-bold">{exam.name}</span>
                  <span className="text-gray-400 ml-2">({exam.code})</span>
                </div>
                <button
                  onClick={() => navigateTo('student_precheck', { exam, currentUser: user })}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm"
                >
                  Mulai
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Applications Section */}
      {pendingApplications.length > 0 && (
        <div className="mb-6 bg-yellow-800 border border-yellow-500 p-4 rounded-lg">
          <h4 className="text-lg font-bold text-yellow-400 mb-3">⏳ Aplikasi Ujian Menunggu Konfirmasi</h4>
          <div className="space-y-2">
            {pendingApplications.map(exam => (
              <div key={exam.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                <div>
                  <span className="font-bold">{exam.name}</span>
                  <span className="text-gray-400 ml-2">({exam.code})</span>
                  <div className="text-xs text-gray-400 mt-1">
                    Diajukan: {exam.appliedAt.toLocaleString('id-ID')}
                  </div>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-600 text-white">
                  Menunggu Konfirmasi
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-300 mt-3">
            💡 Aplikasi Anda sedang menunggu persetujuan dari dosen. Silakan tunggu hingga dosen mengkonfirmasi.
          </p>
        </div>
      )}

      {/* Rejected Applications Section */}
      {rejectedApplications.length > 0 && (
        <div className="mb-6 bg-red-800 border border-red-500 p-4 rounded-lg">
          <h4 className="text-lg font-bold text-red-400 mb-3">❌ Aplikasi Ujian Ditolak</h4>
          <div className="space-y-2">
            {rejectedApplications.map(exam => (
              <div key={exam.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                <div>
                  <span className="font-bold">{exam.name}</span>
                  <span className="text-gray-400 ml-2">({exam.code})</span>
                  <div className="text-xs text-gray-400 mt-1">
                    Diajukan: {exam.appliedAt.toLocaleString('id-ID')}
                  </div>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-600 text-white">
                  Ditolak
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-300 mt-3">
            💬 Aplikasi ujian Anda telah ditolak. Silakan hubungi dosen untuk informasi lebih lanjut atau ajukan ujian lain.
          </p>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {examResults.length === 0 ? (
          <div className="text-center p-8 text-gray-400">
            <p className="text-lg mb-4">Belum ada riwayat ujian</p>
            <button 
              onClick={() => navigateTo('student_join_exam', { currentUser: user })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Ajukan Ujian Pertama
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-4">Nama Ujian</th>
                <th className="p-4">Kode Ujian</th>
                <th className="p-4">Nilai PG</th>
                <th className="p-4">Nilai Essay</th>
                <th className="p-4">Nilai Akhir</th>
                <th className="p-4">Status</th>
                <th className="p-4">Waktu Selesai</th>
              </tr>
            </thead>
            <tbody>
              {examResults.map(result => (
                <tr key={result.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4 font-semibold">{result.examName}</td>
                  <td className="p-4 text-gray-400 font-mono">{result.examCode || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`font-bold ${
                      result.status === 'disqualified' 
                        ? 'text-red-400' 
                        : result.finalScore >= 70 
                        ? 'text-green-400' 
                        : result.finalScore >= 60 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                    }`}>
                      {result.finalScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-300">
                      {result.essayScore !== undefined ? result.essayScore.toFixed(2) : 'N/A'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-bold ${
                      result.status === 'disqualified' 
                        ? 'text-red-400' 
                        : (result.totalScore || result.finalScore) >= 70 
                        ? 'text-green-400' 
                        : (result.totalScore || result.finalScore) >= 60 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                    }`}>
                      {result.totalScore ? result.totalScore.toFixed(2) : result.finalScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      result.status === 'finished' 
                        ? 'bg-green-600 text-white' 
                        : result.status === 'disqualified'
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}>
                      {result.status === 'finished' ? 'Selesai' : 
                       result.status === 'disqualified' ? 'Diskualifikasi' : 
                       result.status === 'started' ? 'Sedang Berlangsung' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">
                    {result.finishTime ? result.finishTime.toLocaleString('id-ID') : 'Belum selesai'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;