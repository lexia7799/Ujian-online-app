import React, { useState } from 'react';
import { collection, getDocs, query, where, collectionGroup, limit } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface StudentJoinProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  canGoBack: boolean;
  user?: any;
}

const StudentJoin: React.FC<StudentJoinProps> = ({ navigateTo, navigateBack, canGoBack, user }) => {
  const [examCode, setExamCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!examCode.trim()) {
      setError('Kode ujian tidak boleh kosong.');
      setIsLoading(false);
      return;
    }
    
    const examsRef = collection(db, `artifacts/${appId}/public/data/exams`);
    const q = query(examsRef, where("code", "==", examCode.toUpperCase()), limit(1));
    
    try {
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setError('Kode ujian tidak ditemukan atau tidak valid.');
      } else {
        const examDoc = querySnapshot.docs[0];
        const examData = { id: examDoc.id, ...examDoc.data() };
        
        // Optimized duplicate check
        if (user && user.id) {
          const sessionsQuery = query(
            collection(db, `artifacts/${appId}/public/data/exams/${examDoc.id}/sessions`),
            where('studentId', '==', user.id),
            limit(3)
          );
          
          const sessionsSnapshot = await getDocs(sessionsQuery);
          let hasAnySession = false;
          let hasCompletedSession = false;
          
          sessionsSnapshot.forEach(sessionDoc => {
            const sessionData = sessionDoc.data();
            hasAnySession = true;
            if (['finished', 'disqualified'].includes(sessionData.status)) {
              hasCompletedSession = true;
            }
          });
          
          if (hasCompletedSession) {
            setError('Anda sudah menyelesaikan ujian dengan kode ini dan tidak dapat mengaksesnya lagi.');
            return;
          }
          
          if (hasAnySession) {
            setError('Anda sudah mengikuti ujian dengan kode ini. Tidak dapat mengikuti ujian yang sama dua kali.');
            return;
          }
        }
        
        navigateTo('student_identity', { exam: examData });
      }
    } catch (err) {
      setError('Terjadi kesalahan saat validasi kode.');
    } finally {
      setIsLoading(false);
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
      <h2 className="text-3xl font-bold mb-6 text-center">Gabung Ujian</h2>
      <div className="w-full max-w-sm mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
        <form onSubmit={handleJoin}>
          <div className="mb-4">
            <label htmlFor="examCode" className="block text-gray-300 text-sm font-bold mb-2">
              Masukkan Kode Ujian
            </label>
            <input 
              id="examCode" 
              type="text" 
              value={examCode} 
              onChange={(e) => setExamCode(e.target.value)} 
              placeholder="e.g., A7B3K2" 
              className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase" 
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-indigo-400"
          >
            {isLoading ? 'Memvalidasi...' : 'Lanjutkan'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentJoin;