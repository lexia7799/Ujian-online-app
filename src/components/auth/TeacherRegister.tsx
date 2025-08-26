import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface TeacherRegisterProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
}

const TeacherRegister: React.FC<TeacherRegisterProps> = ({ navigateTo, navigateBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      setIsLoading(false);
      return;
    }

    try {
      // Generate unique ID for teacher
      const teacherId = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await setDoc(doc(db, `artifacts/${appId}/public/data/teachers`, teacherId), {
        username: formData.username,
        password: formData.password, // In production, hash this password
        createdAt: new Date(),
        role: 'teacher'
      });

      alert('Akun dosen berhasil dibuat! Silakan login.');
      navigateTo('teacher_login');
    } catch (error: any) {
      setError('Gagal membuat akun. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      <h2 className="text-3xl font-bold mb-6 text-center">Daftar Akun Dosen</h2>
      <div className="w-full max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            name="username" 
            type="text"
            value={formData.username}
            onChange={handleChange} 
            placeholder="Username" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
          <input 
            name="password" 
            type="password"
            value={formData.password}
            onChange={handleChange} 
            placeholder="Password" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
          <input 
            name="confirmPassword" 
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange} 
            placeholder="Konfirmasi Password" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-indigo-400"
          >
            {isLoading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button 
            onClick={() => navigateTo('teacher_login')}
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Sudah punya akun? Login di sini
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherRegister;