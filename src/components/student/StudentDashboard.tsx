import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit, updateDoc, doc } from 'firebase/firestore';
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

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, navigateTo, navigateBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
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
  const [editValidationErrors, setEditValidationErrors] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        // Fetch student profile
        const studentsQuery = query(
          collection(db, `artifacts/${appId}/public/data/students`),
          where('id', '==', user.id),
          limit(1)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        if (!studentsSnapshot.empty) {
          const studentDoc = studentsSnapshot.docs[0];
          const studentData = { id: studentDoc.id, ...studentDoc.data() };
          setStudentProfile(studentData);
          
          // Initialize edit form with current data
          setEditFormData({
            fullName: studentData.fullName || '',
            nim: studentData.nim || '',
            major: studentData.major || '',
            className: studentData.className || '',
            university: studentData.university || '',
            whatsapp: studentData.whatsapp || '',
            password: '',
            confirmPassword: ''
          });
        }

        // Fetch pending exam applications
        const examsQuery = query(
          collection(db, `artifacts/${appId}/public/data/exams`),
          where('applicants', 'array-contains', user.id)
        );
        const examsSnapshot = await getDocs(examsQuery);
        
        const pending: any[] = [];
        examsSnapshot.forEach(doc => {
          const examData = doc.data();
          const applicantData = examData.applicantDetails?.[user.id];
          
          if (applicantData && applicantData.status === 'pending') {
            pending.push({
              id: doc.id,
              ...examData,
              appliedAt: applicantData.appliedAt?.toDate() || new Date(),
              hasCompletedSession: examData.completedSessions?.includes(user.id) || false
            });
          }
        });
        
        setPendingApplications(pending);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [user.id]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateUniqueNIM = async () => {
    const errors: any = {};
    
    try {
      // Check if NIM is unique (excluding current user)
      const nimQuery = query(
        collection(db, `artifacts/${appId}/public/data/students`),
        where('nim', '==', editFormData.nim)
      );
      const nimSnapshot = await getDocs(nimQuery);
      
      if (!nimSnapshot.empty) {
        const existingDoc = nimSnapshot.docs[0];
        if (existingDoc.id !== user.id) {
          errors.nim = 'NIM/NIS sudah digunakan oleh siswa lain';
        }
      }
    } catch (error) {
      console.error('Error validating unique fields:', error);
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

      {/* Aplikasi Menunggu Konfirmasi (Pending) */}
      {pendingApplications.length > 0 && (
        <div className="mb-6 bg-yellow-800 border border-yellow-500 p-6 rounded-lg shadow-lg">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mr-4">
              <span className="text-2xl">⏳</span>
            </div>
            <div>
              <h4 className="text-xl font-bold text-yellow-400">
                {pendingApplications.length === 1 ? 'Menunggu Konfirmasi Dosen' : `${pendingApplications.length} Ujian Menunggu Konfirmasi`}
              </h4>
              <p className="text-yellow-200 text-sm">
                {pendingApplications.length === 1 
                  ? 'Aplikasi ujian yang sedang menunggu persetujuan dosen'
                  : 'Beberapa aplikasi ujian sedang menunggu persetujuan dosen'
                }
              </p>
            </div>
          </div>
          <div className={`grid gap-4 ${
            pendingApplications.length === 1 
              ? 'grid-cols-1' 
              : pendingApplications.length === 2 
              ? 'grid-cols-1 md:grid-cols-2' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {pendingApplications.map(exam => (
              <div key={exam.id} className="bg-gray-700 p-4 rounded-lg border border-yellow-400">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-grow">
                    <h5 className="font-bold text-lg text-white">{exam.name}</h5>
                    <p className="text-gray-300 text-sm">Kode: <span className="font-mono bg-gray-600 px-2 py-1 rounded">{exam.code}</span></p>
                    <div className="mt-2 text-xs text-gray-400">
                      <p>📅 Diajukan: {exam.appliedAt.toLocaleString('id-ID')}</p>
                      <p>📅 Mulai: {new Date(exam.startTime).toLocaleString('id-ID')}</p>
                      <p>⏰ Selesai: {new Date(exam.endTime).toLocaleString('id-ID')}</p>
                      <p>⏱️ Durasi: {Math.round((new Date(exam.endTime).getTime() - new Date(exam.startTime).getTime()) / (1000 * 60))} menit</p>
                      {exam.hasCompletedSession && (
                        <p className="text-green-400 text-xs mt-1">✅ Sudah pernah mengikuti ujian ini</p>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-600 text-white">
                    ⏳ MENUNGGU
                  </span>
                </div>
                <div className="bg-yellow-900 border border-yellow-600 p-3 rounded-md">
                  <p className="text-yellow-200 text-sm text-center">
                    💡 Menunggu persetujuan dari dosen. Silakan tunggu konfirmasi.
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary for multiple pending */}
          {pendingApplications.length > 1 && (
            <div className="mt-4 bg-yellow-900 border border-yellow-600 p-3 rounded-md">
              <p className="text-yellow-200 text-sm text-center">
                📋 <strong>Total:</strong> {pendingApplications.length} aplikasi ujian sedang menunggu konfirmasi dosen.
                Anda akan mendapat notifikasi setelah dosen memproses aplikasi Anda.
              </p>
            </div>
          )}
        </div>
      )}

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
                      value={user.username}
                      disabled
                      className="w-full p-3 bg-gray-600 rounded-md border border-gray-500 text-gray-400 cursor-not-allowed" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Username tidak dapat diubah</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Password Baru (Opsional)</label>
                    <div className="relative">
                      <input 
                        name="password" 
                        type={showEditPassword ? "text" : "password"}
                        value={editFormData.password}
                        onChange={handleEditChange} 
                        placeholder="Kosongkan jika tidak ingin mengubah"
                        className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                      >
                        {showEditPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <input 
                        name="confirmPassword" 
                        type={showEditConfirmPassword ? "text" : "password"}
                        value={editFormData.confirmPassword}
                        onChange={handleEditChange} 
                        placeholder="Ulangi password baru"
                        className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                      >
                        {showEditConfirmPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {editError && (
                <div className="bg-red-900 border border-red-500 p-3 rounded-md">
                  <p className="text-red-200 text-sm">{editError}</p>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-6">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditProfile(false);
                    setEditError('');
                    setEditValidationErrors({});
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50"
                >
                  {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h2 className="text-3xl font-bold mb-6">Dashboard Siswa</h2>
      <p className="text-lg text-gray-400 mb-8">
        Selamat datang, <span className="text-indigo-400 font-semibold">{user?.fullName || 'Siswa'}</span>
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => navigateTo('student_join', { currentUser: user })} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 px-8 rounded-lg text-xl shadow-lg transition-transform transform hover:scale-105"
        >
          📝 Gabung Ujian
        </button>
        <button 
          onClick={() => alert('Fitur riwayat ujian akan segera hadir!')} 
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-6 px-8 rounded-lg text-xl shadow-lg transition-transform transform hover:scale-105"
        >
          📊 Riwayat Ujian
        </button>
      </div>
    </div>
  );
};

export default StudentDashboard;