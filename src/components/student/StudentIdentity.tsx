import React, { useState } from 'react';

interface StudentIdentityProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  appState: any;
}

interface Identity {
  name: string;
  nim: string;
  major: string;
  className: string;
}

const StudentIdentity: React.FC<StudentIdentityProps> = ({ navigateTo, navigateBack, appState }) => {
  const { exam } = appState;
  const [identity, setIdentity] = useState<Identity>({ 
    name: '', 
    nim: '', 
    major: '', 
    className: '' 
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentity({ ...identity, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(identity).some(val => !val.trim())) {
      alert("Semua data identitas harus diisi.");
      return;
    }
    navigateTo('student_status_check', { studentInfo: identity, exam: exam });
  };

  return (
    <div>
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      <h2 className="text-3xl font-bold mb-2 text-center">Identitas Peserta</h2>
      <p className="text-lg text-gray-400 mb-6 text-center">
        Ujian: <span className="font-semibold text-indigo-400">{exam.name}</span>
      </p>
      <div className="w-full max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            name="name" 
            onChange={handleChange} 
            placeholder="Nama Lengkap" 
            className="w-full p-3 bg-gray-700 rounded-md" 
            required 
          />
          <input 
            name="nim" 
            onChange={handleChange} 
            placeholder="NIM / Nomor Induk" 
            className="w-full p-3 bg-gray-700 rounded-md" 
            required 
          />
          <input 
            name="major" 
            onChange={handleChange} 
            placeholder="Program Studi" 
            className="w-full p-3 bg-gray-700 rounded-md" 
            required 
          />
          <input 
            name="className" 
            onChange={handleChange} 
            placeholder="Kelas" 
            className="w-full p-3 bg-gray-700 rounded-md" 
            required 
          />
          <button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            Lanjutkan
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentIdentity;