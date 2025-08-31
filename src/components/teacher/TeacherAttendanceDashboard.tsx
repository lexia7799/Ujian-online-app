import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import Modal from '../ui/Modal';

interface AttendanceSnapshot {
  imageData: string;
  timestamp: string;
  timeLabel: string;
  type: string;
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
  attendanceSnapshot_1?: AttendanceSnapshot;
  attendanceSnapshot_2?: AttendanceSnapshot;
  attendanceSnapshot_3?: AttendanceSnapshot;
  attendanceSnapshot_4?: AttendanceSnapshot;
  attendanceSnapshot_5?: AttendanceSnapshot;
  attendanceSnapshot_6?: AttendanceSnapshot;
  attendanceSnapshot_7?: AttendanceSnapshot;
  attendanceSnapshot_8?: AttendanceSnapshot;
  attendanceSnapshot_9?: AttendanceSnapshot;
  attendanceSnapshot_10?: AttendanceSnapshot;
  attendanceSnapshot_11?: AttendanceSnapshot;
  attendanceSnapshot_12?: AttendanceSnapshot;
  attendanceSnapshot_13?: AttendanceSnapshot;
  attendanceSnapshot_14?: AttendanceSnapshot;
  attendanceSnapshot_15?: AttendanceSnapshot;
  attendanceSnapshot_16?: AttendanceSnapshot;
  attendanceSnapshot_17?: AttendanceSnapshot;
  attendanceSnapshot_18?: AttendanceSnapshot;
  attendanceSnapshot_19?: AttendanceSnapshot;
  attendanceSnapshot_20?: AttendanceSnapshot;
  attendanceSnapshot_21?: AttendanceSnapshot;
  attendanceSnapshot_22?: AttendanceSnapshot;
  attendanceSnapshot_23?: AttendanceSnapshot;
}

interface TeacherAttendanceDashboardProps {
  navigateBack: () => void;
  appState: any;
}

const TeacherAttendanceDashboard: React.FC<TeacherAttendanceDashboardProps> = ({ navigateBack, appState }) => {
  const { exam } = appState;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<{
    imageData: string;
    timestamp: string;
    timeLabel: string;
    studentName: string;
    studentNim: string;
    studentClass: string;
    studentMajor: string;
  } | null>(null);

  useEffect(() => {
    if (!exam?.id) return;
    
    const sessionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
    const unsubSessions = onSnapshot(sessionsRef, (snapshot) => {
      const sessionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      // Show all sessions, even those without attendance photos yet
      const sessionsWithAttendance = sessionData.filter(session => 
        // Check if session has any attendance snapshots (up to 23 possible)
        Object.keys(session).some(key => key.startsWith('attendanceSnapshot_'))
      );
      // Show all sessions, not just those with attendance photos
      setSessions(sessionData);
    });
    
    return () => unsubSessions();
  }, [exam?.id]);

  // Filter sessions based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session => {
        const name = (session.studentInfo.name || '').toLowerCase();
        const nim = (session.studentInfo.nim || '').toLowerCase();
        const major = (session.studentInfo.major || '').toLowerCase();
        const className = (session.studentInfo.className || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return name.includes(search) || 
               nim.includes(search) || 
               major.includes(search) || 
               className.includes(search);
      });
      setFilteredSessions(filtered);
    }
  }, [sessions, searchTerm]);

  const viewAttendancePhoto = (snapshot: AttendanceSnapshot, studentName: string, studentNim: string, studentClass: string, studentMajor: string) => {
    setSelectedSnapshot({
      ...snapshot,
      studentName,
      studentNim,
      studentClass,
      studentMajor
    });
  };

  const viewSnapshot = (snapshot: AttendanceSnapshot, studentName: string, studentNim: string, studentClass: string, studentMajor: string) => {
    setSelectedSnapshot({
      ...snapshot,
      studentName,
      studentNim,
      studentClass,
      studentMajor
    });
  };

  const getAttendanceSnapshots = (session: Session): AttendanceSnapshot[] => {
    const snapshots: AttendanceSnapshot[] = [];
    // Check for up to 23 attendance snapshots (comprehensive schedule)
    for (let i = 1; i <= 23; i++) {
      const snapshot = session[`attendanceSnapshot_${i}` as keyof Session] as AttendanceSnapshot;
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }
    return snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  if (!exam) {
    return <div className="text-center p-8">Memuat data ujian...</div>;
  }

  return (
    <div>
      <Modal 
        isOpen={!!selectedSnapshot} 
        title={`Foto Absensi - ${selectedSnapshot?.studentName || 'Siswa'}`}
        onCancel={() => setSelectedSnapshot(null)}
        cancelText="Tutup"
      >
        {selectedSnapshot && (
          <div className="text-center">
            <img 
              src={selectedSnapshot.imageData} 
              alt="Attendance Photo" 
              className="w-full max-w-md mx-auto rounded-lg mb-4" 
            />
            <div className="bg-gray-700 p-3 rounded-md text-left">
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-bold text-blue-400">Siswa:</span> {selectedSnapshot.studentName || 'Tidak tersedia'}
              </p>
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-bold text-green-400">NIM:</span> {selectedSnapshot.studentNim || 'Tidak tersedia'}
              </p>
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-bold text-purple-400">Kelas:</span> {selectedSnapshot.studentClass || 'Tidak tersedia'}
              </p>
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-bold text-orange-400">Jurusan:</span> {selectedSnapshot.studentMajor || 'Tidak tersedia'}
              </p>
              <p className="text-sm text-gray-300 mb-1">
                <span className="font-bold text-cyan-400">Waktu Foto:</span> {selectedSnapshot.timeLabel}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-bold text-yellow-400">Timestamp:</span> {new Date(selectedSnapshot.timestamp).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        )}
      </Modal>
      
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <h2 className="text-3xl font-bold">Rekap Absensi</h2>
      <p className="text-lg text-cyan-400 mb-6">{exam.name} ({exam.code}) - Foto diambil secara berkala selama ujian</p>
      
      {/* Search Bar */}
      <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-grow">
            <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
              🔍 Cari Siswa (Nama Lengkap, NIM, Kelas, atau Jurusan)
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ketik nama lengkap, NIM, kelas, atau jurusan siswa..."
              className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-6 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-3 text-sm text-gray-400">
            Menampilkan {filteredSessions.length} dari {sessions.length} siswa
            {filteredSessions.length > 0 && (
              <span className="ml-2 text-cyan-400">
                untuk "{searchTerm}"
              </span>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-cyan-600 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{sessions.length}</div>
          <div className="text-sm">Total Siswa dengan Foto Absensi</div>
        </div>
        <div className="bg-green-600 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">
            {sessions.reduce((total, session) => total + getAttendanceSnapshots(session).length, 0)}
          </div>
          <div className="text-sm">Total Foto Absensi</div>
        </div>
        <div className="bg-blue-600 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">
            {Math.round(sessions.reduce((total, session) => total + getAttendanceSnapshots(session).length, 0) / Math.max(sessions.length, 1))}
          </div>
          <div className="text-sm">Rata-rata Foto per Siswa</div>
        </div>
      </div>
      
      {sessions.length === 0 ? (
        <div className="text-center mt-8 bg-gray-800 p-6 rounded-lg">
          <p className="text-gray-400 text-lg mb-2">📷 Belum Ada Foto Absensi</p>
          <p className="text-gray-500">
            Belum ada siswa yang mengikuti ujian atau foto absensi belum diambil.
          </p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center mt-8 bg-gray-800 p-6 rounded-lg">
          <p className="text-yellow-400 text-lg mb-2">🔍 Tidak ada hasil</p>
          <p className="text-gray-400">
            Tidak ditemukan siswa dengan nama, NIM, kelas, atau jurusan "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Tampilkan Semua Siswa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map(session => {
            const attendancePhotos = getAttendanceSnapshots(session);
            
            return (
              <div 
                key={session.id} 
                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 border-cyan-500"
              >
                <div className="w-full aspect-video bg-gray-900 relative">
                  {attendancePhotos.length > 0 ? (
                    <div className="w-full h-full relative">
                      {/* Show latest attendance photo */}
                      <img 
                        src={attendancePhotos[attendancePhotos.length - 1].imageData} 
                        alt="Latest Attendance" 
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay with attendance info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2">
                        <p className="text-xs text-cyan-400 text-center">
                          📷 Foto Terakhir: {attendancePhotos[attendancePhotos.length - 1].timeLabel}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="text-gray-400 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-400">
                          {session.status === 'started' ? 'Ujian Sedang Berlangsung' : 'Belum Ada Foto Absensi'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h4 className="font-bold text-lg">{session.studentInfo.name}</h4>
                  <p className="text-sm text-gray-400">{session.studentInfo.nim}</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-gray-500">
                      📚 {session.studentInfo.major || 'Jurusan tidak tersedia'}
                    </p>
                    <p className="text-xs text-gray-500">
                      🏫 {session.studentInfo.className || 'Kelas tidak tersedia'}
                    </p>
                  </div>
                  
                  <div className="mt-3 flex justify-between items-center">
                    <span 
                      className={`px-3 py-1 text-xs font-bold rounded-full ${
                        session.status === 'started' 
                          ? 'bg-blue-600' 
                          : session.status === 'finished' 
                          ? 'bg-green-600' 
                          : 'bg-red-600'
                      }`}
                    >
                      {session.status}
                    </span>
                    <span className="font-bold text-sm text-cyan-400">
                      📷 {attendancePhotos.length} Foto
                    </span>
                  </div>
                  
                  {attendancePhotos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-1">
                      {attendancePhotos.map((photo, index) => (
                        <button 
                          key={index}
                          onClick={() => viewSnapshot(
                            photo, 
                            session.studentInfo.name || session.studentInfo.fullName || 'Siswa', 
                            session.studentInfo.nim || 'Tidak tersedia',
                            session.studentInfo.className || 'Tidak tersedia',
                            session.studentInfo.major || 'Tidak tersedia'
                          )}
                          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-2 px-2 rounded flex items-center justify-center"
                        >
                          📷 {photo.timeLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherAttendanceDashboard;