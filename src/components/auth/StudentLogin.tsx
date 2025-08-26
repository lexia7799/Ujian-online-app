import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface StudentLoginProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ navigateTo, navigateBack }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
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

    try {
      // Query student by username and password
      const studentsRef = collection(db, `artifacts/${appId}/public/data/students`);
      const q = query(
        studentsRef, 
        where("username", "==", formData.username),
        where("password", "==", formData.password)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0];
        const studentData = { id: studentDoc.id, ...studentDoc.data() };
        
        // Store student info in app state
        navigateTo('student_dashboard', { currentUser: studentData });
      } else {
        setError('Username atau password salah');
      }
    } catch (error: any) {
      setError('Gagal login. Silakan coba lagi.');
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
      <h2 className="text-3xl font-bold mb-6 text-center">Login Siswa</h2>
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
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-indigo-400"
          >
            {isLoading ? 'Login...' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button 
            onClick={() => navigateTo('student_register')}
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Belum punya akun? Daftar di sini
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;