import React from 'react';
import { PanelLeftClose, PanelLeft, Bot, Volume2, VolumeX, Settings, Plus } from 'lucide-react';

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  autoReadAloud: boolean;
  toggleAutoRead: () => void;
  setIsSettingsOpen: (v: boolean) => void;
  handleNewChat: () => void;
}

export const ChatHeader = ({
  isSidebarOpen,
  setIsSidebarOpen,
  autoReadAloud,
  toggleAutoRead,
  setIsSettingsOpen,
  handleNewChat
}: ChatHeaderProps) => {
  return (
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
          onClick={() => {
            handleNewChat();
            if (window.innerWidth < 768) {
              setIsSidebarOpen(false);
            }
          }}
          className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#00ffcc]/40 text-[#00ffcc] hover:bg-[#00ffcc]/10 transition-colors"
        >
          <Plus size={14} />
          <span>New Chat</span>
        </button>
      </div>
    </header>
  );
};
