import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, CheckCircle2, XCircle, RefreshCw, Maximize2, ArrowLeft, Languages, BrainCircuit } from 'lucide-react';

export interface QuizData {
  topic_en?: string;
  topic_hi?: string;
  questions: {
    question?: string;
    question_en?: string;
    question_hi?: string;
    options?: string[];
    options_en?: string[];
    options_hi?: string[];
    correctIndex: number;
    extraInfo?: string;
    extraInfo_en?: string;
    extraInfo_hi?: string;
  }[];
}

interface QuizPlayerProps {
  quizData: QuizData;
  messageId: string;
  onAnalyze?: (score: number, total: number, quizData: QuizData) => void;
}

export function QuizPlayer({ quizData, messageId, onAnalyze }: QuizPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lang, setLang] = useState<'en' | 'hi'>('hi');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<Record<number, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);

  const hasBilingual = Boolean(quizData?.questions?.[0]?.question_hi);

  useEffect(() => {
    const saved = localStorage.getItem(`quizState_${messageId}`);
    if (saved) {
      try {
        const { selected, submitted, summary, savedLang } = JSON.parse(saved);
        setSelectedOptions(selected || {});
        setIsSubmitted(submitted || {});
        setShowSummary(summary || false);
        if (savedLang) setLang(savedLang);
      } catch (e) { }
    }
  }, [messageId]);

  useEffect(() => {
    localStorage.setItem(`quizState_${messageId}`, JSON.stringify({
      selected: selectedOptions,
      submitted: isSubmitted,
      summary: showSummary,
      savedLang: lang
    }));
  }, [selectedOptions, isSubmitted, showSummary, lang, messageId]);

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return <div className="p-4 bg-zinc-900 rounded-lg text-red-400">Invalid Quiz Data</div>;
  }

  const getTopic = () => {
    if (lang === 'hi' && quizData.topic_hi) return quizData.topic_hi;
    if (quizData.topic_en) return quizData.topic_en;
    return "Interactive Quiz";
  };

  // Preview card inside the chat thread
  if (!isFullscreen) {
    return (
      <div className="bg-[#0c0d1a] border border-[#00ffcc]/30 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-2 max-w-full shadow-[0_0_12px_rgba(0,255,204,0.08)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/40 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3 className="text-white font-bold text-base leading-tight">{getTopic()}</h3>
            <p className="text-zinc-400 text-xs mt-0.5">{quizData.questions.length} Questions • Tap to Attempt</p>
          </div>
        </div>
        <button 
          onClick={() => setIsFullscreen(true)} 
          className="bg-[#00ffcc] hover:bg-[#00e6b8] text-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.3)] active:scale-95"
        >
          <Maximize2 size={16} />
          Attempt Quiz
        </button>
      </div>
    );
  }

  const q = quizData.questions[currentIndex];
  const displayQuestion = (lang === 'hi' && q.question_hi) ? q.question_hi : (q.question_en || q.question);
  const displayOptions = (lang === 'hi' && q.options_hi) ? q.options_hi : (q.options_en || q.options || []);
  const displayExtraInfo = (lang === 'hi' && q.extraInfo_hi) ? q.extraInfo_hi : (q.extraInfo_en || q.extraInfo);

  const isAnswered = Boolean(isSubmitted[currentIndex]);
  const selected = selectedOptions[currentIndex];
  const isCorrect = selected === q.correctIndex;

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOptions(prev => ({ ...prev, [currentIndex]: idx }));
    setIsSubmitted(prev => ({ ...prev, [currentIndex]: true }));
  };

  const handleNext = () => {
    if (currentIndex < quizData.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOptions({});
    setIsSubmitted({});
    setShowSummary(false);
  };
  
  const currentScore = Object.values(selectedOptions).reduce((acc, val, i) => {
    return acc + (val === quizData.questions[i]?.correctIndex ? 1 : 0);
  }, 0);

  const handleAnalyze = () => {
    if (onAnalyze) {
      onAnalyze(currentScore, quizData.questions.length, quizData);
      setIsFullscreen(false);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="fixed inset-0 z-[100] bg-[#050614] flex flex-col text-zinc-100 overflow-hidden font-sans">
      {/* Top Bar Header */}
      <header className="h-14 sm:h-16 border-b border-[#00ffcc]/20 bg-[#0a0b1e] flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-md">
        <button 
          onClick={() => setIsFullscreen(false)}
          className="flex items-center gap-1.5 text-zinc-300 hover:text-[#00ffcc] transition-colors py-1 px-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs sm:text-sm font-medium"
        >
          <ArrowLeft size={16} />
          <span>Back to AI</span>
        </button>
        
        <div className="flex items-center gap-2 max-w-[50%] sm:max-w-[60%] text-center">
          <h2 className="text-white font-bold text-sm sm:text-base truncate">
            {getTopic()}
          </h2>
          <span className="bg-[#ff00ff]/20 text-[#ff00ff] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#ff00ff]/30 shrink-0 font-mono hidden sm:inline-block">
            {currentIndex + 1}/{quizData.questions.length}
          </span>
        </div>
        
        <div>
          {hasBilingual ? (
            <button 
              onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/40 text-[#00ffcc] rounded-lg text-xs font-bold transition-all shadow-[0_0_8px_rgba(0,255,204,0.15)]"
            >
              <Languages size={14} />
              <span>{lang === 'en' ? 'हिंदी' : 'EN'}</span>
            </button>
          ) : (
            <div className="w-12"></div>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row w-full max-w-6xl mx-auto">
        
        {showSummary ? (
          /* Summary View */
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="bg-[#0b0c22] rounded-3xl overflow-hidden border border-[#00ffcc]/30 shadow-[0_0_30px_rgba(0,255,204,0.12)] max-w-md w-full">
              <div className="bg-gradient-to-br from-[#00ffcc]/20 via-[#0b0c22] to-[#ff00ff]/20 p-6 sm:p-8 text-center relative">
                <span className="inline-block px-3 py-1 rounded-full bg-[#00ffcc]/10 text-[#00ffcc] text-xs font-bold border border-[#00ffcc]/30 mb-3">
                  QUIZ COMPLETE
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white">Your Score</h3>
                <div className="text-5xl sm:text-6xl font-black text-[#00ffcc] my-4 tracking-tight drop-shadow-[0_0_12px_rgba(0,255,204,0.4)]">
                  {currentScore} <span className="text-2xl text-zinc-400 font-medium">/ {quizData.questions.length}</span>
                </div>
                <p className="text-zinc-300 text-xs sm:text-sm">
                  {currentScore === quizData.questions.length ? "Perfect score! Outstanding work! 🎉" :
                   currentScore >= quizData.questions.length * 0.7 ? "Great job! Keep it up! 👍" : "Good effort! Review the questions to improve! 💪"}
                </p>
              </div>

              <div className="p-5 sm:p-6 flex flex-col gap-3 border-t border-zinc-800/80">
                {onAnalyze && (
                  <button 
                    onClick={handleAnalyze}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#ff00ff]/20 hover:bg-[#ff00ff]/30 text-[#ff00ff] border border-[#ff00ff]/50 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(255,0,255,0.2)]"
                  >
                    <BrainCircuit size={18} />
                    Analyze Performance with AI
                  </button>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={handleRestart}
                    className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={16} />
                    Retake
                  </button>
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    className="flex-1 py-3 px-4 bg-[#00ffcc] hover:bg-[#00e6b8] text-black rounded-xl font-bold text-sm transition-all shadow-[0_0_12px_rgba(0,255,204,0.3)]"
                  >
                    Return to AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Question View */
          <>
            {/* Top / Left Navigation Bar */}
            <nav className="bg-[#080918] border-b md:border-b-0 md:border-r border-[#00ffcc]/15 p-3 md:p-5 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 scrollbar-none items-center md:items-start">
              <div className="hidden md:flex flex-col mb-3 w-full border-b border-zinc-800/80 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Questions</span>
                <span className="text-xs text-[#00ffcc] font-mono mt-0.5">Question {currentIndex + 1} of {quizData.questions.length}</span>
              </div>

              <div className="flex flex-row md:flex-wrap gap-2">
                {quizData.questions.map((_, i) => {
                  const isCurrent = currentIndex === i;
                  const isAns = Boolean(isSubmitted[i]);
                  const isCorr = isAns && selectedOptions[i] === quizData.questions[i]?.correctIndex;

                  let badgeClass = "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800";
                  if (isCurrent) {
                    badgeClass = "bg-[#00ffcc] text-black border-[#00ffcc] font-black shadow-[0_0_10px_rgba(0,255,204,0.5)] scale-105";
                  } else if (isAns) {
                    badgeClass = isCorr 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-600/60" 
                      : "bg-red-950 text-red-400 border-red-600/60";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm border transition-all shrink-0 ${badgeClass}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Main Question & Options Container */}
            <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto flex flex-col justify-between">
              <div className="max-w-2xl w-full mx-auto flex flex-col gap-4 sm:gap-6">
                
                {/* Header status bar */}
                <div className="flex items-center justify-between gap-2 bg-[#0b0c22] px-3.5 py-2 rounded-xl border border-zinc-800 text-xs">
                  <span className="font-bold text-[#00ffcc] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00ffcc]"></span>
                    Question {currentIndex + 1}
                  </span>

                  {isAnswered ? (
                    <span className={`font-bold px-2.5 py-0.5 rounded-md ${isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                      {isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                    </span>
                  ) : (
                    <span className="text-zinc-400 italic">Select an option</span>
                  )}
                </div>

                {/* Question Text */}
                <div className="bg-[#0a0b1e] p-4 sm:p-6 rounded-2xl border border-zinc-800 shadow-md">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white leading-relaxed">
                    {displayQuestion}
                  </h3>
                </div>

                {/* Options List */}
                <div className="flex flex-col gap-2.5">
                  {displayOptions.map((opt, i) => {
                    const isSelected = selected === i;
                    const isOptCorrect = i === q.correctIndex;
                    const label = optionLabels[i] || (i + 1).toString();

                    let btnStyles = "bg-[#0a0b1e]/90 border-zinc-800 text-zinc-200 hover:border-[#00ffcc]/40 hover:bg-[#00ffcc]/5";
                    let labelStyles = "bg-zinc-800 text-zinc-400";

                    if (isAnswered) {
                      if (isOptCorrect) {
                        btnStyles = "bg-emerald-950/60 border-emerald-500 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.2)]";
                        labelStyles = "bg-emerald-500 text-black font-black";
                      } else if (isSelected && !isOptCorrect) {
                        btnStyles = "bg-red-950/60 border-red-500 text-red-100";
                        labelStyles = "bg-red-500 text-white font-black";
                      } else {
                        btnStyles = "bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-50";
                        labelStyles = "bg-zinc-900 text-zinc-600";
                      }
                    } else if (isSelected) {
                      btnStyles = "bg-[#00ffcc]/10 border-[#00ffcc] text-white";
                      labelStyles = "bg-[#00ffcc] text-black font-black";
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelect(i)}
                        disabled={isAnswered}
                        className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-150 flex items-center gap-3 text-sm sm:text-base ${btnStyles}`}
                      >
                        <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-colors ${labelStyles}`}>
                          {label}
                        </span>
                        <span className="flex-1 font-medium leading-snug">{opt}</span>
                        {isAnswered && isOptCorrect && (
                          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                        )}
                        {isAnswered && isSelected && !isOptCorrect && (
                          <XCircle size={20} className="text-red-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {isAnswered && displayExtraInfo && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs sm:text-sm text-blue-200">
                        <span className="font-bold text-blue-400 block mb-1">💡 Explanation:</span>
                        <p className="leading-relaxed">{displayExtraInfo}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Bottom Nav Actions */}
              <div className="max-w-2xl w-full mx-auto flex items-center justify-between gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold text-xs sm:text-sm transition-colors flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>

                <button
                  onClick={handleNext}
                  disabled={!isAnswered}
                  className="px-5 py-2.5 bg-[#00ffcc] hover:bg-[#00e6b8] text-black rounded-xl font-bold text-xs sm:text-sm transition-all shadow-[0_0_12px_rgba(0,255,204,0.3)] flex items-center gap-1 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
                >
                  <span>{currentIndex === quizData.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</span>
                  <ChevronRight size={16} />
                </button>
              </div>

            </main>
          </>
        )}

      </div>
    </div>
  );
}
