import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, appId } from '../../config/firebase';

interface AddQuestionFormProps {
  examId: string;
}

const AddQuestionForm: React.FC<AddQuestionFormProps> = ({ examId }) => {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<'mc' | 'essay'>('mc');
  const [options, setOptions] = useState(['', '', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    
    const questionsRef = collection(db, `artifacts/${appId}/public/data/exams/${examId}/questions`);
    let questionData: any = { text: questionText, type: questionType };
    
    if (questionType === 'mc') {
      if (options.some(opt => !opt.trim())) {
        alert("Semua opsi pilihan ganda harus diisi.");
        return;
      }
      questionData.options = options;
      questionData.correctAnswer = correctAnswer;
    }
    
    await addDoc(questionsRef, questionData);
    setQuestionText('');
    setOptions(['', '', '', '', '']);
    setCorrectAnswer(0);
  };

  return (
    <>
      <h3 className="text-xl font-semibold mb-4">Tambah Soal Baru</h3>
      <form onSubmit={addQuestion} className="space-y-4">
        <select 
          value={questionType} 
          onChange={(e) => setQuestionType(e.target.value as 'mc' | 'essay')} 
          className="w-full p-3 bg-gray-700 rounded-md border border-gray-600"
        >
          <option value="mc">Pilihan Ganda</option>
          <option value="essay">Esai</option>
        </select>
        
        <textarea 
          value={questionText} 
          onChange={(e) => setQuestionText(e.target.value)} 
          placeholder="Tulis pertanyaan di sini..." 
          className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 h-24" 
          required
        />
        
        {questionType === 'mc' && (
          <div className="space-y-3">
            {options.map((opt, index) => (
              <div key={index} className="flex items-center">
                <input 
                  type="radio" 
                  name="correctAnswer" 
                  checked={correctAnswer === index} 
                  onChange={() => setCorrectAnswer(index)} 
                  className="mr-3 h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600 focus:ring-indigo-500" 
                />
                <input 
                  type="text" 
                  value={opt} 
                  onChange={(e) => {
                    const newOpt = [...options];
                    newOpt[index] = e.target.value;
                    setOptions(newOpt);
                  }} 
                  placeholder={`Opsi ${String.fromCharCode(65 + index)}`} 
                  className="w-full p-2 bg-gray-700 rounded-md border border-gray-600" 
                  required 
                />
              </div>
            ))}
          </div>
        )}
        
        <button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg"
        >
          Tambah Soal
        </button>
      </form>
    </>
  );
};

export default AddQuestionForm;