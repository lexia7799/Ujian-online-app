import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface CreateExamFormProps {
  user: any;
  navigateTo: (page: string, data?: any) => void;
  navigateBack?: () => void;
}

const CreateExamForm: React.FC<CreateExamFormProps> = ({ user, navigateTo, navigateBack }) => {
  const [examName, setExamName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!examName.trim() || !user || !password.trim() || !startTime || !endTime) {
      setError("Semua kolom harus diisi.");
      return;
    }
    
    if (new Date(startTime) >= new Date(endTime)) {
      setError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    setIsLoading(true);
    const examCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const examsRef = collection(db, `artifacts/${appId}/public/data/exams`);
    
    try {
      const docRef = await addDoc(examsRef, {
        teacherId: user.id,
        name: examName,
        startTime: startTime,
        endTime: endTime,
        code: examCode,
        password: password,
        status: 'draft',
        createdAt: new Date(),
      });
      
      navigateTo('question_manager', { 
        exam: { 
          id: docRef.id, 
          name: examName, 
          code: examCode, 
          startTime, 
          endTime, 
          password, 
          status: 'draft' 
        } 
      });
    } catch (error) {
      console.error("Gagal membuat ujian:", error);
      setError("Gagal membuat ujian. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
      {navigateBack && (
        <button 
          onClick={navigateBack} 
          className="mb-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          &larr; Kembali
        </button>
      )}
      <h3 className="text-xl font-semibold mb-4">Detail Ujian Baru</h3>
      <form onSubmit={createExam} className="space-y-4">
        <input 
          type="text" 
          value={examName} 
          onChange={(e) => setExamName(e.target.value)} 
          placeholder="Nama Ujian (e.g., Ujian Akhir Kalkulus)" 
          className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
          required 
        />
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Buat Password untuk Ujian" 
          className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
          required 
        />
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Waktu Mulai Ujian</label>
          <input 
            type="datetime-local" 
            value={startTime} 
            onChange={(e) => setStartTime(e.target.value)} 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Waktu Selesai Ujian</label>
          <input 
            type="datetime-local" 
            value={endTime} 
            onChange={(e) => setEndTime(e.target.value)} 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-indigo-400"
        >
          {isLoading ? 'Membuat...' : 'Lanjutkan ke Kelola Soal'}
        </button>
      </form>
    </div>
  );
};

export default CreateExamForm;