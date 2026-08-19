import { useState, useRef, useEffect } from 'react';

export function useSpeech(preferredLang: string) {
  const [isMicListening, setIsMicListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoReadAloud, setAutoReadAloud] = useState(() => {
    try {
      return localStorage.getItem('jyoti_ai_auto_read') === 'true';
    } catch {
      return false;
    }
  });

  const recognitionRef = useRef<any>(null);
  const wasVoiceInputRef = useRef(false);

  const toggleAutoRead = () => {
    setAutoReadAloud(prev => {
      const next = !prev;
      try { localStorage.setItem('jyoti_ai_auto_read', String(next)); } catch (e) {}
      if (!next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
      }
      return next;
    });
  };

  const speakMessage = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' [कोड ब्लॉक] ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*#_~>]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 1000));
    const isHindi = /[\u0900-\u097F]/.test(cleanText);

    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => isHindi ? v.lang.includes('hi') : (v.lang.includes('en-IN') || v.lang.includes('en')));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setSpeakingMsgId(msgId);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  const toggleMicListening = (setInput: (input: string) => void) => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert("आपका ब्राउज़र स्पीच रिकग्निशन को सपोर्ट नहीं करता है। कृपया Google Chrome का उपयोग करें।");
      return;
    }

    if (isMicListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsMicListening(false);
      return;
    }

    try {
      wasVoiceInputRef.current = true;
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = preferredLang === 'hindi' ? 'hi-IN' : preferredLang === 'english' ? 'en-US' : 'hi-IN';

      rec.onstart = () => setIsMicListening(true);

      rec.onresult = (event: any) => {
        let liveTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          liveTranscript += event.results[i][0].transcript;
        }
        if (liveTranscript) {
          setInput(liveTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        setIsMicListening(false);
      };

      rec.onend = () => setIsMicListening(false);

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsMicListening(false);
    }
  };

  return {
    isMicListening,
    setIsMicListening,
    speakingMsgId,
    autoReadAloud,
    toggleAutoRead,
    speakMessage,
    toggleMicListening,
    recognitionRef,
    wasVoiceInputRef
  };
}
