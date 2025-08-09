import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import CreateExamForm from './CreateExamForm';

interface TeacherDashboardProps {
  user: User;
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  canGoBack: boolean;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, navigateTo, navigateBack, canGoBack }) => {
  const [view, setView] = useState('search');
  const [searchCode, setSearchCode] = useState('');
  const [foundExam, setFoundExam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [inputPassword, setInputPassword] = useState('');

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
      setError('');
    } else {
      setError('Password salah.');
    }
  };

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
              <div className="mt-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => navigateTo('teacher_results', { exam: foundExam })} 
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-3 rounded-lg"
                >
                  Lihat Hasil
                </button>
                <button 
                  onClick={() => navigateTo('teacher_proctoring', { exam: foundExam })} 
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold py-2 px-3 rounded-lg"
                >
                  Awasi Ujian
                </button>
                <button 
                  onClick={() => navigateTo('question_manager', { exam: foundExam })} 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-3 rounded-lg"
                >
                  Kelola Soal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;