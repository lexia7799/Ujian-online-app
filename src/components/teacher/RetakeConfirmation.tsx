import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, limit, startAfter, orderBy, DocumentSnapshot, onSnapshot, addDoc } from 'firebase/firestore';
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
  originalDisqualificationDate: Date;
  customStartTime?: string;
  customEndTime?: string;
}

interface RetakeConfirmationProps {
  navigateBack: () => void;
  appState: any;
}

const RetakeConfirmation: React.FC<RetakeConfirmationProps> = ({ navigateBack, appState }) => {
  const { exam } = appState;
  const [retakeRequests, setRetakeRequests] = useState<RetakeRequest[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const REQUESTS_PER_PAGE = 50;

  useEffect(() => {
    if (!exam?.id) return;
    
    // Load first page of retake requests
    loadRetakeRequests(true);
    
    // Set up real-time listener for retake requests
    const retakeRequestsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`);
    const unsubscribe = onSnapshot(
      query(retakeRequestsRef, orderBy('requestedAt', 'desc'), limit(REQUESTS_PER_PAGE)),
      (snapshot) => {
        const newRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date(),
          originalDisqualificationDate: doc.data().originalDisqualificationDate?.toDate() || new Date()
        } as RetakeRequest));
        
        setRetakeRequests(newRequests);
        setSelectedRequests(new Set()); // Reset selection on real-time update
        
        // Update pagination state
        setHasMoreData(snapshot.docs.length === REQUESTS_PER_PAGE);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setCurrentPage(1);
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [exam?.id]);

  const loadRetakeRequests = async (isFirstLoad = false) => {
    if (!exam?.id) return;
    
    if (!isFirstLoad && !hasMoreData) return;
    
    setIsLoadingMore(true);
    
    try {
      const retakeRequestsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`);
      let requestsQuery = query(
        retakeRequestsRef, 
        orderBy('requestedAt', 'desc'),
        limit(REQUESTS_PER_PAGE)
      );
      
      if (!isFirstLoad && lastDoc) {
        requestsQuery = query(
          retakeRequestsRef,
          orderBy('requestedAt', 'desc'),
          startAfter(lastDoc),
          limit(REQUESTS_PER_PAGE)
        );
      }
      
      const snapshot = await getDocs(requestsQuery);
      const newRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        requestedAt: doc.data().requestedAt?.toDate() || new Date(),
        originalDisqualificationDate: doc.data().originalDisqualificationDate?.toDate() || new Date()
      } as RetakeRequest));
      
      if (isFirstLoad) {
        setRetakeRequests(newRequests);
        setCurrentPage(1);
        setSelectedRequests(new Set()); // Reset selection on refresh
      } else {
        setRetakeRequests(prev => [...prev, ...newRequests]);
        setCurrentPage(prev => prev + 1);
      }
      
      // Update pagination state
      setHasMoreData(snapshot.docs.length === REQUESTS_PER_PAGE);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      
    } catch (error) {
      console.error('Error loading retake requests:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSelectRequest = (requestId: string) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleSelectAll = () => {
    const pendingRequests = retakeRequests.filter(req => req.status === 'pending');
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map(req => req.id)));
    }
  };

  const handleApproveSelected = async () => {
    setIsLoading(true);
    try {
      const promises = Array.from(selectedRequests).map(async (requestId) => {
        const request = retakeRequests.find(r => r.id === requestId);
        if (!request) return;

        // Update retake request status
        const requestRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`, requestId);
        await updateDoc(requestRef, { status: 'approved' });

        // Create new application for the student
        await addDoc(collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/applications`), {
          studentId: request.studentId,
          studentData: request.studentData,
          examId: request.examId,
          examName: request.examName,
          status: 'approved',
          appliedAt: new Date(),
          isRetake: true,
          originalRequestId: requestId,
          customSchedule: request.customStartTime && request.customEndTime ? {
            startTime: request.customStartTime,
            endTime: request.customEndTime
          } : null
        });
      });
      
      await Promise.all(promises);
      setSelectedRequests(new Set());
      
      alert(`${selectedRequests.size} permintaan ujian ulang berhasil disetujui!`);
    } catch (error) {
      console.error('Error approving retake requests:', error);
      alert('Gagal menyetujui permintaan ujian ulang. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectSelected = async () => {
    setIsLoading(true);
    try {
      const promises = Array.from(selectedRequests).map(requestId => {
        const requestRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`, requestId);
        return updateDoc(requestRef, { status: 'rejected' });
      });
      
      await Promise.all(promises);
      setSelectedRequests(new Set());
      
      alert(`${selectedRequests.size} permintaan ujian ulang berhasil ditolak!`);
    } catch (error) {
      console.error('Error rejecting retake requests:', error);
      alert('Gagal menolak permintaan ujian ulang. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndividualAction = async (requestId: string, action: 'approve' | 'reject') => {
    const request = retakeRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      const requestRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/retakeRequests`, requestId);
      await updateDoc(requestRef, { 
        status: action === 'approve' ? 'approved' : 'rejected' 
      });

      if (action === 'approve') {
        // Create new application for the student
        await addDoc(collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/applications`), {
          studentId: request.studentId,
          studentData: request.studentData,
          examId: request.examId,
          examName: request.examName,
          status: 'approved',
          appliedAt: new Date(),
          isRetake: true,
          originalRequestId: requestId,
          customSchedule: request.customStartTime && request.customEndTime ? {
            startTime: request.customStartTime,
            endTime: request.customEndTime
          } : null
        });
      }

      alert(`Permintaan ujian ulang ${action === 'approve' ? 'disetujui' : 'ditolak'}!`);
    } catch (error) {
      console.error(`Error ${action}ing retake request:`, error);
      alert(`Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} permintaan ujian ulang.`);
    }
  };

  const pendingRequests = retakeRequests.filter(req => req.status === 'pending');
  const approvedCount = retakeRequests.filter(req => req.status === 'approved').length;
  const rejectedCount = retakeRequests.filter(req => req.status === 'rejected').length;

  return (
    <div>
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Konfirmasi Ujian Ulang</h2>
        <p className="text-lg text-indigo-400 mb-4">{exam.name} ({exam.code})</p>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-600 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <div className="text-sm">Menunggu Konfirmasi</div>
          </div>
          <div className="bg-green-600 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{approvedCount}</div>
            <div className="text-sm">Disetujui</div>
          </div>
          <div className="bg-red-600 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <div className="text-sm">Ditolak</div>
          </div>
        </div>
        
        {hasMoreData && (
          <div className="mb-4 bg-blue-900 border border-blue-500 p-3 rounded-lg">
            <p className="text-blue-300 text-sm">
              📄 Menampilkan {retakeRequests.length} permintaan (Halaman {currentPage}) - Ada data lainnya
            </p>
          </div>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg"
              >
                {selectedRequests.size === pendingRequests.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
              <span className="text-gray-400">
                {selectedRequests.size} dari {pendingRequests.length} dipilih
              </span>
            </div>
            
            {selectedRequests.size > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={handleApproveSelected}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-green-400"
                >
                  Setujui Terpilih
                </button>
                <button
                  onClick={handleRejectSelected}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-red-400"
                >
                  Tolak Terpilih
                </button>
              </div>
            )}
            
            <button
              onClick={() => loadRetakeRequests(true)}
              disabled={isLoadingMore}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-blue-400"
            >
              {isLoadingMore ? '🔄' : '🔄'} Refresh
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {retakeRequests.length === 0 ? (
          <div className="text-center p-8 text-gray-400">
            Belum ada permintaan ujian ulang untuk ujian ini.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="p-4">Pilih</th>
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">Username</th>
                    <th className="p-4">Program Studi</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4">Universitas</th>
                    <th className="p-4">Tanggal Diskualifikasi</th>
                    <th className="p-4">Tanggal Pengajuan</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {retakeRequests.map(request => (
                    <tr key={request.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-4">
                        {request.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedRequests.has(request.id)}
                            onChange={() => handleSelectRequest(request.id)}
                            className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                          />
                        )}
                      </td>
                      <td className="p-4 font-semibold">{request.studentData.fullName}</td>
                      <td className="p-4 text-gray-400">{request.studentData.username}</td>
                      <td className="p-4">{request.studentData.major}</td>
                      <td className="p-4">{request.studentData.className}</td>
                      <td className="p-4">{request.studentData.university}</td>
                      <td className="p-4 text-gray-400 text-sm">
                        {request.originalDisqualificationDate.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-gray-400 text-sm">
                        {request.requestedAt.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          request.status === 'pending' 
                            ? 'bg-yellow-600 text-white' 
                            : request.status === 'approved'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}>
                          {request.status === 'pending' ? 'Menunggu' : 
                           request.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        </span>
                      </td>
                      <td className="p-4">
                        {request.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleIndividualAction(request.id, 'approve')}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => handleIndividualAction(request.id, 'reject')}
                              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded"
                            >
                              Tolak
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {hasMoreData && (
              <div className="p-6 bg-gray-700 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Menampilkan {retakeRequests.length} permintaan (Halaman {currentPage})
                  </div>
                  <button
                    onClick={() => loadRetakeRequests(false)}
                    disabled={isLoadingMore}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-indigo-400 flex items-center"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Memuat...
                      </>
                    ) : (
                      <>
                        📄 Muat Lebih Banyak ({REQUESTS_PER_PAGE} permintaan)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RetakeConfirmation;