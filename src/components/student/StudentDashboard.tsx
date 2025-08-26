import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface CustomUser {
  id: string;
  username: string;
  role: string;
  [key: string]: any;
}

interface StudentDashboardProps {
  user: CustomUser;
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
}

interface ExamResult {
  id: string;
  examName: string;
  finalScore: number;
  finishTime: Date;
  status: string;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, navigateTo, navigateBack }) => {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user and user.id exist
    if (!user || !user.id) {
      setIsLoading(false);
      return;
    }

    // Get student profile
    const getStudentProfile = async () => {
      const studentDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/students`, user.id));
      if (studentDoc.exists()) {
        setStudentProfile(studentDoc.data());
      }
    };

    getStudentProfile();

    // Get exam results by first getting all exams, then checking sessions
    const getExamResults = async () => {
      try {
        const results: ExamResult[] = [];
        
        // Get all exams
        const examsSnapshot = await getDocs(collection(db, `artifacts/${appId}/public/data/exams`));
        
        // For each exam, check if student has a session
        for (const examDoc of examsSnapshot.docs) {
          const examData = examDoc.data();
          const examId = examDoc.id;
          
          // Get sessions for this exam where studentId matches
          const sessionsQuery = query(
            collection(db, `artifacts/${appId}/public/data/exams/${examId}/sessions`),
            where('studentId', '==', user.id)
          );
          
          const sessionsSnapshot = await getDocs(sessionsQuery);
          
          sessionsSnapshot.forEach(sessionDoc => {
            const sessionData = sessionDoc.data();
            
            // Only include finished or disqualified sessions
            if (['finished', 'disqualified'].includes(sessionData.status)) {
              results.push({
                id: sessionDoc.id,
                examName: examData.name || 'Unknown Exam',
                finalScore: sessionData.finalScore || 0,
                finishTime: sessionData.finishTime?.toDate() || new Date(),
                status: sessionData.status
              });
            }
          });
        }
        
        setExamResults(results.sort((a, b) => b.finishTime.getTime() - a.finishTime.getTime()));
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching exam results:', error);
        setExamResults([]);
        setIsLoading(false);
      }
    };

    getExamResults();
  }, [user?.id]);

  if (isLoading) {
    return <div className="text-center p-8">Memuat dashboard...</div>;
  }

  if (!user || !user.id) {
    return <div className="text-center p-8 text-red-400">Error: User data tidak valid</div>;
  }

  return (
    <div>
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4">Dashboard Siswa</h2>
        {studentProfile && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {studentProfile.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold">{studentProfile.fullName}</h3>
                <p className="text-gray-400">{studentProfile.major} - {studentProfile.className}</p>
                <p className="text-gray-400">{studentProfile.university}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold">Riwayat Ujian</h3>
        <button 
          onClick={() => navigateTo('student_join_exam')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          Ikuti Ujian Baru
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {examResults.length === 0 ? (
          <div className="text-center p-8 text-gray-400">
            <p className="text-lg mb-4">Belum ada riwayat ujian</p>
            <button 
              onClick={() => navigateTo('student_join_exam')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Ikuti Ujian Pertama
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-700">
              <tr>
                <th className="p-4">Nama Ujian</th>
                <th className="p-4">Nilai</th>
                <th className="p-4">Status</th>
                <th className="p-4">Waktu Selesai</th>
              </tr>
            </thead>
            <tbody>
              {examResults.map(result => (
                <tr key={result.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4 font-semibold">{result.examName}</td>
                  <td className="p-4">
                    <span className={`font-bold ${
                      result.status === 'disqualified' 
                        ? 'text-red-400' 
                        : result.finalScore >= 70 
                        ? 'text-green-400' 
                        : result.finalScore >= 60 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                    }`}>
                      {result.finalScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      result.status === 'finished' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {result.status === 'finished' ? 'Selesai' : 'Diskualifikasi'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">
                    {result.finishTime.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;