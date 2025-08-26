import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
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
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    nim: '',
    major: '',
    className: '',
    university: '',
    whatsapp: '',
    password: '',
    confirmPassword: ''
  });
  const [editError, setEditError] = useState('');
  const [editValidationErrors, setEditValidationErrors] = useState<{[key: string]: string}>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check if user and user.id exist
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    // Get student profile
    const getStudentProfile = async () => {
      const studentDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/students`, user.id));
      if (studentDoc.exists()) {
        const profileData = studentDoc.data();
        setStudentProfile(profileData);
        // Initialize edit form with current data
        setEditFormData({
          fullName: profileData.fullName || '',
          nim: profileData.nim || '',
          major: profileData.major || '',
          className: profileData.className || '',
          university: profileData.university || '',
          whatsapp: profileData.whatsapp || '',
          password: '',
          confirmPassword: ''
        });
      }
    };

    getStudentProfile();

    // Get exam results and available exams
    const getExamResults = async () => {
      try {
        const results: ExamResult[] = [];
        const available: any[] = [];
        const pending: any[] = [];
        const rejected: any[] = [];
        
        // Get all exams
        const examsSnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/exams`));
        
        // For each exam, check if student has a session
        for (const examDoc of examsSnapshot.docs) {
          const examData = examDoc.data();
          const examId = examDoc.id;
          
          // Get sessions for this exam where studentId matches
          const sessionsQuery = query(
            collection(db, `artifacts/${appId}/public/data/exams/${examId}/sessions`),
            where('studentId', '==', user.id)
          );
          
          const sessionsSnapshot = await getDocs(sessionsQuery);
          
          let hasSession = false;
          let hasCompletedSession = false;
          sessionsSnapshot.forEach(sessionDoc => {
            hasSession = true;
            const sessionData = sessionDoc.data();
            
            // Check if session is completed (finished or disqualified)
            if (['finished', 'disqualified'].includes(sessionData.status)) {
              hasCompletedSession = true;
            }
            
            // Include all sessions (finished, disqualified, started)
            if (['finished', 'disqualified'].includes(sessionData.status)) {
              // Calculate essay score if available
              let essayScore = undefined;
              let totalScore = undefined;
              
              if (sessionData.essayScores) {
                const essayScores = Object.values(sessionData.essayScores);
                if (essayScores.length > 0) {
                  essayScore = essayScores.reduce((sum: number, score: number) => sum + score, 0) / essayScores.length;
                  
                  // Calculate total score (50% MC + 50% Essay)
                  const mcScore = sessionData.finalScore || 0;
                  totalScore = (mcScore * 0.5) + (essayScore * 0.5);
                }
              }
              
              results.push({
                id: sessionDoc.id,
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
          
          // Only allow access if student has NOT completed this exam
          if (!hasCompletedSession) {
            const applicationsQuery = query(
              collection(db, `artifacts/${appId}/public/data/exams/${examId}/applications`),
              where('studentId', '==', user.id),
              where('status', 'in', ['approved', 'pending', 'rejected'])
            );
            
            const applicationsSnapshot = await getDocs(applicationsQuery);
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
              
              // Only show approved exams if student hasn't completed them
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
          }
        }
        
        setExamResults(results.sort((a, b) => {
          // Sort by finish time, with unfinished exams first
          if (!a.finishTime && !b.finishTime) return 0;
          if (!a.finishTime) return -1;
          if (!b.finishTime) return 1;
          return b.finishTime.getTime() - a.finishTime.getTime();
        }));
        setAvailableExams(available);
        setPendingApplications(pending.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()));
        setRejectedApplications(rejected.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime()));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching exam results:', error);
        setExamResults([]);
        setIsLoading(false);
      }
    };

    getExamResults();
  }, [user?.id]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    // Clear validation error when user starts typing
    if (editValidationErrors[e.target.name]) {
      setEditValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
  };

  const validateUniqueNIM = async () => {
    // Only validate if NIM has changed
    if (editFormData.nim === studentProfile?.nim) {
      return {};
    }

    const studentsRef = collection(db, `artifacts/${appId}/public/data/students`);
    const errors: {[key: string]: string} = {};
    
    // Check for duplicate NIM (excluding current user)
    const nimQuery = query(studentsRef, where("nim", "==", editFormData.nim));
    const nimSnapshot = await getDocs(nimQuery);
    
    // Check if any document found is not the current user
    const duplicateNIM = nimSnapshot.docs.find(doc => doc.id !== user.id);
    if (duplicateNIM) {
      errors.nim = "NIM/NIS sudah terdaftar oleh siswa lain. Gunakan NIM/NIS yang berbeda.";
    }
    
    return errors;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditValidationErrors({});
    setIsUpdating(true);

    // Validate password if provided
    if (editFormData.password && editFormData.password !== editFormData.confirmPassword) {
      setEditError('Password tidak cocok');
      setIsUpdating(false);
      return;
    }

    if (editFormData.password && editFormData.password.length < 6) {
      setEditError('Password minimal 6 karakter');
      setIsUpdating(false);
      return;
    }

    try {
      // Validate unique NIM
      const uniqueFieldErrors = await validateUniqueNIM();
      if (Object.keys(uniqueFieldErrors).length > 0) {
        setEditValidationErrors(uniqueFieldErrors);
        setIsUpdating(false);
        return;
      }

      // Prepare update data
      const updateData: any = {
        fullName: editFormData.fullName,
        nim: editFormData.nim,
        major: editFormData.major,
        className: editFormData.className,
        university: editFormData.university,
        whatsapp: editFormData.whatsapp,
        updatedAt: new Date()
      };

      // Only update password if provided
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      // Update in Firestore
      await updateDoc(doc(db, `artifacts/${appId}/public/data/students`, user.id), updateData);

      // Update local state
      const updatedProfile = { ...studentProfile, ...updateData };
      setStudentProfile(updatedProfile);
      
      // Reset form
      setEditFormData({
        ...editFormData,
        whatsapp: updatedProfile.whatsapp || '',
        password: '',
        confirmPassword: ''
      });
      
      setShowEditProfile(false);
      alert('Profil berhasil diperbarui!');
    } catch (error: any) {
      setEditError('Gagal memperbarui profil. Silakan coba lagi.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8">Memuat dashboard...</div>;
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {studentProfile.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{studentProfile.fullName}</h3>
                  <p className="text-gray-400">{studentProfile.major} - {studentProfile.className}</p>
                  <p className="text-gray-400">NIM/NIS: {studentProfile.nim || 'N/A'}</p>
                  <p className="text-gray-400">{studentProfile.university}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditProfile(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Edit Profil
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Edit Profil</h3>
              <button
                onClick={() => {
                  setShowEditProfile(false);
                  setEditError('');
                  setEditValidationErrors({});
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Important Notes */}
            <div className="mb-6 bg-yellow-900 border border-yellow-500 p-4 rounded-lg">
              <h4 className="text-yellow-300 font-bold mb-2">⚠️ Catatan Penting:</h4>
              <ul className="text-yellow-200 text-sm space-y-1">
                <li>• NIM/NIS harus unik dan tidak boleh sama dengan siswa lain</li>
                <li>• Username tidak dapat diubah setelah registrasi</li>
                <li>• Password baru minimal 6 karakter (kosongkan jika tidak ingin mengubah)</li>
                <li>• Pastikan semua data yang dimasukkan benar dan valid</li>
              </ul>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Personal Data */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">Data Pribadi</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nama Lengkap</label>
                    <input 
                      name="fullName" 
                      type="text"
                      value={editFormData.fullName}
                      onChange={handleEditChange} 
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Program Studi/Jurusan</label>
                    <input 
                      name="major" 
                      type="text"
                      value={editFormData.major}
                      onChange={handleEditChange} 
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Kelas</label>
                    <input 
                      name="className" 
                      type="text"
                      value={editFormData.className}
                      onChange={handleEditChange} 
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Universitas/Sekolah</label>
                    <input 
                      name="university" 
                      type="text"
                      value={editFormData.university}
                      onChange={handleEditChange} 
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      required 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nomor WhatsApp</label>
                    <input 
                      name="whatsapp" 
                      type="tel"
                      value={editFormData.whatsapp}
                      onChange={handleEditChange} 
                      placeholder="08123456789"
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                      required 
                    />
                  </div>
                </div>
                
                {/* Right Column - Account Data */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">Data Akun</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">NIM/NIS (Nomor Induk)</label>
                    <input 
                      name="nim" 
                      type="text"
                      value={editFormData.nim}
                      onChange={handleEditChange} 
                      className={`w-full p-3 bg-gray-700 rounded-md border ${
                        editValidationErrors.nim ? 'border-red-500' : 'border-gray-600'
                      } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      required 
                    />
                    {editValidationErrors.nim && (
                      <p className="text-red-400 text-xs mt-1">{editValidationErrors.nim}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                    <input 
                      type="text"
                      value={studentProfile.username}
                      className="w-full p-3 bg-gray-600 rounded-md border border-gray-500 text-gray-400 cursor-not-allowed" 
                      disabled
                    />
                    <p className="text-xs text-gray-400 mt-1">Username tidak dapat diubah</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Password Baru (Opsional)</label>
                    <input 
                      name="password" 
                      type="password"
                      value={editFormData.password}
                      onChange={handleEditChange} 
                      placeholder="Kosongkan jika tidak ingin mengubah password"
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Konfirmasi Password Baru</label>
                    <input 
                      name="confirmPassword" 
                      type="password"
                      value={editFormData.confirmPassword}
                      onChange={handleEditChange} 
                      placeholder="Konfirmasi password baru"
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>
              </div>
              
              {editError && <p className="text-red-500 text-sm">{editError}</p>}
              
              <div className="flex justify-end space-x-4 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditProfile(false);
                    setEditError('');
                    setEditValidationErrors({});
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-indigo-400"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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