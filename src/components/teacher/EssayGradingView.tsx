import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface Question {
  id: string;
  text: string;
  type: 'mc' | 'essay';
}

interface Session {
  id: string;
  studentInfo: {
    name: string;
  };
  answers: { [key: string]: any };
  essayScores?: { [key: string]: number };
}

interface EssayGradingViewProps {
  session: Session;
  questions: Question[];
  examId: string;
  navigateBack: () => void;
  onBack: () => void;
}

const EssayGradingView: React.FC<EssayGradingViewProps> = ({ session, questions, examId, navigateBack, onBack }) => {
  const essayQuestions = questions.filter(q => q.type === 'essay');
  const [essayScores, setEssayScores] = useState<{ [key: string]: number }>(session.essayScores || {});
  const [isSaving, setIsSaving] = useState(false);

  const handleScoreChange = (questionId: string, score: string) => {
    const newScores = { ...essayScores };
    newScores[questionId] = parseInt(score, 10) || 0;
    setEssayScores(newScores);
  };

  const handleSaveAllScores = async () => {
    setIsSaving(true);
    const sessionDocRef = doc(db, `artifacts/${appId}/public/data/exams/${examId}/sessions`, session.id);
    
    try {
      await updateDoc(sessionDocRef, { essayScores: essayScores });
      alert("Semua nilai esai berhasil disimpan!");
      onBack();
    } catch (error) {
      console.error("Gagal menyimpan nilai:", error);
      alert("Gagal menyimpan nilai. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <button 
        onClick={onBack} 
        className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
      >
        &larr; Kembali
      </button>
      
      <h3 className="text-2xl font-bold">Detail Jawaban: {session.studentInfo.name}</h3>
      
      <div className="mt-6 space-y-6">
        {essayQuestions.length > 0 ? (
          essayQuestions.map(q => (
            <div key={q.id} className="bg-gray-800 p-6 rounded-lg">
              <p className="font-semibold">{q.text}</p>
              <p className="mt-2 p-4 bg-gray-900 rounded-md whitespace-pre-wrap">
                {session.answers[q.id] || '(Tidak dijawab)'}
              </p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300">
                  Nilai Esai (0-100)
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={essayScores[q.id] || ''} 
                  onChange={(e) => handleScoreChange(q.id, e.target.value)} 
                  className="p-2 bg-gray-700 rounded-md mt-1" 
                />
              </div>
            </div>
          ))
        ) : (
          <p>Tidak ada soal esai untuk dinilai.</p>
        )}
      </div>
      
      {essayQuestions.length > 0 && (
        <div className="mt-8">
          <button 
            onClick={handleSaveAllScores} 
            disabled={isSaving} 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-green-400"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Nilai Esai'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EssayGradingView;