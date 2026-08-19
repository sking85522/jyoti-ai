import { ChatThread, Message } from '../types/chat';

export const getChatsStorageKey = (uid: string) => `jyoti_chats_${uid}`;
export const getMessagesStorageKey = (uid: string, chatId: string) => `jyoti_msgs_${uid}_${chatId}`;

export const getLocalChats = (uid: string): ChatThread[] => {
  try {
    const raw = localStorage.getItem(getChatsStorageKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalChats = (uid: string, chats: ChatThread[]) => {
  try {
    localStorage.setItem(getChatsStorageKey(uid), JSON.stringify(chats));
  } catch (e) {
    console.error("LocalStorage save error:", e);
  }
};

export const getLocalMessages = (uid: string, chatId: string): Message[] => {
  try {
    const raw = localStorage.getItem(getMessagesStorageKey(uid, chatId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalMessages = (uid: string, chatId: string, msgs: Message[]) => {
  try {
    localStorage.setItem(getMessagesStorageKey(uid, chatId), JSON.stringify(msgs));
  } catch (e) {
    console.error("LocalStorage save error:", e);
  }
};
