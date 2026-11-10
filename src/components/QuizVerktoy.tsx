import React, { useState } from 'react';
import { callGoogleAIProxy } from '../services/geminiService';

interface QuizQuestion {
  type: 'flervalg' | 'sant_usant' | 'fyll_inn' | 'case';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const QuizVerktoy: React.FC<{ pensumTekst: string }> = ({ pensumTekst }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const generateQuiz = async () => {
    setLoading(true);
    try {
      const response = await callGoogleAIProxy({
        model: 'gemini-3.8-flash',
        contents: `Pensumtekst: ${pensumTekst}`,
        config: {
          systemInstruction: "Du er en krevende, men pedagogisk lærer på universitetsnivå for barnehagelærerstudenter. Basert på pensumteksten skal du lage 6-10 quiz-spørsmål av ulike typer. Spørsmålstypene skal være en god miks av: 1. Flervalg (Multiple Choice), 2. Sant eller usant (True/False), 3. Fyll inn manglende ord (Fill-in-the-blank), og 4. Praktiske drøftingscaser. Du SKAL svare utelukkende med et valid JSON-array. Struktur: { \"type\": \"flervalg|sant_usant|fyll_inn|case\", \"question\": \"Spørsmålet eller casen\", \"options\": [\"Svar A\", \"Svar B\"...], \"correctAnswer\": \"Den nøyaktige teksten til det riktige svaret fra options\", \"explanation\": \"En kort, faglig begrunnelse for HVORFOR dette er riktig, koblet mot pensum.\" }. For sant/usant er options [\"Sant\", \"Usant\"]. For fyll_inn gi 3-4 plausible ord som options."
        }
      });
      
      let rawResponse = response.text || "[]";
      rawResponse = rawResponse.replace(/```json\n?|\n?```/g, "").trim();
      const quizData = JSON.parse(rawResponse);
      setQuestions(quizData);
    } catch (error) {
      console.error("Feil ved generering av quiz:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (userAnswer) return;
    setUserAnswer(answer);
    if (answer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer(null);
    } else {
      setShowSummary(true);
    }
  };

  if (loading) return <div className="p-4">Skreddersyr eksamensoppgaver til deg...</div>;
  if (questions.length === 0) return <button className="p-2 bg-blue-500 text-white rounded m-4" onClick={generateQuiz}>Generer Quiz</button>;

  if (showSummary) return <div className="p-4">Ferdig! Poengsum: {score} av {questions.length}</div>;

  const q = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="w-full bg-gray-200 h-2 mb-4">
        <div className="bg-green-500 h-2" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="mb-2 font-semibold">Spørsmål {currentQuestionIndex + 1} av {questions.length}</div>
      <h2 className="text-xl font-bold mb-4">{q.question}</h2>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map(option => (
          <button
            key={option}
            className={`p-4 border rounded text-left transition-colors ${userAnswer ? (option === q.correctAnswer ? 'bg-green-500 text-white' : (option === userAnswer ? 'bg-red-500 text-white' : 'bg-gray-100')) : 'bg-white hover:bg-gray-50'}`}
            onClick={() => handleAnswer(option)}
            disabled={!!userAnswer}
          >
            {option}
            {userAnswer === option && (option === q.correctAnswer ? ' ✅' : ' ❌')}
          </button>
        ))}
      </div>
      {userAnswer && (
        <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100">
          <h3 className="font-bold mb-1">Forklaring:</h3>
          <p className="text-gray-700">{q.explanation}</p>
          <button className="mt-4 p-2 bg-blue-600 text-white rounded w-full" onClick={nextQuestion}>Neste spørsmål</button>
        </div>
      )}
    </div>
  );
};
