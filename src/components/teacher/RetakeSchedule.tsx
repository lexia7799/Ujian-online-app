import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, limit } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';
import Modal from '../ui/Modal';

interface RetakeRequest {
  id: string;
  studentId: string;
  studentData: {
    fullName: string;
    username: string;
    major: string;
    className: string;
    university: string;
  };
  examId: string;
  examName: string;
  examCode: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  customStartTime?: string;
  customEndTime?: string;
}

interface RetakeScheduleProps {
  navigateBack: () => void;
  appState: any;
}

const RetakeSchedule: React.FC<RetakeScheduleProps> = ({ navigateBack, appState }) => {
  const { exam } = appState;
  const [retakeRequests, setRetakeRequests] = useState<RetakeRequest[]>([]);
  const [editingRequest, setEditingRequest] = useState<RetakeRequest | null>(null);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  useEffect(() => {
    if (!exam?.id) return;
    
    const fetchRetakeRequests = async () => {
      try {
        const retakeRequestsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`);
        const retakeRequestsSnapshot = await getDocs(retakeRequestsRef);
        
        const requestsData = retakeRequestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date()
        } as RetakeRequest));
        
        setRetakeRequests(requestsData);
      } catch (error) {
        console.error('Error fetching retake requests:', error);
      }
    };
    
    fetchRetakeRequests();
  }, [exam?.id]);

  const handleEditSchedule = (request: RetakeRequest) => {
    setEditingRequest(request);
    setCustomStartTime(request.customStartTime || exam.startTime || '');
    setCustomEndTime(request.customEndTime || exam.endTime || '');
    setScheduleError('');
  };

  const handleSaveSchedule = async () => {
    if (!editingRequest) return;
    
    setIsUpdating(true);
    setScheduleError('');
    
    try {
      // Validate schedule
      if (!customStartTime.trim() || !customEndTime.trim()) {
        setScheduleError('Waktu mulai dan selesai harus diisi');
        setIsUpdating(false);
        return;
      }
      
      if (new Date(customStartTime) >= new Date(customEndTime)) {
        setScheduleError('Waktu selesai harus setelah waktu mulai');
        setIsUpdating(false);
        return;
      }
      
      // Update retake request with custom schedule
      const requestRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`, editingRequest.id);
      await updateDoc(requestRef, {
        customStartTime: customStartTime,
        customEndTime: customEndTime,
        scheduleUpdatedAt: new Date()
      });
      
      // Update local state
      setRetakeRequests(prev => prev.map(request => 
        request.id === editingRequest.id 
          ? { ...request, customStartTime, customEndTime }
          : request
      ));
      
      setEditingRequest(null);
      setCustomStartTime('');
      setCustomEndTime('');
      alert('Jadwal ujian ulang berhasil diatur!');
      
    } catch (error) {
      console.error('Error updating retake schedule:', error);
      setScheduleError('Gagal mengatur jadwal. Silakan coba lagi.');
    } finally {
      setIsUpdating(false);
    }
  };

  const resetToOriginalSchedule = async (request: RetakeRequest) => {
    try {
      const requestRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`, request.id);
      await updateDoc(requestRef, {
        customStartTime: null,
        customEndTime: null,
        scheduleUpdatedAt: new Date()
      });
      
      // Update local state
      setRetakeRequests(prev => prev.map(req => 
        req.id === request.id 
          ? { ...req, customStartTime: undefined, customEndTime: undefined }
          : req
      ));
      
      alert('Jadwal berhasil direset ke jadwal asli ujian!');
    } catch (error) {
      console.error('Error resetting schedule:', error);
      alert('Gagal mereset jadwal. Silakan coba lagi.');
    }
  };

  const approvedRequests = retakeRequests.filter(req => req.status === 'approved');

  return (
    <div>
      <Modal 
        isOpen={!!editingRequest} 
        title="Atur Jadwal Ujian Ulang"
        onCancel={() => {
          setEditingRequest(null);
          setCustomStartTime('');
          setCustomEndTime('');
          setScheduleError('');
        }}
        onConfirm={handleSaveSchedule}
        confirmText={isUpdating ? 'Menyimpan...' : 'Simpan Jadwal'}
        confirmColor="green"
      >
        {editingRequest && (
          <div className="space-y-4">
            <div className="bg-gray-700 p-3 rounded-lg text-center">
              <h4 className="font-bold text-lg text-white">{editingRequest.studentData.fullName}</h4>
              <p className="text-sm text-gray-300">{editingRequest.studentData.username}</p>
              <p className="text-sm text-gray-300">{editingRequest.studentData.major} - {editingRequest.studentData.className}</p>
            </div>
            
            <div className="bg-blue-900 border border-blue-500 p-3 rounded-lg">
              <h5 className="text-blue-300 font-bold mb-2">📅 Jadwal Asli Ujian:</h5>
              <p className="text-blue-200 text-sm">
                <strong>Mulai:</strong> {new Date(exam.startTime).toLocaleString('id-ID')}
              </p>
              <p className="text-blue-200 text-sm">
                <strong>Selesai:</strong> {new Date(exam.endTime).toLocaleString('id-ID')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Waktu Mulai Khusus
              </label>
              <input
                type="datetime-local"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Waktu Selesai Khusus
              </label>
              <input
                type="datetime-local"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            
            <div className="bg-yellow-900 border border-yellow-500 p-3 rounded-lg">
              <p className="text-yellow-300 text-sm">
                ⚠️ <strong>Catatan:</strong> Jadwal khusus ini hanya berlaku untuk siswa yang mengajukan ujian ulang. 
                Jika tidak diatur, siswa akan menggunakan jadwal asli ujian.
              </p>
            </div>
            
            {scheduleError && (
              <div className="bg-red-900 border border-red-500 p-3 rounded-md">
                <p className="text-red-200 text-sm">{scheduleError}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <h2 className="text-3xl font-bold mb-2">Atur Jadwal Ujian Ulang</h2>
      <p className="text-lg text-indigo-400 mb-6">{exam.name} ({exam.code})</p>
      
      <div className="mb-6 bg-blue-900 border border-blue-500 p-4 rounded-lg">
        <h3 className="text-blue-300 font-bold mb-2">📅 Jadwal Asli Ujian:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-blue-200 text-sm">
              <strong>Waktu Mulai:</strong><br/>
              {new Date(exam.startTime).toLocaleString('id-ID')}
            </p>
          </div>
          <div>
            <p className="text-blue-200 text-sm">
              <strong>Waktu Selesai:</strong><br/>
              {new Date(exam.endTime).toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="bg-green-600 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{approvedRequests.length}</div>
          <div className="text-sm">Siswa Disetujui untuk Ujian Ulang</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {approvedRequests.length === 0 ? (
          <div className="text-center p-8 text-gray-400">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-2">Belum Ada Siswa yang Disetujui</h3>
            <p>Tidak ada siswa yang disetujui untuk ujian ulang saat ini.</p>
            <p className="text-sm mt-2">Setujui permintaan ujian ulang terlebih dahulu di menu "Konfirmasi Ujian Ulang".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Program Studi</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4">Jadwal Khusus</th>
                  <th className="p-4">Status Jadwal</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {approvedRequests.map(request => (
                  <tr key={request.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-4 font-semibold">{request.studentData.fullName}</td>
                    <td className="p-4 text-gray-400">{request.studentData.username}</td>
                    <td className="p-4">{request.studentData.major}</td>
                    <td className="p-4">{request.studentData.className}</td>
                    <td className="p-4">
                      {request.customStartTime && request.customEndTime ? (
                        <div className="text-sm">
                          <div className="text-green-400 font-bold">✅ Jadwal Khusus</div>
                          <div className="text-gray-300">
                            <strong>Mulai:</strong> {new Date(request.customStartTime).toLocaleString('id-ID')}
                          </div>
                          <div className="text-gray-300">
                            <strong>Selesai:</strong> {new Date(request.customEndTime).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <div className="text-blue-400 font-bold">📅 Jadwal Asli</div>
                          <div className="text-gray-400">Menggunakan jadwal ujian asli</div>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        request.customStartTime && request.customEndTime
                          ? 'bg-green-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {request.customStartTime && request.customEndTime ? 'Jadwal Khusus' : 'Jadwal Asli'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditSchedule(request)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-3 rounded"
                        >
                          {request.customStartTime && request.customEndTime ? 'Edit Jadwal' : 'Atur Jadwal'}
                        </button>
                        {request.customStartTime && request.customEndTime && (
                          <button
                            onClick={() => resetToOriginalSchedule(request)}
                            className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-bold py-1 px-3 rounded"
                          >
                            Reset ke Asli
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetakeSchedule;