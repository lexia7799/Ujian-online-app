import React, { useState } from 'react';

interface Question {
  id: string;
  text: string;
  type: 'mc' | 'essay';
  options?: string[];
  correctAnswer?: number;
}

interface EditQuestionFormProps {
  question: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

const EditQuestionForm: React.FC<EditQuestionFormProps> = ({ question, onSave, onCancel }) => {
  const [questionText, setQuestionText] = useState(question.text);
  const [questionType] = useState(question.type);
  const [options, setOptions] = useState(question.type === 'mc' ? question.options || ['', '', '', ''] : ['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(question.type === 'mc' ? question.correctAnswer || 0 : 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedData: Question = { id: question.id, text: questionText, type: questionType };
    
    if (questionType === 'mc') {
      if (options.some(opt => !opt.trim())) {
        alert("Semua opsi pilihan ganda harus diisi.");
        return;
      }
      updatedData.options = options;
      updatedData.correctAnswer = correctAnswer;
    }
    
    onSave(updatedData);
  };

  return (
    <>
      <h3 className="text-xl font-semibold mb-4">Edit Soal</h3>
      <form onSubmit={handleSave} className="space-y-4">
        <textarea 
          value={questionText} 
          onChange={(e) => setQuestionText(e.target.value)} 
          className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 h-24" 
          required
        />
        
        {questionType === 'mc' && (
          <div className="space-y-3">
            {options.map((opt, index) => (
              <div key={index} className="flex items-center">
                <input 
                  type="radio" 
                  name={`edit_correct_${question.id}`} 
                  checked={correctAnswer === index} 
                  onChange={() => setCorrectAnswer(index)} 
                  className="mr-3 h-5 w-5 text-indigo-600 bg-gray-700 border-gray-600" 
                />
                <input 
                  type="text" 
                  value={opt} 
                  onChange={(e) => {
                    const newOpt = [...options];
                    newOpt[index] = e.target.value;
                    setOptions(newOpt);
                  }} 
                  className="w-full p-2 bg-gray-700 rounded-md border border-gray-600" 
                  required 
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="flex space-x-2">
          <button 
            type="button" 
            onClick={onCancel} 
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg"
          >
            Batal
          </button>
          <button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg"
          >
            Simpan Perubahan
          </button>
        </div>
      </form>
    </>
  );
};

export default EditQuestionForm;