import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, appId } from '../../config/firebase';

interface StudentRegisterProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
}

const StudentRegister: React.FC<StudentRegisterProps> = ({ navigateTo, navigateBack }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    nim: '',
    username: '',
    password: '',
    confirmPassword: '',
    major: '',
    className: '',
    university: ''
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
      // Create email from username for Firebase Auth
      const email = `${formData.username.toLowerCase()}@student.ujian-online.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, formData.password);
      
      await updateProfile(userCredential.user, {
        displayName: formData.fullName
      });

      await setDoc(doc(db, `artifacts/${appId}/public/data/students`, userCredential.user.uid), {
        fullName: formData.fullName,
        nim: formData.nim,
        username: formData.username,
        email: email,
        major: formData.major,
        className: formData.className,
        university: formData.university,
        createdAt: new Date(),
        role: 'student'
      });

      navigateTo('student_login');
    } catch (error: any) {
      setError(error.message);
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
      <h2 className="text-3xl font-bold mb-6 text-center">Daftar Akun Siswa</h2>
      <div className="w-full max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            name="fullName" 
            type="text"
            value={formData.fullName}
            onChange={handleChange} 
            placeholder="Nama Lengkap" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
          <input 
            name="nim" 
            type="text"
            value={formData.nim}
            onChange={handleChange} 
            placeholder="NIM/NIS (Nomor Induk)" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
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
          <input 
            name="major" 
            type="text"
            value={formData.major}
            onChange={handleChange} 
            placeholder="Program Studi/Jurusan" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
          <input 
            name="className" 
            type="text"
            value={formData.className}
            onChange={handleChange} 
            placeholder="Kelas" 
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600" 
            required 
          />
          <input 
            name="university" 
            type="text"
            value={formData.university}
            onChange={handleChange} 
            placeholder="Universitas/Sekolah" 
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
            onClick={() => navigateTo('student_login')}
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Sudah punya akun? Login di sini
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;