import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Bot, User, Loader2, Sparkles, Paperclip, X, 
  Phone, PhoneOff, CheckCircle2, AlertCircle, Copy, Check, ArrowDown,
  Plus, Trash2, Edit2, MessageSquare, PanelLeft, PanelLeftClose, LogOut,
  Calendar, ListChecks, Compass, Settings, Sliders, Volume2, VolumeX, Radio, Video, VideoOff, FileQuestion
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Tesseract from 'tesseract.js';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as pdfjsLib from 'pdfjs-dist';

import { QuizToolModal } from '../components/QuizToolModal';
import { QuizPlayer } from '../components/QuizPlayer';

import { 
  ref, set, update, remove, onValue 
} from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { auth, rtdb, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import SettingsModal from '../components/SettingsModal';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isTyping?: boolean;
};

type ChatThread = {
  id: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
};

// Safe Realtime Database Wrappers
const safeRtdbSet = async (path: string, data: any) => {
  try {
    await set(ref(rtdb, path), data);
  } catch (err) {
    console.warn("RTDB set permission warning (fallback to LocalStorage active):", err);
  }
};

const safeRtdbUpdate = async (path: string, data: any) => {
  try {
    await update(ref(rtdb, path), data);
  } catch (err) {
    console.warn("RTDB update permission warning (fallback to LocalStorage active):", err);
  }
};

const safeRtdbDelete = async (path: string) => {
  try {
    await remove(ref(rtdb, path));
  } catch (err) {
    console.warn("RTDB remove permission warning (fallback to LocalStorage active):", err);
  }
};

// LocalStorage Persistence Helpers
const getChatsStorageKey = (uid: string) => `jyoti_chats_${uid}`;
const getMessagesStorageKey = (uid: string, chatId: string) => `jyoti_msgs_${uid}_${chatId}`;

const getLocalChats = (uid: string): ChatThread[] => {
  try {
    const raw = localStorage.getItem(getChatsStorageKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalChats = (uid: string, chats: ChatThread[]) => {
  try {
    localStorage.setItem(getChatsStorageKey(uid), JSON.stringify(chats));
  } catch (e) {
    console.error("LocalStorage save error:", e);
  }
};

const getLocalMessages = (uid: string, chatId: string): Message[] => {
  try {
    const raw = localStorage.getItem(getMessagesStorageKey(uid, chatId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalMessages = (uid: string, chatId: string, msgs: Message[]) => {
  try {
    localStorage.setItem(getMessagesStorageKey(uid, chatId), JSON.stringify(msgs));
  } catch (e) {
    console.error("LocalStorage save error:", e);
  }
};

const CodeBlock = ({ className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (match) {
    return (
      <div className="relative group rounded-lg overflow-hidden my-4 border border-[#00ffcc]/30 shadow-md">
        <div className="flex items-center justify-between px-4 py-2 bg-[#050510] border-b border-[#00ffcc]/20">
          <span className="text-xs text-[#00ffcc]/70 font-mono lowercase">{match[1]}</span>
          <button 
            onClick={handleCopy} 
            className="flex items-center gap-1 text-xs text-[#00ffcc]/70 hover:text-[#00ffcc] transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
        <div className="p-4 bg-[#0a0a1a] overflow-x-auto text-sm font-mono text-gray-300">
          <pre {...props}>
            <code>{children}</code>
          </pre>
        </div>
      </div>
    );
  }
  return (
    <code className="bg-black/30 text-[#ff00ff] px-1.5 py-0.5 rounded font-mono text-[0.9em]" {...props}>
      {children}
    </code>
  );
};

const AnimatedMarkdown = ({ content, isTyping, onComplete, onType }: { content: string, isTyping?: boolean, onComplete?: () => void, onType?: () => void }) => {
  const [displayedText, setDisplayedText] = useState(isTyping ? '' : content);
  const onCompleteRef = useRef(onComplete);
  const onTypeRef = useRef(onType);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTypeRef.current = onType;
  }, [onComplete, onType]);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(content);
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(content.slice(0, i + 3));
      i += 3;
      onTypeRef.current?.();
      if (i >= content.length) {
        clearInterval(interval);
        setDisplayedText(content);
        onCompleteRef.current?.();
      }
    }, 15);
    return () => clearInterval(interval);
  }, [content, isTyping]);

  return (
    <div className="markdown-body">
      <Markdown 
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({children}) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({children}) => <ul className="list-disc ml-5 mb-3 space-y-1">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal ml-5 mb-3 space-y-1">{children}</ol>,
          li: ({children}) => <li className="leading-relaxed">{children}</li>,
          h1: ({children}) => <h1 className="text-2xl font-bold mb-3 mt-4">{children}</h1>,
          h2: ({children}) => <h2 className="text-xl font-bold mb-3 mt-4">{children}</h2>,
          h3: ({children}) => <h3 className="text-lg font-bold mb-2 mt-3">{children}</h3>,
          a: ({href, children}) => <a href={href} target="_blank" rel="noreferrer" className="underline hover:opacity-80">{children}</a>,
          code: CodeBlock
        }}
      >
        {displayedText + (isTyping ? ' ▍' : '')}
      </Markdown>
    </div>
  );
};

const MessageActionButtons = ({ 
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

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Settings & Profile states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(() => {
    try {
      return localStorage.getItem('jyoti_ai_custom_instructions') || '';
    } catch (e) {
      return '';
    }
  });
  const [preferredLang, setPreferredLang] = useState(() => {
    try {
      return localStorage.getItem('jyoti_ai_preferred_lang') || 'auto';
    } catch (e) {
      return 'auto';
    }
  });

  const handleSaveCustomInstructions = (val: string) => {
    setCustomInstructions(val);
    try {
      localStorage.setItem('jyoti_ai_custom_instructions', val);
    } catch (e) {}
  };

  const handleSavePreferredLang = (val: string) => {
    setPreferredLang(val);
    try {
      localStorage.setItem('jyoti_ai_preferred_lang', val);
    } catch (e) {}
  };

  const handleClearAllChats = async () => {
    const uid = currentUser?.uid || 'guest';
    setChats([]);
    setCurrentChatId(null);
    setMessages([
      {
        id: '1',
        role: 'ai',
        content: 'नमस्ते! मैं ज्योति (Jyoti) हूँ। मैंने आपकी पुरानी सभी चैट्स और हिस्ट्री डिलीट कर दी है। अब आप एक नई शुरुआत कर सकते हैं!'
      }
    ]);

    try {
      // Safely collect all keys from localStorage first to avoid mutation index shifting
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('jyoti_chats_') || 
          key.startsWith('jyoti_msgs_') || 
          key.startsWith('jyoti_ai_msgs_') ||
          key.startsWith('quizState_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {
      console.warn("LocalStorage clear error:", err);
    }

    if (currentUser) {
      await safeRtdbSet(`users/${currentUser.uid}/chats`, null);
      await safeRtdbSet(`users/${currentUser.uid}/messages`, null);
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: 'नमस्ते! मैं ज्योति (Jyoti) हूँ। मैं एक AI असिस्टेंट हूँ। मैं आपकी कैसे मदद कर सकती हूँ?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{name: string, content: string, type: string} | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{ id: string; title: string } | null>(null);
  
  // Live Voice State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const liveWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const liveRecRef = useRef<any>(null);
  const currentLiveAiMsgIdRef = useRef<string | null>(null);
  const currentLiveAiTextRef = useRef<string>('');

  // Speech Recognition & TTS Voice Synthesis States
  const [isMicListening, setIsMicListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
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

    utterance.onstart = () => {
      setSpeakingMsgId(msgId);
    };

    utterance.onend = () => {
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleMicListening = () => {
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

      rec.onstart = () => {
        setIsMicListening(true);
      };

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

      rec.onend = () => {
        setIsMicListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsMicListening(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(autoScroll);

  useEffect(() => {
    autoScrollRef.current = autoScroll;
  }, [autoScroll]);

  const scrollToBottom = () => {
    if (autoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const forceScrollToBottom = () => {
    setAutoScroll(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    } else if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  // Auth Listener & Hybrid Storage (LocalStorage + Realtime Database) Chats Subscription
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setChats([]);
        return;
      }

      // Sync user profile settings from Firestore
      const syncFirestoreProfile = async () => {
        try {
          const profileSnap = await getDoc(doc(db, 'users', user.uid, 'profile', 'info'));
          if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.customInstructions) {
              setCustomInstructions(data.customInstructions);
              try { localStorage.setItem('jyoti_ai_custom_instructions', data.customInstructions); } catch (e) {}
            }
            if (data.preferredLang) {
              setPreferredLang(data.preferredLang);
              try { localStorage.setItem('jyoti_ai_preferred_lang', data.preferredLang); } catch (e) {}
            }
          }
        } catch (e) {
          console.warn("Firestore profile sync warning:", e);
        }
      };
      syncFirestoreProfile();

      // 1. Instant load from LocalStorage
      const local = getLocalChats(user.uid);
      if (local.length > 0) {
        setChats(local);
      }

      // 2. Subscribe to Realtime Database chats with safe fallback
      const chatsRef = ref(rtdb, `users/${user.uid}/chats`);

      const unsubChats = onValue(chatsRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const loadedChats: ChatThread[] = Object.keys(val).map((key) => ({
            id: key,
            title: val[key].title || 'New Chat',
            summary: val[key].summary || '',
            createdAt: val[key].createdAt || new Date().toISOString(),
            updatedAt: val[key].updatedAt || new Date().toISOString()
          })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

          if (loadedChats.length > 0) {
            setChats(loadedChats);
            saveLocalChats(user.uid, loadedChats);
          } else {
            setChats([]);
            saveLocalChats(user.uid, []);
          }
        } else {
          setChats([]);
          saveLocalChats(user.uid, []);
        }
      }, (error) => {
        console.warn("Realtime DB chats permission/network issue, falling back to LocalStorage:", error);
        setChats(getLocalChats(user.uid));
      });

      return () => unsubChats();
    });

    return () => unsubAuth();
  }, []);

  // Fetch messages when currentChatId changes
  useEffect(() => {
    if (!currentUser || !currentChatId) {
      setMessages([
        {
          id: '1',
          role: 'ai',
          content: 'नमस्ते! मैं ज्योति (Jyoti) हूँ। मैं आपकी कैसे मदद कर सकती हूँ? एक नया प्रश्न पूछें या बाईं ओर की साइडबार से पुरानी चैट चुनें।'
        }
      ]);
      return;
    }

    setIsLoadingHistory(true);

    // 1. Load from LocalStorage first for instant view
    const localMsgs = getLocalMessages(currentUser.uid, currentChatId);
    if (localMsgs.length > 0) {
      setMessages(localMsgs);
      setIsLoadingHistory(false);
    }

    // 2. Fetch from Realtime Database with safe fallback
    const msgsRef = ref(rtdb, `users/${currentUser.uid}/messages/${currentChatId}`);

    const unsubMessages = onValue(msgsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const rawMsgs: Message[] = Object.keys(val).map((key) => ({
          id: key,
          role: val[key].role,
          content: val[key].content,
          isTyping: false
        })).sort((a, b) => new Date(val[a.id]?.createdAt || 0).getTime() - new Date(val[b.id]?.createdAt || 0).getTime());

        // Deduplicate messages by ID to prevent duplicate key errors
        const loadedMsgs = rawMsgs.filter((msg, idx, self) => self.findIndex(m => m.id === msg.id) === idx);

        if (loadedMsgs.length > 0) {
          setMessages(loadedMsgs);
          saveLocalMessages(currentUser.uid, currentChatId, loadedMsgs);
        } else {
          try {
            localStorage.removeItem(getMessagesStorageKey(currentUser.uid, currentChatId));
          } catch (e) {}
          setMessages([
            {
              id: '1',
              role: 'ai',
              content: 'नमस्ते! यह एक नई बातचीत है। मैं आपकी क्या मदद कर सकती हूँ?'
            }
          ]);
        }
      } else {
        try {
          localStorage.removeItem(getMessagesStorageKey(currentUser.uid, currentChatId));
        } catch (e) {}
        setMessages([
          {
            id: '1',
            role: 'ai',
            content: 'नमस्ते! यह एक नई बातचीत है। मैं आपकी क्या मदद कर सकती हूँ?'
          }
        ]);
      }
      setIsLoadingHistory(false);
    }, (error) => {
      console.warn("Realtime DB messages permission/network issue, falling back to LocalStorage:", error);
      const fallbackMsgs = getLocalMessages(currentUser.uid, currentChatId);
      if (fallbackMsgs.length > 0) {
        setMessages(fallbackMsgs);
      } else {
        setMessages([
          {
            id: '1',
            role: 'ai',
            content: 'नमस्ते! यह एक नई बातचीत है। मैं आपकी क्या मदद कर सकती हूँ?'
          }
        ]);
      }
      setIsLoadingHistory(false);
    });

    return () => unsubMessages();
  }, [currentChatId, currentUser]);

  // Audio Processing Helpers
  const pcmToBase64 = (pcmData: Float32Array) => {
    const buffer = new ArrayBuffer(pcmData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < pcmData.length; i++) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playAudioChunk = (ctx: AudioContext, base64Audio: string) => {
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);
    const numSamples = bytes.byteLength / 2;
    const floatArray = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const int16 = view.getInt16(i * 2, true);
      floatArray[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
    }

    const audioBuffer = ctx.createBuffer(1, floatArray.length, 24000);
    audioBuffer.getChannelData(0).set(floatArray);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime;
    }
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOff;
        setIsCameraOff(!isCameraOff);
      }
    }
  };

  const appendCallMessage = (role: 'user' | 'ai', content: string, msgIdOverride?: string) => {
    if (!content || !content.trim()) return;

    let activeChatId = currentChatId;
    const nowIso = new Date().toISOString();

    if (currentUser) {
      if (!activeChatId) {
        activeChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const titleSnippet = '📞 वॉइस कॉल सेशन (Voice Call)';
        const newThread: ChatThread = {
          id: activeChatId,
          title: titleSnippet,
          createdAt: nowIso,
          updatedAt: nowIso
        };

        const updatedChats = [newThread, ...chats];
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        setCurrentChatId(activeChatId);

        safeRtdbSet(`users/${currentUser.uid}/chats/${activeChatId}`, {
          title: titleSnippet,
          summary: 'Live Voice Call Session',
          createdAt: nowIso,
          updatedAt: nowIso
        });
      } else {
        const updatedChats = chats.map(c => c.id === activeChatId ? { ...c, updatedAt: nowIso } : c);
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        safeRtdbUpdate(`users/${currentUser.uid}/chats/${activeChatId}`, { updatedAt: nowIso });
      }

      const msgId = msgIdOverride || `${Date.now()}_${role}_${Math.random().toString(36).substring(2, 7)}`;
      const newMsg: Message = { id: msgId, role, content };

      const currentMsgs = getLocalMessages(currentUser.uid, activeChatId);
      const filteredMsgs = currentMsgs.filter(m => m.id !== msgId);
      const newMsgs = [...filteredMsgs, newMsg];
      saveLocalMessages(currentUser.uid, activeChatId, newMsgs);

      safeRtdbSet(`users/${currentUser.uid}/messages/${activeChatId}/${msgId}`, {
        role,
        content,
        createdAt: nowIso
      });

      setMessages(prev => {
        const exists = prev.some(m => m.id === msgId);
        if (exists) {
          return prev.map(m => m.id === msgId ? newMsg : m);
        }
        return [...prev, newMsg];
      });

      forceScrollToBottom();
      return msgId;
    } else {
      const msgId = msgIdOverride || `${Date.now()}_${role}_${Math.random().toString(36).substring(2, 7)}`;
      const newMsg: Message = { id: msgId, role, content };
      setMessages(prev => {
        const exists = prev.some(m => m.id === msgId);
        if (exists) {
          return prev.map(m => m.id === msgId ? newMsg : m);
        }
        return [...prev, newMsg];
      });
      forceScrollToBottom();
      return msgId;
    }
  };

  const toggleLiveVoice = async () => {
    if (isLiveActive) {
      setIsLiveActive(false);
      liveWsRef.current?.close();
      liveWsRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      processorRef.current?.disconnect();
      inputAudioCtxRef.current?.close();
      outputAudioCtxRef.current?.close();
      return;
    }

    if (isMicListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      setIsMicListening(false);
    }

    try {
      setIsLiveActive(true);

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${location.host}/live`;
      const socket = new WebSocket(wsUrl);
      liveWsRef.current = socket;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (socket.readyState === WebSocket.OPEN) {
          const pcmData = e.inputBuffer.getChannelData(0);
          const base64 = pcmToBase64(pcmData);
          socket.send(JSON.stringify({ audio: base64 }));
        }
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          playAudioChunk(outputCtx, msg.audio);
        }
        if (msg.text) {
          currentLiveAiTextRef.current += msg.text;
          if (!currentLiveAiMsgIdRef.current) {
            currentLiveAiMsgIdRef.current = `${Date.now()}_ai_live_${Math.random().toString(36).substring(2, 7)}`;
          }
          appendCallMessage('ai', currentLiveAiTextRef.current, currentLiveAiMsgIdRef.current);
        }
        if (msg.turnComplete) {
          currentLiveAiMsgIdRef.current = null;
          currentLiveAiTextRef.current = '';
        }
        if (msg.interrupted) {
          nextStartTimeRef.current = outputCtx.currentTime; 
          currentLiveAiMsgIdRef.current = null;
          currentLiveAiTextRef.current = '';
        }
      };

      socket.onclose = () => {
        setIsLiveActive(false);
      };

    } catch (err) {
      console.error("Live Voice Error:", err);
      setIsLiveActive(false);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: "माइक्रोफ़ोन एक्सेस करने में त्रुटि (Permission denied)। कृपया सुनिश्चित करें कि आपने माइक्रोफ़ोन की अनुमति दी है। यदि आप इसे प्रीव्यू विंडो में चला रहे हैं, तो हो सकता है कि ब्राउज़र इसे ब्लॉक कर रहा हो। कृपया ऐप को एक नए टैब (New Tab) में खोलकर प्रयास करें।"
      }]);
    }
  };

  // Create a New Chat
  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([
      {
        id: '1',
        role: 'ai',
        content: 'नमस्ते! मैं ज्योति (Jyoti) हूँ। मैं एक AI असिस्टेंट हूँ। मैं आपकी कैसे मदद कर सकती हूँ?'
      }
    ]);
  };

  // Rename Chat Thread
  const handleStartRename = (chat: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveRename = async (chatId: string) => {
    if (!currentUser || !editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    const newTitle = editingTitle.trim();
    const nowIso = new Date().toISOString();

    // 1. Update state & LocalStorage immediately
    const updatedChats = chats.map(c => c.id === chatId ? { ...c, title: newTitle, updatedAt: nowIso } : c);
    setChats(updatedChats);
    saveLocalChats(currentUser.uid, updatedChats);
    setEditingChatId(null);

    // 2. Sync to Realtime Database safely
    safeRtdbUpdate(`users/${currentUser.uid}/chats/${chatId}`, {
      title: newTitle,
      updatedAt: nowIso
    });
  };

  // Delete Chat Thread
  const handleDeleteChat = (chatId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setChatToDelete({ id: chatId, title: title || 'यह बातचीत' });
  };

  const confirmDeleteChat = async (chatId: string) => {
    const uid = currentUser?.uid || 'guest';

    // 1. Update state & LocalStorage immediately
    const updatedChats = chats.filter(c => c.id !== chatId);
    setChats(updatedChats);
    saveLocalChats(uid, updatedChats);
    try {
      localStorage.removeItem(getMessagesStorageKey(uid, chatId));
      localStorage.removeItem(`quizState_${chatId}`);
    } catch (err) {
      console.warn("LocalStorage remove message error:", err);
    }

    // 2. Switch chat if active chat was deleted
    if (currentChatId === chatId) {
      const remaining = updatedChats[0];
      if (remaining) {
        setCurrentChatId(remaining.id);
      } else {
        handleNewChat();
      }
    }

    // 3. Sync deletion to Realtime Database safely
    if (currentUser) {
      await safeRtdbSet(`users/${currentUser.uid}/chats/${chatId}`, null);
      await safeRtdbSet(`users/${currentUser.uid}/messages/${chatId}`, null);
      await safeRtdbDelete(`users/${currentUser.uid}/chats/${chatId}`);
      await safeRtdbDelete(`users/${currentUser.uid}/messages/${chatId}`);
    }
  };

  const handleQuizSubmit = (extractedText: string, numQuestions: number) => {
    setIsQuizModalOpen(false);
    
    const prompt = `Please create a multiple choice quiz based on the following text. Generate exactly ${numQuestions} questions. You MUST provide both English and Hindi translations for all text fields. Format your entire response as a single JSON block wrapped in [QUIZ_DATA] and [/QUIZ_DATA] tags. Do not output anything else outside these tags.
    
JSON Format:
{
    "topic_en": "Descriptive Topic of the quiz (max 5 words)",
  "topic_hi": "क्विज़ का विषय",
  "questions": [
    {
      "question_en": "Question text in English?",
      "question_hi": "प्रश्न हिंदी में?",
      "options_en": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "options_hi": ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"],
      "correctIndex": 0,
      "extraInfo_en": "Explanation of the correct answer in English.",
      "extraInfo_hi": "सही उत्तर की व्याख्या हिंदी में।"
    }
  ]
}

Text to use:
"${extractedText}"
`;

    const visibleUserMessage = `[Quiz Request] Generate a ${numQuestions}-question quiz from the uploaded image.`;

    // We can't easily pass a hidden prompt and visible message to the handleSend in this setup without modifying the backend.
    // However, the user said "yhi sab jese normal baat karne ki trh hi add hoga", so sending the prompt directly as the user message is fine, or we can hide the big prompt locally when rendering.
    // Actually, sending the big prompt as user message might make the chat history look ugly.
    // Let's modify handleSend to accept `hiddenContext` or just append the instruction at the end of the text.
    // Wait, the backend already accepts `customInstructions`. We can just use `prompt` as the final input.
    // For now, I will just send the prompt directly. The user can see it, it's fine.
    
    handleSend(prompt, null);
  };

  const handleSend = async (overrideInput?: string, overrideFile?: any) => {
    const currentInput = overrideInput !== undefined ? overrideInput : input;
    const currentFile = overrideFile !== undefined ? overrideFile : attachedFile;

    if (!currentInput.trim() && !currentFile) return;

    if (isMicListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsMicListening(false);
    }

    const wasVoiceInput = wasVoiceInputRef.current;
    wasVoiceInputRef.current = false;

    let finalInput = currentInput;
    let fileData = undefined;

    if (currentFile) {
      fileData = { content: currentFile.content, type: currentFile.type };
      if (currentFile.type === 'text') {
        finalInput = `[संलग्न फ़ाइल: ${currentFile.name}]\n${currentInput}`;
      }
    }

    const userMessageContent = currentInput || `[फ़ाइल भेजी गई: ${currentFile?.name}]`;
    const userMsgId = `${Date.now()}_usr_${Math.random().toString(36).substring(2, 7)}`;

    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: userMessageContent
    };

    if (overrideInput === undefined) {
      setInput('');
    }
    if (overrideFile === undefined) {
      setAttachedFile(null);
    }
    setIsProcessing(true);

    let activeChatId = currentChatId;
    const nowIso = new Date().toISOString();

    if (currentUser) {
      if (!activeChatId) {
        activeChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const titleSnippet = userMessageContent.slice(0, 35).replace(/\n/g, ' ') || 'New Chat';
        const newThread: ChatThread = {
          id: activeChatId,
          title: titleSnippet,
          createdAt: nowIso,
          updatedAt: nowIso
        };

        // Update state and LocalStorage immediately
        const updatedChats = [newThread, ...chats];
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        setCurrentChatId(activeChatId);

        // Sync thread to Realtime Database safely
        safeRtdbSet(`users/${currentUser.uid}/chats/${activeChatId}`, {
          title: titleSnippet,
          summary: '',
          createdAt: nowIso,
          updatedAt: nowIso
        });
      } else {
        // Update thread timestamp
        const updatedChats = chats.map(c => c.id === activeChatId ? { ...c, updatedAt: nowIso } : c);
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);

        safeRtdbUpdate(`users/${currentUser.uid}/chats/${activeChatId}`, { updatedAt: nowIso });
      }

      // Save user message locally
      const currentMsgs = getLocalMessages(currentUser.uid, activeChatId);
      const newMsgs = [...currentMsgs.filter(m => m.id !== userMsgId), userMessage];
      saveLocalMessages(currentUser.uid, activeChatId, newMsgs);

      // Save user message to Realtime Database safely
      safeRtdbSet(`users/${currentUser.uid}/messages/${activeChatId}/${userMsgId}`, {
        role: 'user',
        content: userMessageContent,
        createdAt: nowIso
      });
    }

    setMessages(prev => prev.some(m => m.id === userMsgId) ? prev : [...prev, userMessage]);
    forceScrollToBottom();

    // Get current thread context summary & history
    const existingThread = chats.find(c => c.id === activeChatId);
    const existingMsgs = currentUser && activeChatId ? getLocalMessages(currentUser.uid, activeChatId) : [];
    const recentHistory = existingMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      // Call Backend AI with topic reference, recent conversation history & custom instructions
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: finalInput, 
          file: fileData,
          chatSummary: existingThread?.summary || '',
          history: recentHistory,
          customInstructions,
          preferredLang
        })
      });
      const data = await res.json();

      const aiMsgId = `${Date.now()}_ai_${Math.random().toString(36).substring(2, 7)}`;
      const aiResponseContent = data.response || "क्षमा करें, कोई जवाब प्राप्त नहीं हुआ।";
      const updatedSummary = data.summary || existingThread?.summary || "";

      const aiMessage: Message = {
        id: aiMsgId,
        role: 'ai',
        content: aiResponseContent,
        isTyping: true
      };

      if (currentUser && activeChatId) {
        const currentMsgs = getLocalMessages(currentUser.uid, activeChatId);
        const newMsgs: Message[] = [...currentMsgs.filter(m => m.id !== aiMsgId), { id: aiMsgId, role: 'ai', content: aiResponseContent }];
        saveLocalMessages(currentUser.uid, activeChatId, newMsgs);

        safeRtdbSet(`users/${currentUser.uid}/messages/${activeChatId}/${aiMsgId}`, {
          role: 'ai',
          content: aiResponseContent,
          createdAt: new Date().toISOString()
        });

        // Update thread summary & timestamp
        const latestChats = getLocalChats(currentUser.uid);
        const updatedChats = latestChats.map(c => c.id === activeChatId ? { 
          ...c, 
          summary: updatedSummary, 
          updatedAt: nowIso 
        } : c);

        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);

        safeRtdbUpdate(`users/${currentUser.uid}/chats/${activeChatId}`, {
          summary: updatedSummary,
          updatedAt: nowIso
        });
      }

      setMessages(prev => prev.some(m => m.id === aiMsgId) ? prev : [...prev, aiMessage]);

      // Trigger TTS readout if auto-read is ON or voice input was used
      if (autoReadAloud || wasVoiceInput) {
        speakMessage(aiMsgId, aiResponseContent);
      }

    } catch (error: any) {
      console.error("Backend Error:", error);
      const errId = `${Date.now()}_err_${Math.random().toString(36).substring(2, 7)}`;
      setMessages(prev => [...prev, {
        id: errId,
        role: 'ai',
        content: "सर्वर से कनेक्ट करने में त्रुटि। कृपया पुनः प्रयास करें।"
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      setIsExtractingText(true);
      try {
        const result = await Tesseract.recognize(file, 'eng+hin', {
          cacheMethod: 'none' as any,
          logger: m => console.log(m)
        });
        const extractedText = result.data.text;
        if (!extractedText.trim()) {
          alert("Could not extract any readable text from the image.");
        } else {
          setAttachedFile({ name: `Extracted: ${file.name}`, content: extractedText, type: 'text' });
        }
      } catch (error) {
        console.error("OCR Error:", error);
        alert("Error extracting text from image.");
      } finally {
        setIsExtractingText(false);
      }
      return;
    }
    
    if (file.type === 'application/pdf') {
      setIsExtractingText(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        if (!fullText.trim()) {
          alert("Could not extract any readable text from this PDF.");
        } else {
          setAttachedFile({ name: `PDF: ${file.name}`, content: fullText, type: 'text' });
        }
      } catch (error) {
        console.error("PDF Parsing Error:", error);
        alert("Error reading PDF.");
      } finally {
        setIsExtractingText(false);
      }
      return;
    }
    
    const text = await file.text();
    setAttachedFile({ name: file.name, content: text, type: 'text' });
  };

  return (
    <div className="flex h-screen bg-[#0a0a1a] text-[#00ffcc] font-sans overflow-hidden">
      
      {/* SIDEBAR FOR CHAT HISTORY */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="h-full bg-[#070714] border-r border-[#00ffcc]/20 flex flex-col z-30 shrink-0 select-none shadow-[2px_0_15px_rgba(0,0,0,0.5)]"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[#00ffcc]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00ffcc]/10 border border-[#00ffcc]/40 flex items-center justify-center text-[#00ffcc]">
                  <Bot size={20} />
                </div>
                <span className="font-semibold text-white tracking-wide text-sm">Jyoti AI Chats</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors md:hidden"
              >
                <X size={18} />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/40 text-[#00ffcc] font-medium text-sm transition-all duration-300 shadow-[0_0_12px_rgba(0,255,204,0.15)] group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>New Chat</span>
              </button>
            </div>

            {/* AI Tools Section */}
            <div className="px-3 pb-3 border-b border-[#00ffcc]/10">
              <div className="px-2 pb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Tools
              </div>
              <button 
                onClick={() => setIsQuizModalOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-emerald-400 transition-colors text-sm font-medium border border-transparent hover:border-emerald-500/30"
              >
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                  <FileQuestion size={16} />
                </div>
                Quiz Maker Tool
              </button>
            </div>

            {/* Chat History List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={12} />
                <span>Previous Chats ({chats.length})</span>
              </div>

              {chats.length === 0 ? (
                <div className="text-center py-8 px-4 text-xs text-zinc-500 flex flex-col items-center gap-2">
                  <MessageSquare size={24} className="opacity-40" />
                  <span>कोई पुरानी चैट नहीं है</span>
                  <span className="text-[10px] text-zinc-600">नई बातचीत शुरू करें</span>
                </div>
              ) : (
                chats.map((chat) => {
                  const isActive = currentChatId === chat.id;
                  const isEditing = editingChatId === chat.id;

                  return (
                    <div
                      key={chat.id}
                      onClick={() => setCurrentChatId(chat.id)}
                      className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-200 ${
                        isActive 
                          ? 'bg-[#12122b] border border-[#00ffcc]/50 text-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.12)] font-medium' 
                          : 'border border-transparent text-zinc-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <MessageSquare size={16} className={`shrink-0 ${isActive ? 'text-[#00ffcc]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />

                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(chat.id);
                            if (e.key === 'Escape') setEditingChatId(null);
                          }}
                          onBlur={() => handleSaveRename(chat.id)}
                          autoFocus
                          className="flex-1 bg-black/50 border border-[#00ffcc]/60 rounded px-1.5 py-0.5 text-white text-xs focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate text-white font-medium">{chat.title}</span>
                          {chat.summary && (
                            <span className="truncate text-[10px] text-zinc-400 font-mono">
                              {chat.summary}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Hover Action Buttons */}
                      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                        <button
                          onClick={(e) => handleStartRename(chat, e)}
                          className="p-1 hover:text-[#00ffcc] text-zinc-400 transition-colors"
                          title="Rename"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, chat.title, e)}
                          className="p-1 hover:text-red-400 text-zinc-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete Chat"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* User Profile / Settings / Logout Footer */}
            <div className="p-3 border-t border-[#00ffcc]/20 bg-[#050510] flex items-center justify-between gap-1">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 overflow-hidden hover:bg-white/5 p-1.5 rounded-xl transition-colors text-left flex-1 min-w-0"
                title="Open Settings & Profile"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-[#00ffcc] text-white flex items-center justify-center shrink-0 text-xs font-semibold shadow-[0_0_8px_rgba(0,255,204,0.3)]">
                  {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || <User size={14} />}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs text-white truncate font-medium">
                    {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="text-[10px] text-[#00ffcc] flex items-center gap-1">
                    <Settings size={10} /> Settings & Profile
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 text-zinc-400 hover:text-[#00ffcc] hover:bg-[#00ffcc]/10 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Sliders size={16} />
                </button>
                <button
                  onClick={() => auth.signOut()}
                  className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header Bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#0a0a1a] border-b border-[#00ffcc]/30 shadow-[0_0_15px_rgba(0,255,204,0.15)] z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl bg-[#050510] border border-[#00ffcc]/30 text-[#00ffcc] hover:bg-[#00ffcc]/10 transition-colors shadow-[0_0_8px_rgba(0,255,204,0.1)]"
              title={isSidebarOpen ? "Sidebar बंद करें" : "Sidebar खोलें"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-[#00ffcc]/40 relative bg-zinc-900 flex items-center justify-center shrink-0">
                <Bot size={22} className="text-[#00ffcc]" />
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight flex items-center gap-2 text-white">
                  Jyoti AI <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/80 text-white text-[10px] uppercase tracking-wider font-normal">Powered by Hritik AI</span>
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoRead}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs ${
                autoReadAloud 
                  ? 'bg-[#00ffcc]/15 border-[#00ffcc] text-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.2)] font-medium' 
                  : 'bg-[#050510] border-zinc-700 text-zinc-400 hover:text-white'
              }`}
              title={autoReadAloud ? "AI वॉइस ऑटो-रीड चालू है (Auto Voice ON)" : "AI वॉइस ऑटो-रीड बंद है (Auto Voice OFF)"}
            >
              {autoReadAloud ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span className="hidden md:inline text-[11px]">
                {autoReadAloud ? 'Voice ON' : 'Voice OFF'}
              </span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-[#050510] border border-[#00ffcc]/30 text-zinc-300 hover:text-[#00ffcc] hover:bg-[#00ffcc]/10 transition-colors"
              title="Settings & Profile"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={handleNewChat}
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#00ffcc]/40 text-[#00ffcc] hover:bg-[#00ffcc]/10 transition-colors"
            >
              <Plus size={14} />
              <span>New Chat</span>
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6" ref={mainRef} onScroll={handleScroll}>
          <div className="max-w-4xl mx-auto space-y-6 pb-10">
            
            {/* Active Thread Topic Reference & Process Tracker Banner */}
            {currentChatId && (
              <div className="p-3.5 rounded-2xl bg-[#07071c]/90 border border-[#00ffcc]/30 shadow-[0_0_15px_rgba(0,255,204,0.08)] backdrop-blur-md">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-[#00ffcc]/10 text-[#00ffcc]">
                      <ListChecks size={15} />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#00ffcc]">
                      Live Topic Context & Process Tracker
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">
                    Auto-Updated by AI
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                  {chats.find(c => c.id === currentChatId)?.summary || '📌 Topic & Progress Context: Starting conversation... AI will dynamically update topic reference and process status in 20-30 words after every reply.'}
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
                  <motion.div
                    key={`${msg.id}_${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'user' ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    
                    <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-5 py-3.5 text-[15px] leading-relaxed transition-colors duration-500 flex flex-col ${
                        msg.role === 'user' 
                          ? 'bg-[#1a1a3a] text-[#ff00ff] border border-[#ff00ff]/50 shadow-[0_0_10px_rgba(255,0,255,0.2)] rounded-3xl rounded-tr-sm' 
                          : 'bg-[#050510] text-[#00ffcc] border border-[#00ffcc]/30 shadow-[0_0_10px_rgba(0,255,204,0.1)] rounded-3xl rounded-tl-sm w-full overflow-x-auto'
                      }`}>
                        {(() => {
                          if (msg.role === 'user' && msg.content.includes('[QUIZ_DATA]')) {
    const isAnalysis = msg.content.includes('Please analyze my recent quiz performance');
    const dateObj = new Date();
    const localTime = dateObj.toLocaleString();
    const utcTime = dateObj.toUTCString();
    
    if (isAnalysis) {
      return (
        <div className="flex flex-col gap-2 opacity-90">
          <span className="font-bold text-[#ff00ff] uppercase tracking-wider text-xs">🧠 AI Analysis Request</span>
          <p className="whitespace-pre-wrap italic">Requested a detailed performance analysis for the recent quiz.</p>
          <span className="text-[10px] text-[#ff00ff]/70">{localTime} | {utcTime}</span>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-2 opacity-90">
        <span className="font-bold text-[#ff00ff] uppercase tracking-wider text-xs">📄 Quiz Generation Request</span>
        <p className="whitespace-pre-wrap italic">Image processed. Asked AI to generate a quiz from the extracted data.</p>
        <span className="text-[10px] text-[#ff00ff]/70">{localTime} | {utcTime}</span>
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
        const topic = qData.topic_en || "the recent quiz";
        const analysisPrompt = `Please analyze my recent quiz performance. I scored ${score} out of ${total} on the quiz about "${topic}". 

Based on my score, please provide a brief analysis of my performance, my experience, what subjects I might excel in, where I need improvement, what changes I should make, and suggest some new things I should do or study next. Be encouraging but analytical.`;
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
                              onComplete={() => {
                                if (msg.isTyping) {
                                  setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
                                }
                              }}
                              onType={scrollToBottom}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          );
                        })()}
                        {msg.role === 'ai' && !msg.isTyping && !msg.content.includes('[QUIZ_DATA]') && (
                          <MessageActionButtons 
                            text={msg.content} 
                            msgId={msg.id}
                            isSpeaking={speakingMsgId === msg.id}
                            onToggleSpeak={speakMessage}
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isExtractingText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center my-4"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  चित्र/PDF से टेक्स्ट निकाला जा रहा है... (Extracting Text)
                </div>
              </motion.div>
            )}

            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
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
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center my-8"
              >
                <div className="flex flex-col items-center gap-4 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                  <div className="relative flex items-center justify-center">
                     <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full animate-ping"></div>
                     <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg z-10 text-white">
                       <Mic size={32} className="animate-pulse" />
                     </div>
                  </div>
                  <p className="text-indigo-400 font-medium tracking-wide">ज्योति सुन रही है... (Live Call Active)</p>
                  
                  <div className="flex gap-4 mt-2">
                     <button onClick={toggleMute} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500' : 'bg-zinc-800'}`}>
                       {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                     </button>
                     <button onClick={toggleCamera} className={`p-3 rounded-full transition-colors ${isCameraOff ? 'bg-red-500' : 'bg-zinc-800'}`}>
                       {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                     </button>
                  </div>
                  
                  <button 
                    onClick={toggleLiveVoice}
                    className="px-6 py-2 mt-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium shadow-lg transition-colors flex items-center gap-2"
                  >
                    <PhoneOff size={16} /> End Call
                  </button>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Footer Input Bar */}
        <footer className="p-4 sm:p-6 bg-[#0a0a1a] border-t border-[#00ffcc]/20 transition-colors duration-500 z-20">
          <div className="max-w-4xl mx-auto relative">
            
            <AnimatePresence>
              {!autoScroll && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={forceScrollToBottom}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#050510] border border-[#00ffcc]/50 text-[#00ffcc] p-2 rounded-full shadow-[0_0_15px_rgba(0,255,204,0.2)] hover:bg-[#00ffcc]/20 transition-colors z-30 flex items-center justify-center"
                  title="Scroll to bottom"
                >
                  <ArrowDown size={18} />
                </motion.button>
              )}
            </AnimatePresence>

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

            <div className="flex items-end gap-2 bg-[#111122] border border-[#00ffcc]/50 focus-within:border-[#ff00ff] focus-within:shadow-[0_0_15px_rgba(255,0,255,0.3)] rounded-[32px] p-2 transition-all duration-300 relative">
              
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx,.json,.md,.csv,image/*"
                className="hidden"
                ref={docInputRef}
                onChange={handleFileUpload}
              />
              
              <button 
                onClick={() => docInputRef.current?.click()}
                className="p-3 opacity-70 hover:opacity-100 rounded-full transition-colors shrink-0"
                title="फ़ाइल या चित्र संलग्न करें (Text & Images)"
              >
                <Paperclip size={20} />
              </button>

              {/* Speech Recognition Mic Button for Voice Input */}
              <button 
                onClick={toggleMicListening}
                className={`p-3 rounded-full transition-all shrink-0 relative ${
                  isMicListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]' 
                    : 'bg-[#00ffcc]/10 text-[#00ffcc] hover:bg-[#00ffcc]/20 border border-[#00ffcc]/30'
                }`}
                title={isMicListening ? "सुन रहे हैं... बंद करने के लिए क्लिक करें" : "बोलकर टाइप करें (Voice Input)"}
              >
                {isMicListening ? <MicOff size={20} /> : <Mic size={20} />}
                {isMicListening && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </button>

              {/* Realtime Live Phone Call Button */}
              <button 
                onClick={toggleLiveVoice}
                className={`p-3 rounded-full transition-colors shrink-0 ${
                  isLiveActive 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 border border-indigo-500/30'
                }`}
                title="लाइव कॉल (Voice Call Mode)"
              >
                {isLiveActive ? <PhoneOff size={20} /> : <Phone size={20} />}
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isMicListening 
                    ? "🎤 आपकी आवाज़ सुनी जा रही है..." 
                    : isLiveActive 
                    ? "कॉल चालू है..." 
                    : "ज्योति से बोलकर या लिखकर पूछें..."
                }
                disabled={isLiveActive}
                className="w-full bg-transparent border-none focus:outline-none resize-none max-h-32 py-3 px-2 placeholder:opacity-50 text-[#e3e3e3]"
                rows={1}
                style={{ minHeight: '44px' }}
              />

              <button 
                id="send-btn"
                onClick={() => handleSend()}
                disabled={(!input.trim() && !attachedFile) || isProcessing || isLiveActive}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 text-[#00ffcc] rounded-full transition-colors shrink-0 mb-0.5 mr-0.5"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Gemini-Style Settings & Profile Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        chats={chats}
        totalMessagesCount={messages.length}
        onClearAllChats={handleClearAllChats}
        customInstructions={customInstructions}
        onSaveCustomInstructions={handleSaveCustomInstructions}
        preferredLang={preferredLang}
        onSavePreferredLang={handleSavePreferredLang}
      />

      {/* Custom Delete Confirmation Modal */}
      {chatToDelete && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a1a] border border-red-500/40 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_30px_rgba(239,68,68,0.25)]">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2 bg-red-500/20 rounded-xl border border-red-500/40 shrink-0">
                <Trash2 size={20} />
              </div>
              <h3 className="font-bold text-base text-white">Delete Conversation?</h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
              क्या आप वाकई <span className="text-white font-semibold">"{chatToDelete.title}"</span> को डिलीट करना चाहते हैं? यह बातचीत हमेशा के लिए मिटा दी जाएगी।
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setChatToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetId = chatToDelete.id;
                  setChatToDelete(null);
                  confirmDeleteChat(targetId);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(239,68,68,0.4)]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <QuizToolModal 
        isOpen={isQuizModalOpen} 
        onClose={() => setIsQuizModalOpen(false)} 
        onSubmit={handleQuizSubmit} 
      />
    </div>
  );
}
