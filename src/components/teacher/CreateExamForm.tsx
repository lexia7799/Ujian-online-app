import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface CreateExamFormProps {
  user?: any;
  navigateTo: (page: string, data?: any) => void;
  navigateBack?: () => void;
}

const CreateExamForm: React.FC<CreateExamFormProps> = ({ user, navigateTo, navigateBack }) => {
  const [examName, setExamName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!examName.trim() || !password.trim() || !startTime || !endTime) {
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
        teacherId: user?.id || 'teacher_default',
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
        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"}
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Buat Password untuk Ujian" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 pr-12" 
            required 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
          >
            {showPassword ? (
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