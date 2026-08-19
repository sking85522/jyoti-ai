import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { Trash2, ArrowDown } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

import { auth, db } from '../lib/firebase';
import { Message } from '../types/chat';
import { getLocalMessages, saveLocalMessages, saveLocalChats, getLocalChats } from '../utils/storage';
import { safeRtdbSet, safeRtdbUpdate } from '../services/chatService';

import { useSpeech } from '../hooks/useSpeech';
import { useLiveVoice } from '../hooks/useLiveVoice';
import { useChats } from '../hooks/useChats';

import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatMessageList } from '../components/chat/ChatMessageList';
import { ChatInput } from '../components/chat/ChatInput';

import { QuizToolModal } from '../components/QuizToolModal';
import SettingsModal from '../components/SettingsModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(() => {
    try { return localStorage.getItem('jyoti_ai_custom_instructions') || ''; } catch (e) { return ''; }
  });
  const [preferredLang, setPreferredLang] = useState(() => {
    try { return localStorage.getItem('jyoti_ai_preferred_lang') || 'auto'; } catch (e) { return 'auto'; }
  });

  const { chats, setChats, currentChatId, setCurrentChatId, messages, setMessages, isLoadingHistory, handleNewChat, handleDeleteChat, handleClearAllChats } = useChats(currentUser);
  const { isMicListening, setIsMicListening, speakingMsgId, autoReadAloud, toggleAutoRead, speakMessage, toggleMicListening, recognitionRef, wasVoiceInputRef } = useSpeech(preferredLang);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{name: string, content: string, type: string} | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{ id: string; title: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const autoScrollRef = useRef(autoScroll);

  useEffect(() => { autoScrollRef.current = autoScroll; }, [autoScroll]);

  const forceScrollToBottom = () => {
    setAutoScroll(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (isAtBottom && !autoScroll) setAutoScroll(true);
    else if (!isAtBottom && autoScroll) setAutoScroll(false);
  };

  useEffect(() => {
    if (autoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
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
      }
    });
    return () => unsubAuth();
  }, []);

  const handleSaveRename = async (chatId: string) => {
    if (!currentUser || !editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    const newTitle = editingTitle.trim();
    const nowIso = new Date().toISOString();
    const updatedChats = chats.map(c => c.id === chatId ? { ...c, title: newTitle, updatedAt: nowIso } : c);
    setChats(updatedChats);
    saveLocalChats(currentUser.uid, updatedChats);
    setEditingChatId(null);
    safeRtdbUpdate(`users/${currentUser.uid}/chats/${chatId}`, { title: newTitle, updatedAt: nowIso });
  };

  const appendCallMessage = (role: 'user' | 'ai', content: string, msgIdOverride?: string) => {
    if (!content || !content.trim()) return;
    let activeChatId = currentChatId;
    const nowIso = new Date().toISOString();

    if (currentUser) {
      if (!activeChatId) {
        activeChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const titleSnippet = '📞 वॉइस कॉल सेशन (Voice Call)';
        const newThread = { id: activeChatId, title: titleSnippet, createdAt: nowIso, updatedAt: nowIso };
        const updatedChats = [newThread, ...chats];
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        setCurrentChatId(activeChatId);
        safeRtdbSet(`users/${currentUser.uid}/chats/${activeChatId}`, { title: titleSnippet, summary: 'Live Voice Call Session', createdAt: nowIso, updatedAt: nowIso });
      } else {
        const updatedChats = chats.map(c => c.id === activeChatId ? { ...c, updatedAt: nowIso } : c);
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        safeRtdbUpdate(`users/${currentUser.uid}/chats/${activeChatId}`, { updatedAt: nowIso });
      }

      const msgId = msgIdOverride || `${Date.now()}_${role}_${Math.random().toString(36).substring(2, 7)}`;
      const newMsg: Message = { id: msgId, role, content };
      const currentMsgs = getLocalMessages(currentUser.uid, activeChatId);
      saveLocalMessages(currentUser.uid, activeChatId, [...currentMsgs.filter(m => m.id !== msgId), newMsg]);
      safeRtdbSet(`users/${currentUser.uid}/messages/${activeChatId}/${msgId}`, { role, content, createdAt: nowIso });

      setMessages(prev => {
        const exists = prev.some(m => m.id === msgId);
        return exists ? prev.map(m => m.id === msgId ? newMsg : m) : [...prev, newMsg];
      });
      forceScrollToBottom();
      return msgId;
    } else {
      const msgId = msgIdOverride || `${Date.now()}_${role}_${Math.random().toString(36).substring(2, 7)}`;
      const newMsg: Message = { id: msgId, role, content };
      setMessages(prev => prev.some(m => m.id === msgId) ? prev.map(m => m.id === msgId ? newMsg : m) : [...prev, newMsg]);
      forceScrollToBottom();
      return msgId;
    }
  };

  const { isLiveActive, isMuted, isCameraOff, toggleLiveVoice, toggleMute, toggleCamera } = useLiveVoice(appendCallMessage, setMessages);

  const handleSend = async (overrideInput?: string, overrideFile?: any) => {
    const currentInput = overrideInput !== undefined ? overrideInput : input;
    const currentFile = overrideFile !== undefined ? overrideFile : attachedFile;
    if (!currentInput.trim() && !currentFile) return;

    if (isMicListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsMicListening(false);
    }
    const wasVoiceInput = wasVoiceInputRef.current;
    wasVoiceInputRef.current = false;

    let finalInput = currentInput;
    let fileData = undefined;
    if (currentFile) {
      fileData = { content: currentFile.content, type: currentFile.type };
      if (currentFile.type === 'text') finalInput = `[संलग्न फ़ाइल: ${currentFile.name}]\n${currentInput}`;
    }

    const userMessageContent = currentInput || `[फ़ाइल भेजी गई: ${currentFile?.name}]`;
    const userMsgId = `${Date.now()}_usr_${Math.random().toString(36).substring(2, 7)}`;
    const userMessage: Message = { id: userMsgId, role: 'user', content: userMessageContent };

    if (overrideInput === undefined) setInput('');
    if (overrideFile === undefined) setAttachedFile(null);
    setIsProcessing(true);

    let activeChatId = currentChatId;
    const nowIso = new Date().toISOString();

    if (currentUser) {
      if (!activeChatId) {
        activeChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const titleSnippet = userMessageContent.slice(0, 35).replace(/\n/g, ' ') || 'New Chat';
        const newThread = { id: activeChatId, title: titleSnippet, createdAt: nowIso, updatedAt: nowIso };
        const updatedChats = [newThread, ...chats];
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        setCurrentChatId(activeChatId);
        safeRtdbSet(`users/${currentUser.uid}/chats/${activeChatId}`, { title: titleSnippet, summary: '', createdAt: nowIso, updatedAt: nowIso });
      } else {
        const updatedChats = chats.map(c => c.id === activeChatId ? { ...c, updatedAt: nowIso } : c);
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        safeRtdbUpdate(`users/${currentUser.uid}/chats/${activeChatId}`, { updatedAt: nowIso });
      }

      const currentMsgs = getLocalMessages(currentUser.uid, activeChatId);
      saveLocalMessages(currentUser.uid, activeChatId, [...currentMsgs.filter(m => m.id !== userMsgId), userMessage]);
      safeRtdbSet(`users/${currentUser.uid}/messages/${activeChatId}/${userMsgId}`, { role: 'user', content: userMessageContent, createdAt: nowIso });
    }

    setMessages(prev => prev.some(m => m.id === userMsgId) ? prev : [...prev, userMessage]);
    forceScrollToBottom();

    const existingThread = chats.find(c => c.id === activeChatId);
    const existingMsgs = currentUser && activeChatId ? getLocalMessages(currentUser.uid, activeChatId) : [];
    const recentHistory = existingMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
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
      const aiMessage: Message = { id: aiMsgId, role: 'ai', content: aiResponseContent, isTyping: true };

      if (currentUser && activeChatId) {
        const currentMsgs = getLocalMessages(currentUser.uid, activeChatId);
        saveLocalMessages(currentUser.uid, activeChatId, [...currentMsgs.filter(m => m.id !== aiMsgId), { id: aiMsgId, role: 'ai', content: aiResponseContent }]);
        safeRtdbSet(`users/${currentUser.uid}/messages/${activeChatId}/${aiMsgId}`, { role: 'ai', content: aiResponseContent, createdAt: new Date().toISOString() });

        const latestChats = getLocalChats(currentUser.uid);
        const updatedChats = latestChats.map(c => c.id === activeChatId ? { ...c, summary: updatedSummary, updatedAt: nowIso } : c);
        setChats(updatedChats);
        saveLocalChats(currentUser.uid, updatedChats);
        safeRtdbUpdate(`users/${currentUser.uid}/chats/${activeChatId}`, { summary: updatedSummary, updatedAt: nowIso });
      }

      setMessages(prev => prev.some(m => m.id === aiMsgId) ? prev : [...prev, aiMessage]);

      if (autoReadAloud || wasVoiceInput) {
        speakMessage(aiMsgId, aiResponseContent);
      }
    } catch (error) {
      console.error("Backend Error:", error);
      setMessages(prev => [...prev, { id: `${Date.now()}_err`, role: 'ai', content: "सर्वर से कनेक्ट करने में त्रुटि। कृपया पुनः प्रयास करें।" }]);
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
        const result = await Tesseract.recognize(file, 'eng+hin', { cacheMethod: 'none' as any });
        if (!result.data.text.trim()) alert("Could not extract any readable text from the image.");
        else setAttachedFile({ name: `Extracted: ${file.name}`, content: result.data.text, type: 'text' });
      } catch (error) {
        console.error("OCR Error:", error);
        alert("Error extracting text from image.");
      } finally { setIsExtractingText(false); }
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
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        if (!fullText.trim()) alert("Could not extract any readable text from this PDF.");
        else setAttachedFile({ name: `PDF: ${file.name}`, content: fullText, type: 'text' });
      } catch (error) {
        console.error("PDF Parsing Error:", error);
        alert("Error reading PDF.");
      } finally { setIsExtractingText(false); }
      return;
    }
    
    const text = await file.text();
    setAttachedFile({ name: file.name, content: text, type: 'text' });
  };

  return (
    <div className="flex h-screen bg-[#0a0a1a] text-[#00ffcc] font-sans overflow-hidden">
      <ChatSidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        chats={chats}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        handleNewChat={handleNewChat}
        handleStartRename={(chat, e) => { e.stopPropagation(); setEditingChatId(chat.id); setEditingTitle(chat.title); }}
        editingChatId={editingChatId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        handleSaveRename={handleSaveRename}
        handleDeleteChat={(id, title, e) => { e.stopPropagation(); e.preventDefault(); setChatToDelete({ id, title: title || 'यह बातचीत' }); }}
        setIsQuizModalOpen={setIsQuizModalOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        currentUser={currentUser}
        auth={auth}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <ChatHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          autoReadAloud={autoReadAloud}
          toggleAutoRead={toggleAutoRead}
          setIsSettingsOpen={setIsSettingsOpen}
          handleNewChat={handleNewChat}
        />

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence>
            {!autoScroll && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={forceScrollToBottom}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#050510] border border-[#00ffcc]/50 text-[#00ffcc] p-2 rounded-full shadow-[0_0_15px_rgba(0,255,204,0.2)] hover:bg-[#00ffcc]/20 transition-colors z-30 flex items-center justify-center"
              >
                <ArrowDown size={18} />
              </motion.button>
            )}
          </AnimatePresence>

          <ChatMessageList
            messages={messages}
            isLoadingHistory={isLoadingHistory}
            isExtractingText={isExtractingText}
            isProcessing={isProcessing}
            isLiveActive={isLiveActive}
            currentChatId={currentChatId}
            chatSummary={chats.find(c => c.id === currentChatId)?.summary}
            speakingMsgId={speakingMsgId}
            speakMessage={speakMessage}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            toggleMute={toggleMute}
            toggleCamera={toggleCamera}
            toggleLiveVoice={() => toggleLiveVoice(isMicListening, setIsMicListening, recognitionRef)}
            handleSend={handleSend}
            setMessages={setMessages}
            messagesEndRef={messagesEndRef}
            mainRef={mainRef}
            handleScroll={handleScroll}
          />
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          handleSend={() => handleSend()}
          handleFileUpload={handleFileUpload}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
          isProcessing={isProcessing}
          isLiveActive={isLiveActive}
          isMicListening={isMicListening}
          toggleMicListening={() => toggleMicListening(setInput)}
          toggleLiveVoice={() => toggleLiveVoice(isMicListening, setIsMicListening, recognitionRef)}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        chats={chats}
        totalMessagesCount={messages.length}
        onClearAllChats={handleClearAllChats}
        customInstructions={customInstructions}
        onSaveCustomInstructions={(val) => { setCustomInstructions(val); try { localStorage.setItem('jyoti_ai_custom_instructions', val); } catch (e) {} }}
        preferredLang={preferredLang}
        onSavePreferredLang={(val) => { setPreferredLang(val); try { localStorage.setItem('jyoti_ai_preferred_lang', val); } catch (e) {} }}
      />

      {chatToDelete && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a1a] border border-red-500/40 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_30px_rgba(239,68,68,0.25)]">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2 bg-red-500/20 rounded-xl border border-red-500/40 shrink-0"><Trash2 size={20} /></div>
              <h3 className="font-bold text-base text-white">Delete Conversation?</h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
              क्या आप वाकई <span className="text-white font-semibold">"{chatToDelete.title}"</span> को डिलीट करना चाहते हैं? यह बातचीत हमेशा के लिए मिटा दी जाएगी।
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setChatToDelete(null)} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors">Cancel</button>
              <button onClick={() => { const targetId = chatToDelete.id; setChatToDelete(null); handleDeleteChat(targetId); }} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(239,68,68,0.4)]">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      <QuizToolModal 
        isOpen={isQuizModalOpen} 
        onClose={() => setIsQuizModalOpen(false)} 
        onSubmit={(text, num) => {
          setIsQuizModalOpen(false);
          const prompt = `Please create a multiple choice quiz based on the following text. Generate exactly ${num} questions. You MUST provide both English and Hindi translations for all text fields. Format your entire response as a single JSON block wrapped in [QUIZ_DATA] and [/QUIZ_DATA] tags.

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
"${text}"
`;
          handleSend(prompt, null);
        }}
      />
    </div>
  );
}
