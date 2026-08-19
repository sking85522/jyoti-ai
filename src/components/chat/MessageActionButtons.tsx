import React, { useState } from 'react';
import { Volume2, VolumeX, Check, Copy } from 'lucide-react';

export const MessageActionButtons = ({
  text,
  msgId,
  isSpeaking,
  onToggleSpeak
}: {
  text: string;
  msgId: string;
  isSpeaking: boolean;
  onToggleSpeak: (id: string, text: string) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1.5 mt-2.5 self-end shrink-0">
      <button
        onClick={() => onToggleSpeak(msgId, text)}
        className={`px-2 py-1 rounded-lg border transition-all duration-300 flex items-center gap-1.5 text-xs ${
          isSpeaking
            ? 'bg-[#00ffcc]/20 border-[#00ffcc] text-[#00ffcc] animate-pulse shadow-[0_0_12px_rgba(0,255,204,0.4)] font-medium'
            : 'bg-[#050510] border-[#00ffcc]/30 hover:bg-[#00ffcc]/10 text-[#00ffcc]'
        }`}
        title={isSpeaking ? "वॉइस बंद करें (Stop Reading)" : "AI की आवाज़ में सुनें (Read Aloud)"}
      >
        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
        <span className="text-[11px]">{isSpeaking ? 'Speaking...' : 'Listen'}</span>
      </button>

      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg bg-[#050510] border border-[#00ffcc]/30 hover:bg-[#00ffcc]/10 text-[#00ffcc] shadow-[0_0_8px_rgba(0,255,204,0.1)] transition-all duration-300"
        title="Copy response"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
};
