import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, collectionGroup, orderBy, limit } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface StudentDashboardProps {
  user: any;
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  canGoBack: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, navigateTo, navigateBack, canGoBack }) => {
  const [view, setView] = useState('dashboard');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    nim: '',
    major: '',
    className: '',
    university: '',
    whatsapp: '',
    username: '',
    password: ''
  });
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [completedRetakeSessions, setCompletedRetakeSessions] = useState<Set<string>>(new Set());
  const [approvedRetakeExams, setApprovedRetakeExams] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setError('User data not found');
      setIsLoading(false);
      return;
    }

    const loadStudentData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Load student profile
        const studentsRef = collection(db, `artifacts/${appId}/public/data/students`);
        const studentQuery = query(studentsRef, where("__name__", "==", user.id), limit(1));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (!studentSnapshot.empty) {
          const studentData = studentSnapshot.docs[0].data();
          setProfileData({
            fullName: studentData.fullName || '',
            nim: studentData.nim || '',
            major: studentData.major || '',
            className: studentData.className || '',
            university: studentData.university || '',
            whatsapp: studentData.whatsapp || '',
            username: studentData.username || '',
            password: studentData.password || ''
          });
        }

        // Load exam history using collection group query
        const sessionsQuery = query(
          collectionGroup(db, 'sessions'),
          where('studentId', '==', user.id),
          orderBy('startTime', 'desc'),
          limit(50)
        );
        
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          examPath: doc.ref.parent.parent?.path || ''
        }));

        // Get exam details for each session
        const examHistoryWithDetails = await Promise.all(
          sessions.map(async (session) => {
            try {
              const examId = session.examPath.split('/').pop();
              if (!examId) return null;

              const examRef = collection(db, `artifacts/${appId}/public/data/exams`);
              const examQuery = query(examRef, where("__name__", "==", examId), limit(1));
              const examSnapshot = await getDocs(examQuery);
              
              if (!examSnapshot.empty) {
                const examData = examSnapshot.docs[0].data();
                return {
                  ...session,
                  examId: examId,
                  examName: examData.name || 'Unknown Exam',
                  examCode: examData.code || 'N/A',
                  examData: examData
                };
              }
              return null;
            } catch (error) {
              console.error('Error loading exam details:', error);
              return null;
            }
          })
        );

        const validHistory = examHistoryWithDetails.filter(item => item !== null);
        setExamHistory(validHistory);

        // Track completed retake sessions
        const retakeSessions = validHistory.filter(session => 
          session.isRetake && (session.status === 'finished' || session.status === 'disqualified')
        );
        const completedRetakeExamIds = new Set(retakeSessions.map(session => session.examId));
        setCompletedRetakeSessions(completedRetakeExamIds);

        // Load approved retake exams
        const loadApprovedRetakes = async () => {
          try {
            const examsRef = collection(db, `artifacts/${appId}/public/data/exams`);
            const examsSnapshot = await getDocs(examsRef);
            
            const approvedRetakes = [];
            
            for (const examDoc of examsSnapshot.docs) {
              const examData = examDoc.data();
              const examId = examDoc.id;
              
              // Check if student has approved retake application
              const applicationsRef = collection(db, `artifacts/${appId}/public/data/exams/${examId}/applications`);
              const applicationQuery = query(
                applicationsRef,
                where('studentId', '==', user.id),
                where('isRetake', '==', true),
                where('status', '==', 'approved'),
                limit(1)
              );
              
              const applicationSnapshot = await getDocs(applicationQuery);
              
              if (!applicationSnapshot.empty) {
                const applicationData = applicationSnapshot.docs[0].data();
                approvedRetakes.push({
                  examId: examId,
                  examData: examData,
                  applicationData: applicationData,
                  customSchedule: applicationData.customSchedule || null
                });
              }
            }
            
            setApprovedRetakeExams(approvedRetakes);
          } catch (error) {
            console.error('Error loading approved retakes:', error);
          }
        };

        await loadApprovedRetakes();

      } catch (error) {
        console.error('Error loading student data:', error);
        setError('Failed to load student data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudentData();
  }, [user?.id]);

  const handleEditProfile = () => {
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    // Profile saving logic would go here
    setEditingProfile(false);
    alert('Profile updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditingProfile(false);
  };

  const getStatusBadge = (session: any) => {
    if (session.isRetake && (session.status === 'finished' || session.status === 'disqualified')) {
      return (
        <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-600 text-white">
          Sudah Mengulang
        </span>
      );
    }
    
    switch (session.status) {
      case 'finished':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-600 text-white">
            Selesai
          </span>
        );
      case 'disqualified':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-600 text-white">
            Diskualifikasi
          </span>
        );
      case 'started':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-600 text-white">
            Sedang Ujian
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-600 text-white">
            {session.status}
          </span>
        );
    }
  };

  const getRetakeButtonForExam = (examId: string) => {
    // Check if student has already completed a retake for this exam
    if (completedRetakeSessions.has(examId)) {
      return (
        <button
          disabled
          className="bg-gray-600 text-gray-300 font-bold py-2 px-4 rounded-lg cursor-not-allowed"
        >
          ✅ Sudah Mengerjakan Ujian Ulang
        </button>
      );
    }

    // Check if student has pending retake application
    const hasPendingRetake = approvedRetakeExams.some(retake => retake.examId === examId);
    if (hasPendingRetake) {
      return (
        <button
          disabled
          className="bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg cursor-not-allowed"
        >
          ⏳ Permintaan Diajukan
        </button>
      );
    }

    return (
      <button
        onClick={() => navigateTo('student_join_exam', { examId })}
        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg"
      >
        🔄 Ajukan Ujian Ulang
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-800 border border-red-500 p-4 rounded-lg">
          <h3 className="text-red-400 font-bold mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {canGoBack && (
        <button 
          onClick={navigateBack} 
          className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          &larr; Kembali
        </button>
      )}
      
      <h2 className="text-3xl font-bold mb-6">Dashboard Siswa</h2>
      
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button 
          onClick={() => setView('dashboard')} 
          className={`py-2 px-4 ${view === 'dashboard' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setView('profile')} 
          className={`py-2 px-4 ${view === 'profile' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}
        >
          Edit Profil
        </button>
        <button 
          onClick={() => setView('join')} 
          className={`py-2 px-4 ${view === 'join' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}
        >
          Gabung Ujian
        </button>
      </div>

      {view === 'dashboard' && (
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-2xl font-bold mb-2">Selamat Datang, {profileData.fullName || user.username}!</h3>
            <p className="text-gray-400">NIM: {profileData.nim}</p>
            <p className="text-gray-400">Program Studi: {profileData.major}</p>
            <p className="text-gray-400">Kelas: {profileData.className}</p>
          </div>

          {/* Approved Retake Exams Section */}
          {approvedRetakeExams.length > 0 && (
            <div className="bg-purple-900 border border-purple-500 p-6 rounded-lg shadow-xl">
              <h3 className="text-xl font-bold mb-4 text-purple-300">🔄 Ujian Ulang Disetujui</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {approvedRetakeExams.map((retake) => {
                  const hasCompletedRetake = completedRetakeSessions.has(retake.examId);
                  const effectiveStartTime = retake.customSchedule?.startTime || retake.examData.startTime;
                  const effectiveEndTime = retake.customSchedule?.endTime || retake.examData.endTime;
                  const now = new Date();
                  const startTime = new Date(effectiveStartTime);
                  const endTime = new Date(effectiveEndTime);
                  
                  return (
                    <div key={retake.examId} className="bg-purple-800 border border-purple-400 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-white">{retake.examData.name}</h4>
                          <p className="text-purple-200 text-sm">Kode: {retake.examData.code}</p>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-purple-600 text-white">
                            UJIAN ULANG
                          </span>
                          {retake.customSchedule && (
                            <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-600 text-white">
                              JADWAL KHUSUS
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-purple-200 mb-3">
                        <p><strong>Mulai:</strong> {startTime.toLocaleString('id-ID')}</p>
                        <p><strong>Selesai:</strong> {endTime.toLocaleString('id-ID')}</p>
                      </div>
                      
                      <div className="mt-3">
                        {hasCompletedRetake ? (
                          <button
                            disabled
                            className="w-full bg-gray-600 text-gray-300 font-bold py-2 px-4 rounded-lg cursor-not-allowed"
                          >
                            ✅ Sudah Mengerjakan Ujian Ulang
                          </button>
                        ) : now < startTime ? (
                          <div className="w-full bg-blue-800 border border-blue-500 text-blue-200 font-bold py-2 px-4 rounded-lg text-center">
                            ⏰ Ujian Belum Dimulai
                          </div>
                        ) : now > endTime ? (
                          <div className="w-full bg-gray-700 border border-gray-500 text-gray-300 font-bold py-2 px-4 rounded-lg text-center">
                            ⏰ Ujian Sudah Berakhir
                          </div>
                        ) : (
                          <button
                            onClick={() => navigateTo('student_precheck', { 
                              exam: {
                                ...retake.examData,
                                id: retake.examId,
                                startTime: effectiveStartTime,
                                endTime: effectiveEndTime
                              },
                              isRetake: true
                            })}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
                          >
                            🔄 Mulai Ujian Ulang Sekarang
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exam History */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4">Riwayat Ujian</h3>
            {examHistory.length === 0 ? (
              <p className="text-gray-400">Belum ada riwayat ujian.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="p-3">Nama Ujian</th>
                      <th className="p-3">Kode</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Nilai</th>
                      <th className="p-3">Pelanggaran</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examHistory.map((session) => (
                      <tr key={session.id} className="border-b border-gray-700">
                        <td className="p-3 font-semibold">{session.examName}</td>
                        <td className="p-3 text-gray-400">{session.examCode}</td>
                        <td className="p-3 text-gray-400">
                          {session.startTime ? new Date(session.startTime.seconds * 1000).toLocaleDateString('id-ID') : 'N/A'}
                        </td>
                        <td className="p-3">{getStatusBadge(session)}</td>
                        <td className="p-3">
                          {session.finalScore !== null && session.finalScore !== undefined 
                            ? session.finalScore.toFixed(2) 
                            : 'N/A'}
                        </td>
                        <td className="p-3">{session.violations || 0}</td>
                        <td className="p-3">
                          {session.status === 'disqualified' && !session.isRetake && (
                            getRetakeButtonForExam(session.examId)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'profile' && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-bold mb-4">Edit Profil</h3>
          {editingProfile ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                  placeholder="Nama Lengkap"
                  className="p-3 bg-gray-700 rounded-md border border-gray-600"
                />
                <input
                  type="text"
                  value={profileData.nim}
                  onChange={(e) => setProfileData({...profileData, nim: e.target.value})}
                  placeholder="NIM"
                  className="p-3 bg-gray-700 rounded-md border border-gray-600"
                />
                <input
                  type="text"
                  value={profileData.major}
                  onChange={(e) => setProfileData({...profileData, major: e.target.value})}
                  placeholder="Program Studi"
                  className="p-3 bg-gray-700 rounded-md border border-gray-600"
                />
                <input
                  type="text"
                  value={profileData.className}
                  onChange={(e) => setProfileData({...profileData, className: e.target.value})}
                  placeholder="Kelas"
                  className="p-3 bg-gray-700 rounded-md border border-gray-600"
                />
                <input
                  type="text"
                  value={profileData.university}
                  onChange={(e) => setProfileData({...profileData, university: e.target.value})}
                  placeholder="Universitas"
                  className="p-3 bg-gray-700 rounded-md border border-gray-600"
                />
                <input
                  type="text"
                  value={profileData.whatsapp}
                  onChange={(e) => setProfileData({...profileData, whatsapp: e.target.value})}
                  placeholder="WhatsApp"
                  className="p-3 bg-gray-700 rounded-md border border-gray-600"
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleSaveProfile}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Simpan
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nama Lengkap</label>
                  <p className="p-3 bg-gray-700 rounded-md">{profileData.fullName || 'Belum diisi'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">NIM</label>
                  <p className="p-3 bg-gray-700 rounded-md">{profileData.nim || 'Belum diisi'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Program Studi</label>
                  <p className="p-3 bg-gray-700 rounded-md">{profileData.major || 'Belum diisi'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Kelas</label>
                  <p className="p-3 bg-gray-700 rounded-md">{profileData.className || 'Belum diisi'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Universitas</label>
                  <p className="p-3 bg-gray-700 rounded-md">{profileData.university || 'Belum diisi'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp</label>
                  <p className="p-3 bg-gray-700 rounded-md">{profileData.whatsapp || 'Belum diisi'}</p>
                </div>
              </div>
              <button
                onClick={handleEditProfile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Edit Profil
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'join' && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-bold mb-4">Gabung Ujian</h3>
          <button
            onClick={() => navigateTo('student_join', { currentUser: user })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            Masukkan Kode Ujian
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;