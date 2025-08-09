import React, { useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import jsPDF from 'jspdf';
import EssayGradingView from './EssayGradingView';

interface Question {
  id: string;
  type: 'mc' | 'essay';
}

interface Session {
  id: string;
  studentInfo: {
    name: string;
  };
  status: string;
  violations: number;
  finalScore?: number;
  essayScores?: { [key: string]: number };
}

interface TeacherResultsDashboardProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  appState: any;
}

const TeacherResultsDashboard: React.FC<TeacherResultsDashboardProps> = ({ navigateTo, navigateBack, appState }) => {
  const { exam } = appState;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!exam?.id) return;
    
    const questionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/questions`);
    getDocs(questionsRef).then(snapshot => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
    });
    
    const sessionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
    const unsub = onSnapshot(sessionsRef, snapshot => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
    });
    
    return () => unsub();
  }, [exam?.id]);

  const calculateTotalScore = (session: Session) => {
    const mcScore = session.finalScore || 0;
    const mcQuestionCount = questions.filter(q => q.type === 'mc').length;
    const essayQuestions = questions.filter(q => q.type === 'essay');
    
    if (essayQuestions.length === 0) return mcScore.toFixed(2);
    
    let totalEssayScore = 0;
    if (session.essayScores) {
      totalEssayScore = Object.values(session.essayScores).reduce((sum, s) => sum + s, 0);
    }
    
    const avgEssayScore = essayQuestions.length > 0 ? totalEssayScore / essayQuestions.length : 0;
    
    if (mcQuestionCount > 0) {
      return ((mcScore * 0.5) + (avgEssayScore * 0.5)).toFixed(2);
    }
    
    return avgEssayScore.toFixed(2);
  };

  const downloadResultsPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Hasil Ujian: ${exam.name}`, 14, 22);
    
    // Add exam info
    doc.setFontSize(12);
    doc.text(`Kode Ujian: ${exam.code}`, 14, 32);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 42);
    
    // Helper function to truncate text if too long
    const truncateText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    };
    
    // Column positions and widths for better spacing
    const colPositions = [14, 24, 50, 70, 95, 115, 135, 155, 175];
    const colWidths = [8, 24, 18, 23, 18, 18, 18, 18, 20];
    
    // Add table headers
    const headers = ['No', 'Nama', 'NIM', 'Program Studi', 'Kelas', 'Status', 'Pelanggaran', 'Nilai PG', 'Nilai Akhir'];
    let yPosition = 52;
    
    // Draw header background
    doc.setFillColor(240, 240, 240);
    doc.rect(14, yPosition - 6, 182, 10, 'F');
    
    // Draw header text
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], yPosition);
    });
    
    // Draw header border
    doc.setDrawColor(0, 0, 0);
    doc.rect(14, yPosition - 6, 182, 10);
    
    yPosition += 8;
    
    // Draw data rows with alternating colors
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    sessions.forEach((session, sessionIndex) => {
      // Alternate row colors
      if (sessionIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, yPosition - 4, 182, 12, 'F');
      }
      
      // Draw row border
      doc.setDrawColor(200, 200, 200);
      doc.rect(14, yPosition - 4, 182, 12);
      
      const rowData = [
        (sessionIndex + 1).toString(),
        truncateText(session.studentInfo.name || '', 20),
        truncateText(session.studentInfo.nim || '', 15),
        truncateText(session.studentInfo.major || '', 18),
        truncateText(session.studentInfo.className || '', 12),
        session.status || '',
        session.violations.toString(),
        session.finalScore?.toFixed(2) ?? 'N/A',
        calculateTotalScore(session)
      ];
      
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
        
        // Redraw header on new page
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPosition - 6, 182, 10, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        headers.forEach((header, index) => {
          doc.text(header, colPositions[index], yPosition);
        });
        doc.setDrawColor(0, 0, 0);
        doc.rect(14, yPosition - 6, 182, 10);
        yPosition += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        // Redraw current row background if needed
        if (sessionIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(14, yPosition - 4, 182, 12, 'F');
        }
        doc.setDrawColor(200, 200, 200);
        doc.rect(14, yPosition - 4, 182, 12);
      }
      
      // Draw cell data
      doc.setTextColor(0, 0, 0);
      rowData.forEach((cellData, cellIndex) => {
        doc.text(cellData, colPositions[cellIndex], yPosition + 2);
      });
      
      yPosition += 12;
    });
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Halaman ${i} dari ${pageCount}`, 14, 285);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 140, 285);
    }
    
    // Save the PDF
    doc.save(`Hasil_Ujian_${exam.code}_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  if (selectedSession) {
    return (
      <EssayGradingView 
        session={selectedSession} 
        questions={questions}
        examId={exam.id}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  if (!exam) {
    return <div className="text-center p-8">Memuat data hasil...</div>;
  }

  return (
    <div>
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Hasil Ujian: {exam.name}</h2>
        <button 
          onClick={downloadResultsPDF}
          disabled={sessions.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>
      </div>
      
      <div className="mt-6 bg-gray-800 rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-4">Nama Siswa</th>
              <th className="p-4">NIM</th>
              <th className="p-4">Program Studi</th>
              <th className="p-4">Kelas</th>
              <th className="p-4">Status</th>
              <th className="p-4">Pelanggaran</th>
              <th className="p-4">Nilai PG</th>
              <th className="p-4">Nilai Akhir</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-gray-400">
                  Belum ada siswa yang menyelesaikan ujian.
                </td>
              </tr>
            ) : (
              sessions.map(session => (
                <tr key={session.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4">{session.studentInfo.name}</td>
                  <td className="p-4">{session.studentInfo.nim}</td>
                  <td className="p-4">{session.studentInfo.major}</td>
                  <td className="p-4">{session.studentInfo.className}</td>
                  <td className="p-4">{session.status}</td>
                  <td className="p-4">{session.violations}</td>
                  <td className="p-4">{session.finalScore?.toFixed(2) ?? 'N/A'}</td>
                  <td className="p-4 font-bold">{calculateTotalScore(session)}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => setSelectedSession(session)} 
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded-lg" 
                      disabled={questions.filter(q => q.type === 'essay').length === 0}
                    >
                      Nilai Esai
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherResultsDashboard;