import React from 'react';
import { LockIcon, UserIcon } from '../components/ui/Icons';

interface HomePageProps {
  navigateTo: (page: string, data?: any) => void;
}

const HomePage: React.FC<HomePageProps> = ({ navigateTo }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen -my-16">
      <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600 mb-4 text-center">
        Platform Ujian Aman
      </h1>
      <p className="text-lg text-gray-400 mb-12 text-center">
        Lingkungan ujian online dengan pengawasan anti-curang.
      </p>
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
        <button 
          onClick={() => navigateTo('teacher_dashboard')} 
          className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          <LockIcon /> Saya Dosen
        </button>
        <button 
          onClick={() => navigateTo('student_join')} 
          className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105"
        >
          <UserIcon /> Saya Siswa
        </button>
      </div>
    </div>
  );
};

export default HomePage;