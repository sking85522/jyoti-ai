import { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../lib/firebase';
import { ChatThread, Message } from '../types/chat';
import {
  getLocalChats, saveLocalChats,
  getLocalMessages, saveLocalMessages,
  getMessagesStorageKey
} from '../utils/storage';
import { safeRtdbSet, safeRtdbUpdate, safeRtdbDelete } from '../services/chatService';

export function useChats(currentUser: FirebaseUser | null) {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: 'नमस्ते! मैं ज्योति (Jyoti) हूँ। मैं एक AI असिस्टेंट हूँ। मैं आपकी कैसे मदद कर सकती हूँ?'
    }
  ]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      return;
    }

    const local = getLocalChats(currentUser.uid);
    if (local.length > 0) setChats(local);

    const chatsRef = ref(rtdb, `users/${currentUser.uid}/chats`);
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
          saveLocalChats(currentUser.uid, loadedChats);
        } else {
          setChats([]);
          saveLocalChats(currentUser.uid, []);
        }
      } else {
        setChats([]);
        saveLocalChats(currentUser.uid, []);
      }
    }, (error) => {
      console.warn("Realtime DB chats permission/network issue:", error);
      setChats(getLocalChats(currentUser.uid));
    });

    return () => unsubChats();
  }, [currentUser]);

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
    const localMsgs = getLocalMessages(currentUser.uid, currentChatId);
    if (localMsgs.length > 0) {
      setMessages(localMsgs);
      setIsLoadingHistory(false);
    }

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

        const loadedMsgs = rawMsgs.filter((msg, idx, self) => self.findIndex(m => m.id === msg.id) === idx);

        if (loadedMsgs.length > 0) {
          setMessages(loadedMsgs);
          saveLocalMessages(currentUser.uid, currentChatId, loadedMsgs);
        } else {
          try { localStorage.removeItem(getMessagesStorageKey(currentUser.uid, currentChatId)); } catch (e) {}
          setMessages([{ id: '1', role: 'ai', content: 'नमस्ते! यह एक नई बातचीत है। मैं आपकी क्या मदद कर सकती हूँ?' }]);
        }
      } else {
        try { localStorage.removeItem(getMessagesStorageKey(currentUser.uid, currentChatId)); } catch (e) {}
        setMessages([{ id: '1', role: 'ai', content: 'नमस्ते! यह एक नई बातचीत है। मैं आपकी क्या मदद कर सकती हूँ?' }]);
      }
      setIsLoadingHistory(false);
    }, (error) => {
      console.warn("Realtime DB msgs issue:", error);
      const fallbackMsgs = getLocalMessages(currentUser.uid, currentChatId);
      if (fallbackMsgs.length > 0) setMessages(fallbackMsgs);
      else setMessages([{ id: '1', role: 'ai', content: 'नमस्ते! यह एक नई बातचीत है। मैं आपकी क्या मदद कर सकती हूँ?' }]);
      setIsLoadingHistory(false);
    });

    return () => unsubMessages();
  }, [currentChatId, currentUser]);

  const handleNewChat = useCallback(() => {
    setCurrentChatId(null);
    setMessages([{ id: '1', role: 'ai', content: 'नमस्ते! मैं ज्योति (Jyoti) हूँ। मैं एक AI असिस्टेंट हूँ। मैं आपकी कैसे मदद कर सकती हूँ?' }]);
  }, []);

  const handleDeleteChat = async (chatId: string) => {
    const uid = currentUser?.uid || 'guest';
    const updatedChats = chats.filter(c => c.id !== chatId);
    setChats(updatedChats);
    saveLocalChats(uid, updatedChats);
    try {
      localStorage.removeItem(getMessagesStorageKey(uid, chatId));
      localStorage.removeItem(`quizState_${chatId}`);
    } catch (err) {}

    if (currentChatId === chatId) {
      const remaining = updatedChats[0];
      if (remaining) setCurrentChatId(remaining.id);
      else handleNewChat();
    }

    if (currentUser) {
      await safeRtdbSet(`users/${currentUser.uid}/chats/${chatId}`, null);
      await safeRtdbSet(`users/${currentUser.uid}/messages/${chatId}`, null);
      await safeRtdbDelete(`users/${currentUser.uid}/chats/${chatId}`);
      await safeRtdbDelete(`users/${currentUser.uid}/messages/${chatId}`);
    }
  };

  const handleClearAllChats = async () => {
    const uid = currentUser?.uid || 'guest';
    setChats([]);
    setCurrentChatId(null);
    setMessages([{ id: '1', role: 'ai', content: 'नमस्ते! मैंने आपकी पुरानी सभी चैट्स डिलीट कर दी हैं।' }]);

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('jyoti_chats_') || key.startsWith('jyoti_msgs_') || key.startsWith('quizState_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {}

    if (currentUser) {
      await safeRtdbSet(`users/${currentUser.uid}/chats`, null);
      await safeRtdbSet(`users/${currentUser.uid}/messages`, null);
    }
  };

  return {
    chats,
    setChats,
    currentChatId,
    setCurrentChatId,
    messages,
    setMessages,
    isLoadingHistory,
    handleNewChat,
    handleDeleteChat,
    handleClearAllChats
  };
}
