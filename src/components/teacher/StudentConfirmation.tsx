import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface Application {
  id: string;
  studentId: string;
  studentData: {
    fullName: string;
    username: string;
    major: string;
    className: string;
    university: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
}

interface StudentConfirmationProps {
  navigateBack: () => void;
  appState: any;
}

const StudentConfirmation: React.FC<StudentConfirmationProps> = ({ navigateBack, appState }) => {
  const { exam, parentExam } = appState;
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const handleBackNavigation = () => {
    navigateBack();
  };

  useEffect(() => {
    if (!exam?.id) return;
    
    const applicationsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/applications`);
    const unsubscribe = onSnapshot(applicationsRef, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate() || new Date()
      } as Application));
      
      setApplications(apps.sort((a, b) => a.appliedAt.getTime() - b.appliedAt.getTime()));
    });
    
    return () => unsubscribe();
  }, [exam?.id]);

  const handleSelectStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    const pendingApplications = applications.filter(app => app.status === 'pending');
    if (selectedStudents.size === pendingApplications.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(pendingApplications.map(app => app.id)));
    }
  };

  const handleApproveSelected = async () => {
    setIsLoading(true);
    try {
      const promises = Array.from(selectedStudents).map(applicationId => {
        const appRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/applications`, applicationId);
        return updateDoc(appRef, { status: 'approved' });
      });
      
      await Promise.all(promises);
      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Error approving students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectSelected = async () => {
    setIsLoading(true);
    try {
      const promises = Array.from(selectedStudents).map(applicationId => {
        const appRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/applications`, applicationId);
        return updateDoc(appRef, { status: 'rejected' });
      });
      
      await Promise.all(promises);
      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Error rejecting students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndividualAction = async (applicationId: string, action: 'approve' | 'reject') => {
    const appRef = doc(db, `artifacts/${appId}/public/data/exams/${exam.id}/applications`, applicationId);
    await updateDoc(appRef, { 
      status: action === 'approve' ? 'approved' : 'rejected' 
    });
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const approvedCount = applications.filter(app => app.status === 'approved').length;
  const rejectedCount = applications.filter(app => app.status === 'rejected').length;

  return (
    <div>
      <button 
        onClick={handleBackNavigation} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Konfirmasi Siswa</h2>
        <p className="text-lg text-indigo-400 mb-4">{exam.name} ({exam.code})</p>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-600 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{pendingApplications.length}</div>
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
      </div>

      {pendingApplications.length > 0 && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg"
              >
                {selectedStudents.size === pendingApplications.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
              <span className="text-gray-400">
                {selectedStudents.size} dari {pendingApplications.length} dipilih
              </span>
            </div>
            
            {selectedStudents.size > 0 && (
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
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        {applications.length === 0 ? (
          <div className="text-center p-8 text-gray-400">
            Belum ada siswa yang mengajukan untuk ujian ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-700">
                <tr>
                  <th className="p-4">Pilih</th>
                  <th className="p-4">Foto</th>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Program Studi</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4">Universitas</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-4">
                      {app.status === 'pending' && (
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(app.id)}
                          onChange={() => handleSelectStudent(app.id)}
                          className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                      )}
                    </td>
                    <td className="p-4">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {app.studentData.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold">{app.studentData.fullName}</td>
                    <td className="p-4 text-gray-400">{app.studentData.username}</td>
                    <td className="p-4">{app.studentData.major}</td>
                    <td className="p-4">{app.studentData.className}</td>
                    <td className="p-4">{app.studentData.university}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        app.status === 'pending' 
                          ? 'bg-yellow-600 text-white' 
                          : app.status === 'approved'
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {app.status === 'pending' ? 'Menunggu' : 
                         app.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                      </span>
                    </td>
                    <td className="p-4">
                      {app.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleIndividualAction(app.id, 'approve')}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1 px-3 rounded"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleIndividualAction(app.id, 'reject')}
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
        )}
      </div>
    </div>
  );
};

export default StudentConfirmation;