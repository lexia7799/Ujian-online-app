import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, addDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface Session {
  id: string;
  studentInfo: {
    name: string;
    nim: string;
  };
  status: string;
  violations: number;
}

interface TeacherProctoringDashboardProps {
  navigateTo: (page: string, data?: any) => void;
  navigateBack: () => void;
  appState: any;
}

const TeacherProctoringDashboard: React.FC<TeacherProctoringDashboardProps> = ({ navigateTo, navigateBack, appState }) => {
  const { exam } = appState;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [peerConnections, setPeerConnections] = useState<{ [key: string]: RTCPeerConnection }>({});
  const [remoteStreams, setRemoteStreams] = useState<{ [key: string]: MediaStream }>({});
  const [connectionStates, setConnectionStates] = useState<{ [key: string]: string }>({});
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    if (!exam?.id) return;
    
    const sessionsRef = collection(db, `artifacts/${appId}/public/data/exams/${exam.id}/sessions`);
    const unsubSessions = onSnapshot(query(sessionsRef), (snapshot) => {
      const allSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(allSessions);
      
      // Filter only active sessions (started, not finished or disqualified)
      const activeOnly = allSessions.filter(session => session.status === 'started');
      setActiveSessions(activeOnly);
    });
    
    return () => unsubSessions();
  }, [exam?.id]);

  // Initialize WebRTC connection for each session
  const initializeWebRTCForSession = async (sessionId: string) => {
    console.log(`🚀 Teacher: Initializing WebRTC for session: ${sessionId}`);
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      console.log(`📡 Teacher: Created peer connection for session: ${sessionId}`);
      const signalingRef = collection(db, `signaling/${exam.id}/${sessionId}`);

      // Handle incoming stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        console.log(`📹 Teacher: Received stream for session ${sessionId}`, remoteStream);
        setRemoteStreams(prev => ({ ...prev, [sessionId]: remoteStream }));
        console.log(`✅ Teacher: Stream set for session ${sessionId}`);
        
        // Set video source with a small delay to ensure element is ready
        setTimeout(() => {
          if (videoRefs.current[sessionId]) {
            videoRefs.current[sessionId]!.srcObject = remoteStream;
            console.log(`📺 Teacher: Video element updated for session ${sessionId}`);
          }
        }, 100);
      };

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log(`🧊 Teacher: Sending ICE candidate for session ${sessionId}`);
          try {
            await addDoc(signalingRef, {
              type: 'ice-candidate',
              candidate: event.candidate.toJSON(),
              from: 'teacher',
              timestamp: new Date()
            });
            console.log(`✅ Teacher: ICE candidate sent for session ${sessionId}`);
          } catch (error) {
            console.error(`❌ Teacher: Failed to send ICE candidate for session ${sessionId}:`, error);
          }
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`🔗 Teacher: Connection state for session ${sessionId}:`, pc.connectionState);
        setConnectionStates(prev => ({ ...prev, [sessionId]: pc.connectionState }));
        
        if (pc.connectionState === 'connected') {
          console.log(`✅ Teacher: Successfully connected to session ${sessionId}`);
        } else if (pc.connectionState === 'failed') {
          console.log(`❌ Teacher: Connection failed for session ${sessionId}`);
        } else if (pc.connectionState === 'disconnected') {
          console.log(`⚠️ Teacher: Connection disconnected for session ${sessionId}`);
        }
      };
      
      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log(`🧊 Teacher: ICE connection state for session ${sessionId}:`, pc.iceConnectionState);
      };

      // Listen for signaling messages from student
      console.log(`👂 Teacher: Starting to listen for signaling messages from session ${sessionId}`);
      const unsubscribe = onSnapshot(signalingRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            console.log(`📨 Teacher: Received signaling message for session ${sessionId}:`, data.type, 'from:', data.from);
            
            if (data.from === 'student') {
              try {
                if (data.type === 'answer') {
                  console.log(`📝 Teacher: Processing answer from session ${sessionId}`);
                  await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                  console.log(`✅ Teacher: Remote description set for session ${sessionId}`);
                } else if (data.type === 'ice-candidate') {
                  console.log(`🧊 Teacher: Processing ICE candidate from session ${sessionId}`);
                  await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                  console.log(`✅ Teacher: ICE candidate added for session ${sessionId}`);
                }
              } catch (error) {
                console.error(`❌ Teacher: Error processing signaling message for session ${sessionId}:`, error);
              }
            }
            
            // Clean up processed signaling messages
            try {
              await deleteDoc(change.doc.ref);
            } catch (error) {
              console.error(`⚠️ Teacher: Failed to delete signaling message for session ${sessionId}:`, error);
            }
          }
        });
      });

      // Create and send offer
      console.log(`📤 Teacher: Creating offer for session ${sessionId}`);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`📝 Teacher: Local description set for session ${sessionId}`);
      
      await addDoc(signalingRef, {
        type: 'offer',
        offer: offer,
        from: 'teacher',
        timestamp: new Date()
      });
      
      console.log(`✅ Teacher: Offer sent for session ${sessionId}`);

      setPeerConnections(prev => ({ ...prev, [sessionId]: pc }));
      
      return unsubscribe;
    } catch (error) {
      console.error(`❌ Teacher: Failed to initialize WebRTC for session ${sessionId}:`, error);
      setConnectionStates(prev => ({ ...prev, [sessionId]: 'failed' }));
    }
  };

  useEffect(() => {
    console.log(`👥 Teacher: Active sessions count: ${activeSessions.length}`);
    
    activeSessions.forEach(async (session) => {
      // Initialize WebRTC connection if not already established
      if (!peerConnections[session.id]) {
        console.log(`🔄 Teacher: Initializing connection for new session: ${session.id}`);
        await initializeWebRTCForSession(session.id);
      }
    });
    
    console.log(`🔗 Teacher: Current peer connections:`, Object.keys(peerConnections));
    
    // Cleanup connections for sessions that no longer exist
    Object.keys(peerConnections).forEach(sessionId => {
      if (!activeSessions.find(s => s.id === sessionId)) {
        console.log(`🧹 Teacher: Cleaning up connection for inactive session: ${sessionId}`);
        peerConnections[sessionId].close();
        setPeerConnections(prev => {
          const newConnections = { ...prev };
          delete newConnections[sessionId];
          return newConnections;
        });
        setRemoteStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[sessionId];
          return newStreams;
        });
        setConnectionStates(prev => {
          const newStates = { ...prev };
          delete newStates[sessionId];
          return newStates;
        });
      }
    });
  }, [activeSessions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(peerConnections).forEach(pc => pc.close());
    };
  }, []);

  const getConnectionStatus = (sessionId: string) => {
    const state = connectionStates[sessionId];
    const hasStream = !!remoteStreams[sessionId];
    
    if (hasStream && state === 'connected') {
      return 'Terhubung';
    }
    
    switch (state) {
      case 'connected':
        return hasStream ? 'Terhubung' : 'Menunggu Stream';
      case 'connecting':
        return 'Menghubungkan...';
      case 'disconnected':
        return 'Terputus';
      case 'failed':
        return 'Gagal';
      default:
        return 'Memulai...';
    }
  };

  const retryConnection = async (sessionId: string) => {
    // Close existing connection
    if (peerConnections[sessionId]) {
      console.log(`🔄 Teacher: Retrying connection for session: ${sessionId}`);
      peerConnections[sessionId].close();
      setPeerConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[sessionId];
        return newConnections;
      });
      setConnectionStates(prev => {
        const newStates = { ...prev };
        delete newStates[sessionId];
        return newStates;
      });
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[sessionId];
        return newStreams;
      });
    }
    
    // Reinitialize connection
    await initializeWebRTCForSession(sessionId);
  };

  if (!exam) {
    return <div className="text-center p-8">Memuat data ujian...</div>;
  }

  return (
    <div>
      <button 
        onClick={navigateBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <h2 className="text-3xl font-bold">Pengawasan Live Streaming</h2>
      <p className="text-lg text-indigo-400 mb-2">{exam.name} ({exam.code})</p>
      <div className="mb-4 p-3 bg-blue-900 border border-blue-500 rounded-md">
        <p className="text-blue-300 text-sm">
          📹 <strong>Live Streaming:</strong> Video siswa akan muncul secara real-time menggunakan WebRTC. 
          Pastikan browser mendukung WebRTC dan koneksi internet stabil.
        </p>
      </div>
      
      <div className="mb-6 p-3 bg-gray-800 border border-gray-600 rounded-md">
        <div className="flex justify-between text-sm">
          <span>Total Peserta: <strong>{sessions.length}</strong></span>
          <span>Sedang Mengerjakan: <strong className="text-green-400">{activeSessions.length}</strong></span>
          <span>Selesai: <strong className="text-blue-400">{sessions.filter(s => s.status === 'finished').length}</strong></span>
          <span>Diskualifikasi: <strong className="text-red-400">{sessions.filter(s => s.status === 'disqualified').length}</strong></span>
        </div>
      </div>
      
      {activeSessions.length === 0 ? (
        <p className="text-gray-400 text-center mt-8 bg-gray-800 p-6 rounded-lg">
          {sessions.length === 0 
            ? "Belum ada siswa yang bergabung dalam ujian ini." 
            : "Tidak ada siswa yang sedang mengerjakan ujian saat ini."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeSessions.map(session => (
            <div 
              key={session.id} 
              className={`bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 ${
                session.violations > 0 
                  ? 'border-yellow-500' 
                  : 'border-gray-700'
              } ${
                session.status === 'disqualified' 
                  ? 'border-red-600' 
                  : ''
              }`}
            >
              <div className="relative w-full aspect-video bg-gray-900">
                <video 
                  ref={el => videoRefs.current[session.id] = el} 
                  autoPlay 
                  muted
                  playsInline 
                  className="w-full h-full object-cover"
                />
                {!remoteStreams[session.id] && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-gray-900">
                    <div className="text-center">
                      {connectionStates[session.id] === 'connected' ? (
                        <>
                          <div className="animate-pulse rounded-full h-8 w-8 bg-green-500 mx-auto mb-2"></div>
                          <p>Menunggu Stream dari</p>
                        </>
                      ) : (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <p>Menghubungkan ke</p>
                        </>
                      )}
                      <p className="font-bold">{session.studentInfo.name}</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {getConnectionStatus(session.id)}
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-lg">{session.studentInfo.name}</h4>
                <p className="text-sm text-gray-400">{session.studentInfo.nim}</p>
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
                  <span 
                    className={`font-bold text-sm ${
                      session.violations > 0 ? 'text-yellow-400' : 'text-gray-400'
                    }`}
                  >
                    Pelanggaran: {session.violations}/3
                  </span>
                </div>
                {connectionStates[session.id] === 'failed' && (
                  <button 
                    onClick={() => retryConnection(session.id)}
                    className="mt-2 w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold py-1 px-2 rounded"
                  >
                    Coba Hubungkan Ulang
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {sessions.length > activeSessions.length && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Sesi Selesai ({sessions.length - activeSessions.length})</h3>
          <div className="text-sm text-gray-400">
            {sessions.filter(s => s.status !== 'started').map(session => (
              <span key={session.id} className="inline-block mr-4 mb-1">
                {session.studentInfo.name} ({session.status})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherProctoringDashboard;