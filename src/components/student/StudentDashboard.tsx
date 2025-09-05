import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, updateDoc, collectionGroup, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { db, appId } from '../../config/firebase';

interface StudentDashboardProps {
  user: any;
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  canGoBack: boolean;
}

interface ExamHistory {
  id: string;
  examName: string;
  examCode: string;
  status: string;
  finalScore?: number;
  violations: number;
  startTime: Date;
  finishTime?: Date;
}

interface Application {
  id: string;
  examName: string;
  examCode: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, navigateTo, navigateBack, canGoBack }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [examHistory, setExamHistory] = useState<ExamHistory[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  
  // Edit profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    major: '',
    className: '',
    university: '',
    whatsapp: '',
    password: '',
    confirmPassword: ''
  });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  
  // Profile photo states
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadStudentData();
      loadExamHistory();
      loadApplications();
    }
  }, [user?.id]);

  const loadStudentData = async () => {
    try {
      const studentsRef = collection(db, `artifacts/${appId}/public/data/students`);
      const q = query(studentsRef, where("username", "==", user.username), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0];
        const data = { id: studentDoc.id, ...studentDoc.data() };
        setStudentData(data);
        
        // Initialize edit form with current data
        setEditFormData({
          fullName: data.fullName || '',
          major: data.major || '',
          className: data.className || '',
          university: data.university || '',
          whatsapp: data.whatsapp || '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const loadExamHistory = async () => {
    try {
      // Use collection group query to get all sessions for this student
      const sessionsQuery = query(
        collectionGroup(db, 'sessions'),
        where('studentId', '==', user.id),
        orderBy('startTime', 'desc'),
        limit(50)
      );
      
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const history: ExamHistory[] = [];
      
      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionData = sessionDoc.data();
        
        // Extract exam ID from the document path
        const examId = sessionDoc.ref.parent.parent?.id;
        if (!examId) continue;
        
        // Get exam details
        const examDocRef = doc(db, `artifacts/${appId}/public/data/exams`, examId);
        try {
          const examSnapshot = await getDocs(query(collection(db, `artifacts/${appId}/public/data/exams`), where('__name__', '==', examId), limit(1)));
          if (!examSnapshot.empty) {
            const examData = examSnapshot.docs[0].data();
            
            history.push({
              id: sessionDoc.id,
              examName: examData.name || 'Unknown Exam',
              examCode: examData.code || 'N/A',
              status: sessionData.status || 'unknown',
              finalScore: sessionData.finalScore,
              violations: sessionData.violations || 0,
              startTime: sessionData.startTime?.toDate() || new Date(),
              finishTime: sessionData.finishTime?.toDate()
            });
          }
        } catch (examError) {
          console.error('Error loading exam details:', examError);
        }
      }
      
      setExamHistory(history);
    } catch (error) {
      console.error('Error loading exam history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      // This is a simplified version - in a real app you'd need to query across all exams
      // For now, we'll just show empty applications
      setApplications([]);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    setEditError('');
    setEditSuccess('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setEditError('File harus berupa gambar (JPG, PNG, GIF, dll.)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setEditError('Ukuran file maksimal 5MB');
        return;
      }
      
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setEditError('');
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 200x200)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.6);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadProfileImage = async (studentId: string): Promise<string | null> => {
    if (!profileImage) return null;
    
    try {
      setIsUploadingImage(true);
      
      // Compress image before upload
      const compressedImage = await compressImage(profileImage);
      
      const storage = getStorage();
      const imageRef = ref(storage, `profile-images/${studentId}/${Date.now()}_profile.jpg`);
      
      const snapshot = await uploadBytes(imageRef, compressedImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setIsUpdatingProfile(true);

    try {
      // Validate password if provided
      if (editFormData.password) {
        if (editFormData.password.length < 6) {
          setEditError('Password minimal 6 karakter');
          setIsUpdatingProfile(false);
          return;
        }
        
        if (editFormData.password !== editFormData.confirmPassword) {
          setEditError('Password tidak cocok');
          setIsUpdatingProfile(false);
          return;
        }
      }

      // Upload profile image if exists
      let profilePhotoURL = studentData?.profilePhoto || '';
      if (profileImage) {
        try {
          const uploadPromise = uploadProfileImage(studentData.id);
          const timeoutPromise = new Promise<string | null>((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout')), 120000)
          );
          
          const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
          if (uploadResult) {
            profilePhotoURL = uploadResult;
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          setEditError('Upload gambar gagal, tapi profil lainnya akan tetap diupdate');
        }
      }

      // Prepare update data
      const updateData: any = {
        fullName: editFormData.fullName,
        major: editFormData.major,
        className: editFormData.className,
        university: editFormData.university,
        whatsapp: editFormData.whatsapp,
        profilePhoto: profilePhotoURL,
        updatedAt: new Date()
      };

      // Add password if provided
      if (editFormData.password) {
        updateData.password = editFormData.password;
      }

      // Update student document
      const studentDocRef = doc(db, `artifacts/${appId}/public/data/students`, studentData.id);
      await updateDoc(studentDocRef, updateData);

      // Update local state
      setStudentData({ ...studentData, ...updateData });
      setEditSuccess('Profil berhasil diperbarui!');
      setIsEditingProfile(false);
      setProfileImage(null);
      setProfileImagePreview('');
      setEditFormData({ ...editFormData, password: '', confirmPassword: '' });

    } catch (error) {
      console.error('Error updating profile:', error);
      setEditError('Gagal memperbarui profil. Silakan coba lagi.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'finished': { color: 'bg-green-600', text: 'Selesai' },
      'started': { color: 'bg-blue-600', text: 'Sedang Berlangsung' },
      'disqualified': { color: 'bg-red-600', text: 'Diskualifikasi' },
      'pending': { color: 'bg-yellow-600', text: 'Menunggu' },
      'approved': { color: 'bg-green-600', text: 'Disetujui' },
      'rejected': { color: 'bg-red-600', text: 'Ditolak' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-600', text: status };
    
    return (
      <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-lg">Memuat data...</span>
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

      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Dashboard Siswa</h2>
        <p className="text-gray-400">Selamat datang, {studentData?.fullName || user?.username}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b border-gray-700">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`py-2 px-4 font-medium ${
            activeTab === 'dashboard' 
              ? 'border-b-2 border-indigo-500 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📊 Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          className={`py-2 px-4 font-medium ${
            activeTab === 'history' 
              ? 'border-b-2 border-indigo-500 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📚 Riwayat Ujian
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`py-2 px-4 font-medium ${
            activeTab === 'profile' 
              ? 'border-b-2 border-indigo-500 text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          👤 Profil
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4">🎯 Aksi Cepat</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => navigateTo('student_join', { currentUser: user })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-lg text-left"
              >
                <div className="text-lg">📝 Ikuti Ujian Baru</div>
                <div className="text-sm text-indigo-200">Masukkan kode ujian untuk bergabung</div>
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg text-left"
              >
                <div className="text-lg">📚 Lihat Riwayat</div>
                <div className="text-sm text-green-200">Cek hasil ujian sebelumnya</div>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-600 p-6 rounded-lg text-center">
              <div className="text-3xl font-bold">{examHistory.length}</div>
              <div className="text-blue-200">Total Ujian</div>
            </div>
            <div className="bg-green-600 p-6 rounded-lg text-center">
              <div className="text-3xl font-bold">
                {examHistory.filter(exam => exam.status === 'finished').length}
              </div>
              <div className="text-green-200">Ujian Selesai</div>
            </div>
            <div className="bg-yellow-600 p-6 rounded-lg text-center">
              <div className="text-3xl font-bold">
                {examHistory.filter(exam => exam.finalScore && exam.finalScore >= 70).length}
              </div>
              <div className="text-yellow-200">Nilai ≥ 70</div>
            </div>
          </div>

          {/* Recent Exams */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4">📋 Ujian Terbaru</h3>
            {examHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Belum ada riwayat ujian. Klik "Ikuti Ujian Baru" untuk memulai.
              </p>
            ) : (
              <div className="space-y-3">
                {examHistory.slice(0, 3).map(exam => (
                  <div key={exam.id} className="flex justify-between items-center p-4 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-bold">{exam.examName}</h4>
                      <p className="text-sm text-gray-400">
                        {exam.startTime.toLocaleDateString('id-ID')} • Kode: {exam.examCode}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(exam.status)}
                      {exam.finalScore !== undefined && (
                        <div className="text-lg font-bold mt-1">
                          Nilai: {exam.finalScore.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-bold mb-4">📚 Riwayat Ujian Lengkap</h3>
          {examHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-400 text-lg mb-4">Belum ada riwayat ujian</p>
              <button 
                onClick={() => navigateTo('student_join', { currentUser: user })}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
              >
                Ikuti Ujian Pertama
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="p-4">Nama Ujian</th>
                    <th className="p-4">Kode</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Pelanggaran</th>
                    <th className="p-4">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {examHistory.map(exam => (
                    <tr key={exam.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-4 font-semibold">{exam.examName}</td>
                      <td className="p-4 font-mono text-sm">{exam.examCode}</td>
                      <td className="p-4 text-sm">
                        {exam.startTime.toLocaleDateString('id-ID')}
                        <br />
                        <span className="text-gray-400">
                          {exam.startTime.toLocaleTimeString('id-ID', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </td>
                      <td className="p-4">{getStatusBadge(exam.status)}</td>
                      <td className="p-4">
                        <span className={`font-bold ${
                          exam.violations > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {exam.violations}/3
                        </span>
                      </td>
                      <td className="p-4">
                        {exam.finalScore !== undefined ? (
                          <span className={`font-bold text-lg ${
                            exam.finalScore >= 70 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {exam.finalScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">👤 Profil Saya</h3>
            <button 
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              {isEditingProfile ? 'Batal Edit' : 'Edit Profil'}
            </button>
          </div>

          {editSuccess && (
            <div className="mb-4 bg-green-900 border border-green-500 p-3 rounded-md">
              <p className="text-green-200">{editSuccess}</p>
            </div>
          )}

          {editError && (
            <div className="mb-4 bg-red-900 border border-red-500 p-3 rounded-md">
              <p className="text-red-200">{editError}</p>
            </div>
          )}

          {!isEditingProfile ? (
            // View Profile
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-center mb-6">
                  {studentData?.profilePhoto ? (
                    <img
                      src={studentData.profilePhoto}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-600"
                    />
                  ) : (
                    <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center mx-auto border-4 border-gray-600">
                      <span className="text-4xl font-bold text-white">
                        {(studentData?.fullName || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nama Lengkap</label>
                  <p className="text-white font-semibold">{studentData?.fullName || 'Tidak tersedia'}</p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-1">NIM</label>
                  <p className="text-white font-mono">{studentData?.nim || 'Tidak tersedia'}</p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                  <p className="text-white font-mono">{studentData?.username || 'Tidak tersedia'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Program Studi</label>
                  <p className="text-white">{studentData?.major || 'Tidak tersedia'}</p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Kelas</label>
                  <p className="text-white">{studentData?.className || 'Tidak tersedia'}</p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Universitas</label>
                  <p className="text-white">{studentData?.university || 'Tidak tersedia'}</p>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp</label>
                  <p className="text-white">{studentData?.whatsapp || 'Tidak tersedia'}</p>
                </div>
              </div>
            </div>
          ) : (
            // Edit Profile Form
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-600"
                      />
                    ) : studentData?.profilePhoto ? (
                      <img
                        src={studentData.profilePhoto}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-600"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center mx-auto border-4 border-gray-600">
                        <span className="text-4xl font-bold text-white">
                          {(editFormData.fullName || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Format: JPG, PNG, GIF. Maksimal 5MB.
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nama Lengkap</label>
                    <input
                      name="fullName"
                      type="text"
                      value={editFormData.fullName}
                      onChange={handleEditFormChange}
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Program Studi</label>
                    <input
                      name="major"
                      type="text"
                      value={editFormData.major}
                      onChange={handleEditFormChange}
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Kelas</label>
                    <input
                      name="className"
                      type="text"
                      value={editFormData.className}
                      onChange={handleEditFormChange}
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Universitas</label>
                    <input
                      name="university"
                      type="text"
                      value={editFormData.university}
                      onChange={handleEditFormChange}
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
                    <input
                      name="whatsapp"
                      type="tel"
                      value={editFormData.whatsapp}
                      onChange={handleEditFormChange}
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  
                  <div className="bg-yellow-900 border border-yellow-500 p-4 rounded-lg">
                    <h4 className="text-yellow-300 font-bold mb-2">🔐 Ubah Password (Opsional)</h4>
                    <p className="text-yellow-200 text-sm mb-3">Kosongkan jika tidak ingin mengubah password</p>
                    
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          name="password"
                          type={showEditPassword ? "text" : "password"}
                          value={editFormData.password}
                          onChange={handleEditFormChange}
                          placeholder="Password baru (minimal 6 karakter)"
                          className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 pr-12"
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
                      
                      <div className="relative">
                        <input
                          name="confirmPassword"
                          type={showEditConfirmPassword ? "text" : "password"}
                          value={editFormData.confirmPassword}
                          onChange={handleEditFormChange}
                          placeholder="Konfirmasi password baru"
                          className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 pr-12"
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
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileImage(null);
                    setProfileImagePreview('');
                    setEditError('');
                    setEditSuccess('');
                  }}
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile || isUploadingImage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:bg-indigo-400 flex items-center"
                >
                  {isUpdatingProfile ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isUploadingImage ? 'Mengupload...' : 'Menyimpan...'}
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;