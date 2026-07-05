'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import { useCipherWorker } from "../../lib/hooks/useCipherWorker";
import { generateChallengeData, type ChallengeData } from "../../lib/challenge/generator";
import { CIPHER_REGISTRY } from "../../lib/cipher/registry";

const TOTAL_QUESTIONS = 10;
const TIME_LIMIT = 60;

export default function ChallengeMode() {
  const [answer, setAnswer] = useState("");
  const [expectedCiphertext, setExpectedCiphertext] = useState("");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const { runCipher, loading, error } = useCipherWorker();
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load best score safely
  useEffect(() => {
    const saved = localStorage.getItem('cryptoviz_best_score');
    if (saved) {
      setBestScore(parseInt(saved, 10));
    }
    setIsHydrated(true);
  }, []);

  const generateNextChallenge = useCallback(async (isMounted: () => boolean) => {
    try {
      if (isMounted()) {
        setExpectedCiphertext("");
        setTimeLeft(TIME_LIMIT);
      }
      
      const newChallenge = generateChallengeData();
      if (isMounted()) setChallenge(newChallenge);
      
      const result = await runCipher('encrypt', newChallenge.cipherId, newChallenge.plaintext, newChallenge.key);
      if (isMounted()) {
        setExpectedCiphertext(result.output);
      }
    } catch (err) {
      console.error("Worker failed to generate challenge:", err);
    }
  }, [runCipher]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    generateNextChallenge(() => mounted);
    
    return () => {
      mounted = false;
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, [generateNextChallenge]);

  // Save best score when session completes
  useEffect(() => {
    if (currentQuestion > TOTAL_QUESTIONS && isHydrated) {
      setBestScore(prev => {
        if (score > prev) {
          localStorage.setItem('cryptoviz_best_score', score.toString());
          return score;
        }
        return prev;
      });
    }
  }, [currentQuestion, score, isHydrated]);

  const advanceChallenge = useCallback(() => {
    if (currentQuestion < TOTAL_QUESTIONS) {
      setCurrentQuestion(q => q + 1);
      generateNextChallenge(() => true);
    } else {
      setCurrentQuestion(q => q + 1);
    }
  }, [currentQuestion, generateNextChallenge]);

  const handleTimeout = useCallback(() => {
    setFeedback('idle');
    setAnswer('');
    advanceChallenge();
  }, [advanceChallenge]);

  // Countdown timer effect
  useEffect(() => {
    if (!challenge || currentQuestion > TOTAL_QUESTIONS || feedback === 'correct' || loading) return;
    
    if (timeLeft === 0) {
      handleTimeout();
      return;
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [challenge, currentQuestion, feedback, loading, timeLeft, handleTimeout]);

  const resetSession = () => {
    setCurrentQuestion(1);
    setScore(0);
    setFeedback('idle');
    setAnswer('');
    setChallenge(null);
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    generateNextChallenge(() => true);
  };

  if (!challenge || !isHydrated) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 flex justify-center items-center h-64">
        <span className="text-zinc-500 animate-pulse font-medium">Initializing Challenge Engine...</span>
      </div>
    );
  }

  const cipherName = CIPHER_REGISTRY.find(c => c.id === challenge.cipherId)?.name || 'Cipher';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !!error || !challenge || feedback === 'correct') return;
    
    const normalizedUser = answer.trim().toUpperCase();
    const normalizedExpected = challenge.plaintext.trim().toUpperCase();
    
    if (normalizedUser === normalizedExpected) {
      setFeedback('correct');
      setScore(s => s + 100);
      
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setFeedback('idle');
        setAnswer('');
        advanceChallenge();
      }, 1000);
    } else {
      setFeedback('incorrect');
    }
  };

  if (currentQuestion > TOTAL_QUESTIONS) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Challenge Complete!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            You successfully solved {TOTAL_QUESTIONS} ciphers.
          </p>
          <div className="text-5xl font-bold text-teal-600 dark:text-teal-400 py-6">
            {score} pts
          </div>
          {score > 0 && score >= bestScore && (
            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
              New Best Score!
            </div>
          )}
          <button 
            type="button"
            className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:focus:ring-offset-zinc-900"
            onClick={resetSession}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Category</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-white">Classical Ciphers</span>
          </div>
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Best Score</span>
            <span className="text-lg font-bold text-teal-600 dark:text-teal-400">{bestScore}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Time</span>
            <span className={`text-lg font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-white'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
          <div className="flex flex-col">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Score</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-white">{score}</span>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2.5">
        <div className="bg-teal-600 dark:bg-teal-400 h-2.5 rounded-full transition-all duration-500" style={{ width: `${((currentQuestion - 1) / TOTAL_QUESTIONS) * 100}%` }}></div>
      </div>

      {/* Challenge Box */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="bg-zinc-100 dark:bg-zinc-950 p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-200">Question {currentQuestion} of {TOTAL_QUESTIONS}</h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{cipherName}</span>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-zinc-700 dark:text-zinc-300 text-lg">
            Decrypt the following text using the key <strong>{challenge.key}</strong>.
          </p>
          
          <div className="bg-zinc-50 dark:bg-zinc-950 p-6 rounded-lg font-mono text-center text-2xl tracking-widest text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 break-all min-h-[5rem] flex items-center justify-center">
            {error ? (
              <span className="text-red-500 text-base">{error}</span>
            ) : loading || !expectedCiphertext ? (
              <span className="text-zinc-400 dark:text-zinc-600 animate-pulse text-base tracking-normal">Generating challenge...</span>
            ) : (
              expectedCiphertext
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Your Answer
              </label>
              <input
                id="answer"
                type="text"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  if (feedback !== 'idle') setFeedback('idle');
                }}
                placeholder="Enter plaintext..."
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-transparent outline-none transition-shadow uppercase font-mono text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                autoComplete="off"
                spellCheck="false"
                disabled={loading || !!error || feedback === 'correct'}
              />
            </div>
            
            {feedback === 'correct' && (
              <div aria-live="polite" className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 text-center font-medium">
                Correct! Well done.
              </div>
            )}
            
            {feedback === 'incorrect' && (
              <div aria-live="polite" className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/30 text-center font-medium">
                Incorrect. Try again!
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !!error || feedback === 'correct' || !answer.trim()}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Answer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
