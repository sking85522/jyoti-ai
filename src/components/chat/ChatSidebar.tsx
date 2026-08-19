import React from 'react';
import { Bot, MessageSquare, Edit2, Trash2, Calendar, FileQuestion, Plus, LogOut, Settings, Sliders, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatThread } from '../../types/chat';
import { User as FirebaseUser } from 'firebase/auth';

interface ChatSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  chats: ChatThread[];
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  handleNewChat: () => void;
  handleStartRename: (chat: ChatThread, e: React.MouseEvent) => void;
  editingChatId: string | null;
  editingTitle: string;
  setEditingTitle: (v: string) => void;
  handleSaveRename: (id: string) => void;
  handleDeleteChat: (id: string, title: string, e: React.MouseEvent) => void;
  setIsQuizModalOpen: (v: boolean) => void;
  setIsSettingsOpen: (v: boolean) => void;
  currentUser: FirebaseUser | null;
  auth: any;
}

export const ChatSidebar = ({
  isSidebarOpen, setIsSidebarOpen, chats, currentChatId, setCurrentChatId,
  handleNewChat, handleStartRename, editingChatId, editingTitle, setEditingTitle,
  handleSaveRename, handleDeleteChat, setIsQuizModalOpen, setIsSettingsOpen, currentUser, auth
}: ChatSidebarProps) => {
  return (
    <AnimatePresence mode="wait">
      {isSidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="fixed md:relative top-0 left-0 h-full w-[280px] bg-[#070714] border-r border-[#00ffcc]/20 flex flex-col z-50 shrink-0 select-none shadow-[2px_0_15px_rgba(0,0,0,0.5)]"
          >
            <div className="p-4 border-b border-[#00ffcc]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#00ffcc]/10 border border-[#00ffcc]/40 flex items-center justify-center text-[#00ffcc]">
                  <Bot size={20} />
                </div>
                <span className="font-semibold text-white tracking-wide text-sm">Jyoti AI Chats</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors md:hidden">
                <X size={18} />
              </button>
            </div>

            <div className="p-3">
              <button
                onClick={() => {
                  handleNewChat();
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/40 text-[#00ffcc] font-medium text-sm transition-all duration-300 shadow-[0_0_12px_rgba(0,255,204,0.15)] group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>New Chat</span>
              </button>
            </div>

            <div className="px-3 pb-3 border-b border-[#00ffcc]/10">
              <div className="px-2 pb-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tools</div>
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
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-200 ${
                      currentChatId === chat.id ? 'bg-[#12122b] border border-[#00ffcc]/50 text-[#00ffcc] shadow-[0_0_10px_rgba(0,255,204,0.12)] font-medium' : 'border border-transparent text-zinc-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <MessageSquare size={16} className={`shrink-0 ${currentChatId === chat.id ? 'text-[#00ffcc]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(chat.id);
                          if (e.key === 'Escape') handleStartRename(chat, e as any); // hack to cancel
                        }}
                        onBlur={() => handleSaveRename(chat.id)}
                        autoFocus
                        className="flex-1 bg-black/50 border border-[#00ffcc]/60 rounded px-1.5 py-0.5 text-white text-xs focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate text-white font-medium">{chat.title}</span>
                        {chat.summary && <span className="truncate text-[10px] text-zinc-400 font-mono">{chat.summary}</span>}
                      </div>
                    )}
                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                      <button onClick={(e) => handleStartRename(chat, e)} className="p-1 hover:text-[#00ffcc] text-zinc-400 transition-colors" title="Rename"><Edit2 size={13} /></button>
                      <button onClick={(e) => handleDeleteChat(chat.id, chat.title, e)} className="p-1 hover:text-red-400 text-zinc-400 hover:bg-red-500/10 rounded transition-colors" title="Delete Chat"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-[#00ffcc]/20 bg-[#050510] flex items-center justify-between gap-1">
              <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 overflow-hidden hover:bg-white/5 p-1.5 rounded-xl transition-colors text-left flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-[#00ffcc] text-white flex items-center justify-center shrink-0 text-xs font-semibold">
                  {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || <User size={14} />}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs text-white truncate font-medium">{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}</span>
                  <span className="text-[10px] text-[#00ffcc] flex items-center gap-1"><Settings size={10} /> Settings & Profile</span>
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 text-zinc-400 hover:text-[#00ffcc] hover:bg-[#00ffcc]/10 rounded-lg transition-colors"><Sliders size={16} /></button>
                <button onClick={() => auth.signOut()} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><LogOut size={16} /></button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
