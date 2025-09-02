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
    nim: string;
    major: string;
    className: string;
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
  const { exam, parentExam } = appState;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [availableKelas, setAvailableKelas] = useState<string[]>([]);
  const [availableJurusan, setAvailableJurusan] = useState<string[]>([]);

  const handleBackNavigation = () => {
    navigateBack();
  };

  useEffect(() => {
    if (!exam?.id) return;
    
    const questionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/questions`);
    getDocs(questionsRef).then(snapshot => {
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
    });
    
    const sessionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
    const unsub = onSnapshot(sessionsRef, snapshot => {
      const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(sessionsData);
      
      // Extract unique kelas and jurusan for filter options
      const kelasSet = new Set<string>();
      const jurusanSet = new Set<string>();
      
      sessionsData.forEach(session => {
        if (session.studentInfo.className) kelasSet.add(session.studentInfo.className);
        if (session.studentInfo.major) jurusanSet.add(session.studentInfo.major);
      });
      
      setAvailableKelas(Array.from(kelasSet).sort());
      setAvailableJurusan(Array.from(jurusanSet).sort());
    });
    
    return () => unsub();
  }, [exam?.id]);

  // Filter and search logic
  useEffect(() => {
    let filtered = sessions;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(session => {
        const name = (session.studentInfo.name || session.studentInfo.fullName || '').toLowerCase();
        const nim = (session.studentInfo.nim || '').toLowerCase();
        const major = (session.studentInfo.major || '').toLowerCase();
        const className = (session.studentInfo.className || '').toLowerCase();
        
        return name.includes(search) || 
               nim.includes(search) || 
               major.includes(search) || 
               className.includes(search);
      });
    }
    
    // Apply kelas filter
    if (filterKelas) {
      filtered = filtered.filter(session => session.studentInfo.className === filterKelas);
    }
    
    // Apply jurusan filter
    if (filterJurusan) {
      filtered = filtered.filter(session => session.studentInfo.major === filterJurusan);
    }
    
    setFilteredSessions(filtered);
  }, [sessions, searchTerm, filterKelas, filterJurusan]);
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
    // Use filtered sessions instead of all sessions
    const sessionsToExport = filteredSessions;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(`Hasil Ujian: ${exam.name}`, 14, 22);
    
    // Add exam info
    doc.setFontSize(12);
    doc.text(`Kode Ujian: ${exam.code}`, 14, 32);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 42);
    
    // Add filter info if any filters are applied
    let yPos = 52;
    if (searchTerm || filterKelas || filterJurusan) {
      doc.setFontSize(10);
      doc.text('Filter yang diterapkan:', 14, yPos);
      yPos += 6;
      
      if (searchTerm) {
        doc.text(`- Pencarian: "${searchTerm}"`, 14, yPos);
        yPos += 4;
      }
      if (filterKelas) {
        doc.text(`- Kelas: ${filterKelas}`, 14, yPos);
        yPos += 4;
      }
      if (filterJurusan) {
        doc.text(`- Jurusan: ${filterJurusan}`, 14, yPos);
        yPos += 4;
      }
      yPos += 4;
    }
    
    doc.text(`Total Siswa: ${sessionsToExport.length}`, 14, yPos);
    yPos += 10;
    
    // Helper function to truncate text if too long
    const truncateText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + '...';
    };
    
    // Column positions and widths for better spacing
    const colPositions = [14, 20, 55, 75, 95, 115, 140, 160, 175, 190];
    const colWidths = [4, 33, 18, 18, 18, 23, 18, 13, 13, 15];
    
    // Add table headers
    const headers = ['No', 'Nama', 'NIM', 'Jurusan', 'Kelas', 'Status', 'Pelanggaran', 'PG', 'Akhir'];
    let yPosition = yPos;
    
    // Draw header background
    doc.setFillColor(240, 240, 240);
    doc.rect(14, yPosition - 6, 191, 10, 'F');
    
    // Draw header text
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    headers.forEach((header, index) => {
      doc.text(header, colPositions[index], yPosition);
    });
    
    // Draw header border
    doc.setDrawColor(0, 0, 0);
    doc.rect(14, yPosition - 6, 191, 10);
    
    yPosition += 8;
    
    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number) => {
      doc.setFontSize(fontSize);
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = doc.getTextWidth(testLine);
        
        if (textWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      
      if (currentLine) {
        lines.push(currentLine);
      }
      
      return lines;
    };
    
    // Draw data rows with alternating colors
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    sessionsToExport.forEach((session, sessionIndex) => {
      // Prepare row data with text wrapping for name
      const studentName = session.studentInfo.name || 'N/A';
      const nameLines = wrapText(studentName, colWidths[1] - 2, 9);
      const rowHeight = Math.max(12, nameLines.length * 4 + 4);
      
      // Alternate row colors
      if (sessionIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, yPosition - 4, 191, rowHeight, 'F');
      }
      
      // Draw row border
      doc.setDrawColor(200, 200, 200);
      doc.rect(14, yPosition - 4, 191, rowHeight);
      
      const rowData = [
        (sessionIndex + 1).toString(),
        '', // Name will be handled separately with wrapping
        truncateText(session.studentInfo.nim || '', 15),
        truncateText(session.studentInfo.major || '', 15),
        truncateText(session.studentInfo.className || '', 15),
        session.status || '',
        session.violations.toString(),
        session.finalScore?.toFixed(2) ?? 'N/A',
        calculateTotalScore(session)
      ];
      
      // Check if we need a new page
      if (yPosition + rowHeight > 270) {
        doc.addPage();
        yPosition = 20;
        
        // Redraw header on new page
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPosition - 6, 191, 10, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        headers.forEach((header, index) => {
          doc.text(header, colPositions[index], yPosition);
        });
        doc.setDrawColor(0, 0, 0);
        doc.rect(14, yPosition - 6, 191, 10);
        yPosition += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        // Recalculate row height for new page
        const newNameLines = wrapText(session.studentInfo.name || 'N/A', colWidths[1] - 2, 9);
        const newRowHeight = Math.max(12, newNameLines.length * 4 + 4);
        
        // Redraw current row background if needed
        if (sessionIndex % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(14, yPosition - 4, 191, newRowHeight, 'F');
        }
        doc.setDrawColor(200, 200, 200);
        doc.rect(14, yPosition - 4, 191, newRowHeight);
      }
      
      // Draw cell data (except name)
      doc.setTextColor(0, 0, 0);
      rowData.forEach((cellData, cellIndex) => {
        if (cellIndex !== 1) { // Skip name column
          doc.text(cellData, colPositions[cellIndex], yPosition + 2);
        }
      });
      
      // Draw wrapped name text
      nameLines.forEach((line, lineIndex) => {
        doc.text(line, colPositions[1], yPosition + 2 + (lineIndex * 4));
      });
      
      yPosition += rowHeight;
    });
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Halaman ${i} dari ${pageCount}`, 14, 285);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 120, 285);
    }
    
    // Save the PDF
    const filterSuffix = (searchTerm || filterKelas || filterJurusan) ? '_filtered' : '';
    doc.save(`Hasil_Ujian_${exam.code}_${new Date().toISOString().split('T')[0]}${filterSuffix}.pdf`);
  };
  if (selectedSession) {
    return (
      <EssayGradingView 
        session={selectedSession} 
        questions={questions}
        examId={exam.id}
        navigateBack={handleBackNavigation}
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
        onClick={handleBackNavigation} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Hasil Ujian: {exam.name}</h2>
        <button 
          onClick={downloadResultsPDF}
          disabled={filteredSessions.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>
      </div>
      
      {/* Search and Filter Section */}
      <div className="mb-6 bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-bold mb-4">🔍 Filter & Pencarian</h3>
        
        {/* Search Bar */}
        <div className="mb-4">
          <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
            Cari Siswa (Nama, NIM, Kelas, atau Jurusan)
          </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ketik nama, NIM, kelas, atau jurusan siswa..."
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filterKelas" className="block text-sm font-medium text-gray-300 mb-2">
              Filter Kelas
            </label>
            <select
              id="filterKelas"
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Kelas</option>
              {availableKelas.map(kelas => (
                <option key={kelas} value={kelas}>{kelas}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="filterJurusan" className="block text-sm font-medium text-gray-300 mb-2">
              Filter Jurusan
            </label>
            <select
              id="filterJurusan"
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Jurusan</option>
              {availableJurusan.map(jurusan => (
                <option key={jurusan} value={jurusan}>{jurusan}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterKelas('');
                setFilterJurusan('');
              }}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg"
            >
              Reset Filter
            </button>
          </div>
        </div>
        
        {/* Filter Summary */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
          <div>
            Menampilkan {filteredSessions.length} dari {sessions.length} siswa
            {(searchTerm || filterKelas || filterJurusan) && (
              <span className="ml-2 text-blue-400">
                (dengan filter)
              </span>
            )}
          </div>
          {(searchTerm || filterKelas || filterJurusan) && (
            <div className="text-xs">
              {searchTerm && <span className="bg-blue-600 px-2 py-1 rounded mr-1">Cari: "{searchTerm}"</span>}
              {filterKelas && <span className="bg-green-600 px-2 py-1 rounded mr-1">Kelas: {filterKelas}</span>}
              {filterJurusan && <span className="bg-purple-600 px-2 py-1 rounded mr-1">Jurusan: {filterJurusan}</span>}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 bg-gray-800 rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-700">
            <tr>
              <th className="p-4">Nama Lengkap</th>
              <th className="p-4">NIM</th>
              <th className="p-4">Program Studi</th>
              <th className="p-4">Kelas</th>
              <th className="p-4">Status</th>
              <th className="p-4">Pelanggaran</th>
              <th className="p-4">Nilai PG</th>
              <th className="p-4">Nilai Essay</th>
              <th className="p-4">Nilai Akhir</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center p-8 text-gray-400">
                  {sessions.length === 0 
                    ? "Belum ada siswa yang menyelesaikan ujian."
                    : "Tidak ada siswa yang sesuai dengan filter."
                  }
                </td>
              </tr>
            ) : (
              filteredSessions.map(session => (
                <tr key={session.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4 font-semibold">{session.studentInfo.name || 'N/A'}</td>
                  <td className="p-4 text-gray-300">{session.studentInfo.nim}</td>
                  <td className="p-4 text-gray-300">{session.studentInfo.major}</td>
                  <td className="p-4 text-gray-300">{session.studentInfo.className}</td>
                  <td className="p-4">{session.status}</td>
                  <td className="p-4">{session.violations}</td>
                  <td className="p-4">{session.finalScore?.toFixed(2) ?? 'N/A'}</td>
                  <td className="p-4">
                    {(() => {
                      const essayQuestions = questions.filter(q => q.type === 'essay');
                      if (essayQuestions.length === 0) return 'N/A';
                      
                      if (!session.essayScores) return 'Belum dinilai';
                      
                      const totalEssayScore = Object.values(session.essayScores).reduce((sum, s) => sum + s, 0);
                      const avgEssayScore = totalEssayScore / essayQuestions.length;
                      return avgEssayScore.toFixed(2);
                    })()}
                  </td>
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