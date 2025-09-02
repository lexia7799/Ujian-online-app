import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import CreateExamForm from './CreateExamForm';
import StudentConfirmation from './StudentConfirmation';
import TeacherResultsDashboard from './TeacherResultsDashboard';
import TeacherProctoringDashboard from './TeacherProctoringDashboard';
import QuestionManager from './QuestionManager';

interface TeacherDashboardProps {
  user?: any;
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  canGoBack: boolean;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, navigateTo, navigateBack, canGoBack }) => {
  const [view, setView] = useState('search');
  const [currentView, setCurrentView] = useState<'main' | 'student_confirmation' | 'teacher_results' | 'teacher_proctoring' | 'question_manager'>('main');
  const [searchCode, setSearchCode] = useState('');
  const [foundExam, setFoundExam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [currentExam, setCurrentExam] = useState<any>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSearchExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setFoundExam(null);
    setIsVerified(false);
    setInputPassword('');
    
    const examsRef = collection(db, `artifacts/${appId}/public/data/exams`);
    const q = query(examsRef, where("code", "==", searchCode.toUpperCase()));
    
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setError('Ujian dengan kode tersebut tidak ditemukan.');
      } else {
        const examDoc = querySnapshot.docs[0];
        setFoundExam({ id: examDoc.id, ...examDoc.data() });
      }
    } catch (err) {
      setError('Gagal mencari ujian. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === foundExam.password) {
      setIsVerified(true);
      setCurrentExam(foundExam);
      setError('');
    } else {
      setError('Password salah.');
    }
  };

  const handleNavigateToFeature = (page: string, data: any) => {
    // Navigate to different views within the dashboard
    switch (page) {
      case 'student_confirmation':
        setCurrentView('student_confirmation');
        break;
      case 'teacher_results':
        setCurrentView('teacher_results');
        break;
      case 'teacher_proctoring':
        setCurrentView('teacher_proctoring');
        break;
      case 'question_manager':
        setCurrentView('question_manager');
        break;
      default:
        navigateTo(page, data);
    }
  };

  const handleBackToMain = () => {
    setCurrentView('main');
  };

  const handleEditPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('Password tidak boleh kosong');
      return;
    }
    
    setIsUpdatingPassword(true);
    setError('');
    
    try {
      const examDocRef = doc(db, `artifacts/${appId}/public/data/exams`, currentExam.id);
      await updateDoc(examDocRef, { password: newPassword });
      
      // Update local state
      setCurrentExam({ ...currentExam, password: newPassword });
      setFoundExam({ ...foundExam, password: newPassword });
      
      setShowEditPassword(false);
      setNewPassword('');
      alert('Password ujian berhasil diperbarui!');
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Gagal memperbarui password. Silakan coba lagi.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Render different views based on currentView
  if (currentView === 'student_confirmation') {
    return (
      <StudentConfirmation 
        navigateBack={handleBackToMain}
        appState={{ exam: currentExam }}
      />
    );
  }

  if (currentView === 'teacher_results') {
    return (
      <TeacherResultsDashboard 
        navigateTo={navigateTo}
        navigateBack={handleBackToMain}
        appState={{ exam: currentExam }}
      />
    );
  }

  if (currentView === 'teacher_proctoring') {
    return (
      <TeacherProctoringDashboard 
        navigateTo={navigateTo}
        navigateBack={handleBackToMain}
        appState={{ exam: currentExam }}
      />
    );
  }

  if (currentView === 'question_manager') {
    return (
      <QuestionManager 
        navigateTo={navigateTo}
        navigateBack={handleBackToMain}
        appState={{ exam: currentExam }}
      />
    );
  }

  // Main dashboard view
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
      <h2 className="text-3xl font-bold mb-6">Dasbor Dosen</h2>
      <div className="flex space-x-4 mb-6 border-b border-gray-700">
        <button 
          onClick={() => setView('search')} 
          className={`py-2 px-4 ${view === 'search' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}
        >
          Cari Ujian
        </button>
        <button 
          onClick={() => setView('create')} 
          className={`py-2 px-4 ${view === 'create' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}
        >
          Buat Ujian Baru
        </button>
      </div>

      {view === 'create' && <CreateExamForm user={user} navigateTo={navigateTo} />}

      {view === 'search' && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold mb-4">Cari Ruang Ujian</h3>
          <form onSubmit={handleSearchExam} className="flex space-x-2">
            <input 
              type="text" 
              value={searchCode} 
              onChange={(e) => setSearchCode(e.target.value)} 
              placeholder="Masukkan Kode Ujian..." 
              className="flex-grow p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase" 
              required 
            />
            <button 
              type="submit" 
              disabled={isLoading} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-indigo-400"
            >
              {isLoading ? 'Mencari...' : 'Cari'}
            </button>
          </form>
          
          {foundExam && !isVerified && (
            <form onSubmit={handleVerifyPassword} className="mt-6">
              <h4 className="font-bold text-lg">Verifikasi Akses untuk: {foundExam.name}</h4>
              <div className="flex space-x-2 mt-2">
                <input 
                  type="password" 
                  value={inputPassword} 
                  onChange={(e) => setInputPassword(e.target.value)} 
                  placeholder="Masukkan Password Ujian" 
                  className="flex-grow p-3 bg-gray-700 rounded-md border border-gray-600" 
                  required
                />
                <button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
                >
                  Verifikasi
                </button>
              </div>
            </form>
          )}

          {error && <p className="text-red-500 mt-4">{error}</p>}

          {foundExam && isVerified && (
            <div className="mt-6 bg-gray-700 p-4 rounded-md">
              <h4 className="font-bold text-lg">{foundExam.name}</h4>
              <p className="text-sm text-gray-400">
                Kode: <span className="font-mono bg-gray-600 px-2 py-1 rounded">{foundExam.code}</span>
              </p>
              <div className="mt-2 flex items-center space-x-2">
                <p className="text-sm text-gray-400">
                  Password: <span className="font-mono bg-gray-600 px-2 py-1 rounded">{"*".repeat(foundExam.password.length)}</span>
                </p>
                <button
                  onClick={() => setShowEditPassword(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
                >
                  Edit Password
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => handleNavigateToFeature('student_confirmation', { exam: foundExam })} 
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2 px-3 rounded-lg"
                >
                  Konfirmasi Siswa
                </button>
                <button 
                  onClick={() => handleNavigateToFeature('teacher_results', { exam: foundExam })} 
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-3 rounded-lg"
                >
                  Lihat Hasil
                </button>
                <button 
                  onClick={() => handleNavigateToFeature('teacher_proctoring', { exam: foundExam })} 
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold py-2 px-3 rounded-lg"
                >
                  Awasi Ujian
                </button>
                <button 
                  onClick={() => handleNavigateToFeature('question_manager', { exam: foundExam })} 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded-lg"
                >
                  Kelola Soal
                </button>
              </div>
            </div>
          )}
          
          {/* Edit Password Modal */}
          {showEditPassword && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Edit Password Ujian</h3>
                  <button
                    onClick={() => {
                      setShowEditPassword(false);
                      setNewPassword('');
                      setError('');
                    }}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                <form onSubmit={handleEditPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password Baru untuk: {foundExam.name}
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan password baru"
                      className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="bg-yellow-900 border border-yellow-500 p-3 rounded-md">
                    <p className="text-yellow-300 text-sm">
                      ⚠️ <strong>Peringatan:</strong> Mengubah password akan mempengaruhi akses ke ujian ini. 
                      Pastikan untuk memberitahu siswa jika diperlukan.
                    </p>
                  </div>
                  
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditPassword(false);
                        setNewPassword('');
                        setError('');
                      }}
                      className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-400"
                    >
                      {isUpdatingPassword ? 'Menyimpan...' : 'Simpan Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;