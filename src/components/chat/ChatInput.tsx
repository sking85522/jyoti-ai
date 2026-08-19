import React, { useRef } from 'react';
import { Paperclip, MicOff, Mic, PhoneOff, Phone, Send, X, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  handleSend: () => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachedFile: any;
  setAttachedFile: (f: any) => void;
  isProcessing: boolean;
  isLiveActive: boolean;
  isMicListening: boolean;
  toggleMicListening: () => void;
  toggleLiveVoice: () => void;
}

export const ChatInput = ({
  input, setInput, handleSend, handleFileUpload, attachedFile, setAttachedFile,
  isProcessing, isLiveActive, isMicListening, toggleMicListening, toggleLiveVoice
}: ChatInputProps) => {
  const docInputRef = useRef<HTMLInputElement>(null);

  return (
    <footer className="p-4 sm:p-6 bg-[#0a0a1a] border-t border-[#00ffcc]/20 transition-colors duration-500 z-20">
      <div className="max-w-4xl mx-auto relative">
        <AnimatePresence>
          {isMicListening && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute -top-12 left-4 bg-red-950/90 text-red-300 border border-red-500/50 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.3)] z-30"
            >
              <Radio size={14} className="animate-pulse text-red-400" />
              <span className="font-medium">बोलते रहें, आपकी आवाज़ टेक्स्ट में बदल रही है...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {attachedFile && (
          <div className="absolute -top-14 left-4 bg-[#1a1a3a] text-[#ff00ff] border border-[#ff00ff]/50 rounded-lg p-2 flex items-center gap-3 shadow-lg">
            <div className="w-8 h-8 bg-black/20 rounded flex items-center justify-center">
              <Paperclip size={16} />
            </div>
            <span className="text-sm max-w-[150px] truncate">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )}

        {input.length > 0 && (
          <div className="absolute -top-6 right-4 text-[10px] font-mono text-[#00ffcc]/60 bg-[#0a0a1a] px-2 py-0.5 rounded-t-lg border-t border-l border-r border-[#00ffcc]/20">
            {input.length} chars | {input.trim().split(/\s+/).filter(Boolean).length} words
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2 bg-[#111122] border border-[#00ffcc]/50 focus-within:border-[#ff00ff] focus-within:shadow-[0_0_15px_rgba(255,0,255,0.3)] rounded-[32px] p-1.5 sm:p-2 transition-all duration-300 relative">
          <input
            type="file"
            accept=".txt,.pdf,.doc,.docx,.json,.md,.csv,image/*"
            className="hidden"
            ref={docInputRef}
            onChange={handleFileUpload}
          />
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pb-0.5 sm:pb-0">
            <button
              onClick={() => docInputRef.current?.click()}
              className="p-2 sm:p-3 opacity-70 hover:opacity-100 rounded-full transition-colors shrink-0"
              title="फ़ाइल या चित्र संलग्न करें (Text & Images)"
            >
              <Paperclip size={18} className="sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={toggleMicListening}
              className={`p-2 sm:p-3 rounded-full transition-all shrink-0 relative ${
                isMicListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-[#00ffcc]/10 text-[#00ffcc] hover:bg-[#00ffcc]/20 border border-[#00ffcc]/30'
              }`}
              title={isMicListening ? "सुन रहे हैं... बंद करने के लिए क्लिक करें" : "बोलकर टाइप करें (Voice Input)"}
            >
              {isMicListening ? <MicOff size={18} className="sm:w-5 sm:h-5" /> : <Mic size={18} className="sm:w-5 sm:h-5" />}
              {isMicListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={toggleLiveVoice}
              className={`p-2 sm:p-3 rounded-full transition-colors shrink-0 ${
                isLiveActive ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 border border-indigo-500/30'
              }`}
              title="लाइव कॉल (Voice Call Mode)"
            >
              {isLiveActive ? <PhoneOff size={18} className="sm:w-5 sm:h-5" /> : <Phone size={18} className="sm:w-5 sm:h-5" />}
            </button>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isMicListening ? "🎤 आपकी आवाज़ सुनी जा रही है..." : isLiveActive ? "कॉल चालू है..." : "ज्योति से बोलकर या लिखकर पूछें..."}
            disabled={isLiveActive}
            className="w-full bg-transparent border-none focus:outline-none resize-none max-h-32 py-2 sm:py-3 px-1 sm:px-2 placeholder:opacity-50 text-[#e3e3e3] text-sm sm:text-base"
            rows={1}
            style={{ minHeight: '40px' }}
          />

          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachedFile) || isProcessing || isLiveActive}
            className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-[#00ffcc] rounded-full transition-colors shrink-0 mb-0.5 sm:mb-0 mr-0.5"
          >
            <Send size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
