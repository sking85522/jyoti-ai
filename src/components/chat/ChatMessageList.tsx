import React from 'react';
import { Bot, User, Loader2, Sparkles, Mic, MicOff, PhoneOff, Video, VideoOff, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../../types/chat';
import { AnimatedMarkdown } from './MessageFormatter';
import { MessageActionButtons } from './MessageActionButtons';
import { QuizPlayer } from '../QuizPlayer';

interface ChatMessageListProps {
  messages: Message[];
  isLoadingHistory: boolean;
  isExtractingText: boolean;
  isProcessing: boolean;
  isLiveActive: boolean;
  currentChatId: string | null;
  chatSummary?: string;
  speakingMsgId: string | null;
  speakMessage: (id: string, text: string) => void;
  isMuted: boolean;
  isCameraOff: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleLiveVoice: () => void;
  handleSend: (overrideInput?: string, overrideFile?: any) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  mainRef: React.RefObject<HTMLElement>;
  handleScroll: (e: React.UIEvent<HTMLElement>) => void;
}

export const ChatMessageList = ({
  messages, isLoadingHistory, isExtractingText, isProcessing, isLiveActive, currentChatId, chatSummary,
  speakingMsgId, speakMessage, isMuted, isCameraOff, toggleMute, toggleCamera, toggleLiveVoice, handleSend, setMessages,
  messagesEndRef, mainRef, handleScroll
}: ChatMessageListProps) => {
  const autoScrollRef = React.useRef(true);
  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6" ref={mainRef} onScroll={handleScroll}>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">

        {currentChatId && (
          <div className="p-3.5 rounded-2xl bg-[#07071c]/90 border border-[#00ffcc]/30 shadow-[0_0_15px_rgba(0,255,204,0.08)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-[#00ffcc]/10 text-[#00ffcc]"><ListChecks size={15} /></span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#00ffcc]">Live Topic Context & Process Tracker</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">Auto-Updated by AI</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-mono">
              {chatSummary || '📌 Topic & Progress Context: Starting conversation...'}
            </p>
          </div>
        )}

        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-12 text-[#00ffcc]/70 gap-2 text-sm">
            <Loader2 size={20} className="animate-spin" />
            <span>चैट लोड की जा रही है...</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div key={`${msg.id}_${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 text-[15px] leading-relaxed transition-colors duration-500 flex flex-col ${msg.role === 'user' ? 'bg-[#1a1a3a] text-[#ff00ff] border border-[#ff00ff]/50 shadow-[0_0_10px_rgba(255,0,255,0.2)] rounded-3xl rounded-tr-sm' : 'bg-[#050510] text-[#00ffcc] border border-[#00ffcc]/30 shadow-[0_0_10px_rgba(0,255,204,0.1)] rounded-3xl rounded-tl-sm w-full overflow-x-auto'}`}>
                    {(() => {
                      if (msg.role === 'user' && msg.content.includes('[QUIZ_DATA]')) {
                        const isAnalysis = msg.content.includes('Please analyze my recent quiz performance');
                        const dateObj = new Date();
                        return (
                          <div className="flex flex-col gap-2 opacity-90">
                            <span className="font-bold text-[#ff00ff] uppercase tracking-wider text-xs">{isAnalysis ? '🧠 AI Analysis Request' : '📄 Quiz Generation Request'}</span>
                            <p className="whitespace-pre-wrap italic">{isAnalysis ? 'Requested a detailed performance analysis.' : 'Asked AI to generate a quiz.'}</p>
                            <span className="text-[10px] text-[#ff00ff]/70">{dateObj.toLocaleString()}</span>
                          </div>
                        );
                      }

                      if (msg.role === 'ai' && msg.content.includes('[QUIZ_DATA]')) {
                        try {
                          const match = msg.content.match(/\[QUIZ_DATA\]([\s\S]*?)\[\/QUIZ_DATA\]/);
                          if (match && match[1]) {
                            const quizData = JSON.parse(match[1]);
                            const textBefore = msg.content.substring(0, match.index);
                            const textAfter = msg.content.substring(match.index! + match[0].length);
                            return (
                              <>
                                {textBefore.trim() && <AnimatedMarkdown content={textBefore} isTyping={msg.isTyping} />}
                                <QuizPlayer
                                  quizData={quizData}
                                  messageId={msg.id}
                                  onAnalyze={(score, total, qData) => {
                                    const analysisPrompt = `Please analyze my recent quiz performance. I scored ${score} out of ${total} on the quiz about "${qData.topic_en || "the recent quiz"}".`;
                                    handleSend(analysisPrompt, null);
                                  }}
                                />
                                {textAfter.trim() && <AnimatedMarkdown content={textAfter} isTyping={msg.isTyping} />}
                              </>
                            );
                          }
                        } catch (e) {
                          console.error("Quiz Parse error", e);
                        }
                      }

                      return msg.role === 'ai' ? (
                        <AnimatedMarkdown
                          content={msg.content}
                          isTyping={msg.isTyping}
                          onComplete={() => { if (msg.isTyping) setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m)); }}
                          onType={() => {
                            if (autoScrollRef && autoScrollRef.current) {
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      );
                    })()}
                    {msg.role === 'ai' && !msg.isTyping && !msg.content.includes('[QUIZ_DATA]') && (
                      <MessageActionButtons text={msg.content} msgId={msg.id} isSpeaking={speakingMsgId === msg.id} onToggleSpeak={speakMessage} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isExtractingText && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center my-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              चित्र/PDF से टेक्स्ट निकाला जा रहा है...
            </div>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-[#00ffcc] animate-pulse" />
            </div>
            <div className="px-5 py-3.5 rounded-2xl bg-[#050510] border border-[#00ffcc]/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse delay-75"></span>
              <span className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse delay-150"></span>
            </div>
          </motion.div>
        )}

        {isLiveActive && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center my-8">
            <div className="flex flex-col items-center gap-4 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <div className="relative flex items-center justify-center">
                 <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full animate-ping"></div>
                 <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg z-10 text-white"><Mic size={32} className="animate-pulse" /></div>
              </div>
              <p className="text-indigo-400 font-medium tracking-wide">ज्योति सुन रही है... (Live Call Active)</p>
              <div className="flex gap-4 mt-2">
                 <button onClick={toggleMute} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500' : 'bg-zinc-800'}`}>{isMuted ? <MicOff size={20} /> : <Mic size={20} />}</button>
                 <button onClick={toggleCamera} className={`p-3 rounded-full transition-colors ${isCameraOff ? 'bg-red-500' : 'bg-zinc-800'}`}>{isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}</button>
              </div>
              <button onClick={toggleLiveVoice} className="px-6 py-2 mt-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium shadow-lg transition-colors flex items-center gap-2">
                <PhoneOff size={16} /> End Call
              </button>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </main>
  );
};
