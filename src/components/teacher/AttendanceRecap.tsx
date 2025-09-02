import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface AttendanceSnapshot {
  imageData: string;
  timestamp: string;
  minute: number | string;
  type: 'scheduled' | 'final';
}

interface StudentSession {
  id: string;
  studentInfo: {
    name: string;
    nim: string;
    major: string;
    className: string;
  };
  attendance_snapshots?: { [key: string]: AttendanceSnapshot };
}

interface AttendanceRecapProps {
  navigateBack: () => void;
  appState: any;
}

const AttendanceRecap: React.FC<AttendanceRecapProps> = ({ navigateBack, appState }) => {
  const { exam } = appState;
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<StudentSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    imageData: string;
    studentName: string;
    timestamp: string;
    minute: string;
  } | null>(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const sessionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
        const sessionsSnapshot = await getDocs(sessionsRef);
        
        const sessionData = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as StudentSession));
        
        setSessions(sessionData);
        setFilteredSessions(sessionData);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [exam.id]);

  // Filter sessions based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredSessions(sessions);
    } else {
      const filtered = sessions.filter(session => {
        const name = session.studentInfo.name.toLowerCase();
        const nim = session.studentInfo.nim.toLowerCase();
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

  const getAttendancePhotos = (session: StudentSession) => {
    if (!session.attendance_snapshots) return [];
    
    const photos = Object.entries(session.attendance_snapshots).map(([key, snapshot]) => ({
      key,
      ...snapshot,
      sortOrder: key === 'finished' ? 999 : parseInt(key.replace('minute_', ''))
    }));
    
    return photos.sort((a, b) => a.sortOrder - b.sortOrder);
  };

  const formatPhotoLabel = (minute: number | string) => {
    if (minute === 'finished') return 'Selesai';
    return `Menit ke-${minute}`;
  };

  const viewPhoto = (photo: any, studentName: string) => {
    setSelectedPhoto({
      imageData: photo.imageData,
      studentName,
      timestamp: photo.timestamp,
      minute: formatPhotoLabel(photo.minute)
    });
  };

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p>Memuat data rekap absensi...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                Foto Absensi - {selectedPhoto.studentName}
              </h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="text-center">
              <img 
                src={selectedPhoto.imageData} 
                alt="Attendance Photo" 
                className="w-full max-w-md mx-auto rounded-lg mb-4"
              />
              <div className="bg-gray-700 p-3 rounded-md text-left">
                <p className="text-sm text-gray-300 mb-1">
                  <span className="font-bold text-blue-400">Waktu:</span> {selectedPhoto.minute}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-bold text-green-400">Timestamp:</span> {new Date(selectedPhoto.timestamp).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <h2 className="text-3xl font-bold mb-2">Rekap Absen</h2>
      <p className="text-lg text-indigo-400 mb-6">{exam.name} ({exam.code}) - Foto absensi otomatis</p>
      
      {/* Search Bar */}
      <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-grow">
            <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
              🔍 Cari Siswa (Nama, NIM, Kelas, atau Jurusan)
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
              <span className="ml-2 text-blue-400">
                untuk "{searchTerm}"
              </span>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{sessions.length}</div>
          <div className="text-sm">Total Siswa</div>
        </div>
        <div className="bg-green-600 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">
            {sessions.filter(s => s.attendance_snapshots && Object.keys(s.attendance_snapshots).length > 0).length}
          </div>
          <div className="text-sm">Memiliki Foto Absensi</div>
        </div>
        <div className="bg-purple-600 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">
            {sessions.reduce((total, s) => total + (s.attendance_snapshots ? Object.keys(s.attendance_snapshots).length : 0), 0)}
          </div>
          <div className="text-sm">Total Foto Absensi</div>
        </div>
      </div>
      
      {sessions.length === 0 ? (
        <p className="text-gray-400 text-center mt-8 bg-gray-800 p-6 rounded-lg">
          Belum ada siswa yang bergabung dalam ujian ini.
        </p>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center mt-8 bg-gray-800 p-6 rounded-lg">
          <p className="text-yellow-400 text-lg mb-2">🔍 Tidak ada hasil</p>
          <p className="text-gray-400">
            Tidak ditemukan siswa dengan nama, NIM, kelas, atau jurusan "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Tampilkan Semua Siswa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map(session => {
            const attendancePhotos = getAttendancePhotos(session);
            
            return (
              <div key={session.id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                {/* Student Info Header */}
                <div className="bg-gray-700 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {session.studentInfo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{session.studentInfo.name}</h4>
                      <p className="text-sm text-gray-400">{session.studentInfo.nim}</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-400">
                      📚 {session.studentInfo.major || 'Jurusan tidak tersedia'}
                    </p>
                    <p className="text-xs text-gray-400">
                      🏫 {session.studentInfo.className || 'Kelas tidak tersedia'}
                    </p>
                  </div>
                </div>

                {/* Attendance Photos Gallery */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-semibold text-sm">Galeri Foto Absensi</h5>
                    <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                      {attendancePhotos.length} foto
                    </span>
                  </div>
                  
                  {attendancePhotos.length === 0 ? (
                    <div className="text-center p-4 bg-gray-700 rounded-md">
                      <p className="text-gray-400 text-sm">Belum ada foto absensi</p>
                    </div>
                  ) : (
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      {attendancePhotos.map(photo => (
                        <div key={photo.key} className="flex-shrink-0">
                          <div 
                            className="w-20 h-16 bg-gray-700 rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                            onClick={() => viewPhoto(photo, session.studentInfo.name)}
                          >
                            <img 
                              src={photo.imageData} 
                              alt={`Attendance ${photo.minute}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-xs text-center mt-1 text-gray-400">
                            {formatPhotoLabel(photo.minute)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary Stats */}
                <div className="bg-gray-700 p-3 text-center">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Foto Terjadwal:</span>
                      <div className="font-bold text-cyan-400">
                        {attendancePhotos.filter(p => p.type === 'scheduled').length}/19
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Foto Selesai:</span>
                      <div className="font-bold text-green-400">
                        {attendancePhotos.filter(p => p.type === 'final').length}/1
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceRecap;