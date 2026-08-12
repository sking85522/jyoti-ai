import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Sliders, Database, Download, Trash2, 
  Check, Sparkles, Shield, Cpu, Globe, MessageSquare, 
  HardDrive, AlertTriangle, RefreshCw
} from 'lucide-react';
import { User as FirebaseUser, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { rtdb, db } from '../lib/firebase';

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  chats: any[];
  totalMessagesCount?: number;
  onClearAllChats: () => void;
  customInstructions: string;
  onSaveCustomInstructions: (instructions: string) => void;
  preferredLang: string;
  onSavePreferredLang: (lang: string) => void;
};

export default function SettingsModal({
  isOpen,
  onClose,
  currentUser,
  chats,
  totalMessagesCount = 0,
  onClearAllChats,
  customInstructions,
  onSaveCustomInstructions,
  preferredLang,
  onSavePreferredLang
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'instructions' | 'system' | 'data'>('profile');
  
  // Profile edit states
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Custom instructions states
  const [instructionsText, setInstructionsText] = useState(customInstructions);
  const [langSelect, setLangSelect] = useState(preferredLang);
  const [instructionsSuccess, setInstructionsSuccess] = useState(false);

  // Clear confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load latest Firestore profile data whenever modal opens
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || '');

      const fetchFirestoreProfile = async () => {
        try {
          const profileDocRef = doc(db, 'users', currentUser.uid, 'profile', 'info');
          const docSnap = await getDoc(profileDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.displayName) setDisplayName(data.displayName);
            if (data.customInstructions) {
              setInstructionsText(data.customInstructions);
              onSaveCustomInstructions(data.customInstructions);
            }
            if (data.preferredLang) {
              setLangSelect(data.preferredLang);
              onSavePreferredLang(data.preferredLang);
            }
          }
        } catch (err) {
          console.warn("Firestore profile fetch warning:", err);
        }
      };

      fetchFirestoreProfile();
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    setInstructionsText(customInstructions);
    setLangSelect(preferredLang);
  }, [customInstructions, preferredLang]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsUpdatingProfile(true);
    setProfileSuccessMsg('');

    try {
      const newName = displayName.trim();
      await updateProfile(currentUser, {
        displayName: newName
      });

      // 1. Sync Profile Data to Cloud Firestore
      const profileDocRef = doc(db, 'users', currentUser.uid, 'profile', 'info');
      await setDoc(profileDocRef, {
        displayName: newName,
        email: currentUser.email,
        customInstructions: instructionsText,
        preferredLang: langSelect,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Sync Profile Data to Realtime Database
      if (rtdb) {
        await set(ref(rtdb, `users/${currentUser.uid}/profile`), {
          displayName: newName,
          email: currentUser.email,
          updatedAt: new Date().toISOString()
        });
      }

      setProfileSuccessMsg('प्रोफ़ाइल Firestore और अकाउंट में अपडेट हो गई!');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err) {
      console.error("Profile update error:", err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveInstructions = async () => {
    onSaveCustomInstructions(instructionsText);
    onSavePreferredLang(langSelect);

    if (currentUser) {
      try {
        // Save System Instructions to Firestore
        const profileDocRef = doc(db, 'users', currentUser.uid, 'profile', 'info');
        await setDoc(profileDocRef, {
          customInstructions: instructionsText,
          preferredLang: langSelect,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore instructions save error:", err);
      }
    }

    setInstructionsSuccess(true);
    setTimeout(() => setInstructionsSuccess(false), 2500);
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chats, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Jyoti_AI_Chat_Export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-[#0a0a1a] border border-[#00ffcc]/30 rounded-2xl shadow-[0_0_30px_rgba(0,255,204,0.15)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#00ffcc]/20 bg-[#050510]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30">
                <Sliders size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  Settings & Profile
                </h2>
                <p className="text-[11px] text-zinc-400">Configure your Jyoti AI preferences and account</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Container */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-52 bg-[#050510]/60 border-b md:border-b-0 md:border-r border-[#00ffcc]/15 p-2 flex md:flex-col gap-1 shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  activeTab === 'profile'
                    ? 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User size={15} />
                <span>Account & Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('instructions')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  activeTab === 'instructions'
                    ? 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles size={15} />
                <span>Custom AI Instructions</span>
              </button>

              <button
                onClick={() => setActiveTab('system')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  activeTab === 'system'
                    ? 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Cpu size={15} />
                <span>AI Engine & Memory</span>
              </button>

              <button
                onClick={() => setActiveTab('data')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left ${
                  activeTab === 'data'
                    ? 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/40'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <HardDrive size={15} />
                <span>Data & Controls</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              
              {/* TAB 1: PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#050510] border border-[#00ffcc]/20">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-[#00ffcc] text-white flex items-center justify-center text-xl font-bold border-2 border-[#00ffcc]/40 shadow-[0_0_15px_rgba(0,255,204,0.2)]">
                      {currentUser?.email?.[0]?.toUpperCase() || <User size={24} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {displayName || currentUser?.email?.split('@')[0] || 'User'}
                      </h3>
                      <p className="text-xs text-zinc-400">{currentUser?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                        Firebase Verified Account
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Display Name (आपका नाम)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-[#050510] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00ffcc]/60 transition-colors"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {profileSuccessMsg && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Check size={14} /> {profileSuccessMsg}
                        </span>
                      )}
                      <button
                        type="submit"
                        disabled={isUpdatingProfile}
                        className="ml-auto px-4 py-2 rounded-xl bg-[#00ffcc] hover:bg-[#00e6b8] text-black text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {isUpdatingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        Save Profile
                      </button>
                    </div>
                  </form>

                  {/* Account Stats */}
                  <div className="pt-4 border-t border-zinc-800">
                    <h4 className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
                      Account Overview & Usage
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-[#050510] border border-zinc-800">
                        <span className="block text-[10px] text-zinc-400">Total Chats</span>
                        <span className="text-base font-semibold text-white">{chats.length}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#050510] border border-zinc-800">
                        <span className="block text-[10px] text-zinc-400">Total Messages</span>
                        <span className="text-base font-semibold text-white">{totalMessagesCount}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#050510] border border-zinc-800 col-span-2 sm:col-span-1">
                        <span className="block text-[10px] text-zinc-400">AI Engine</span>
                        <span className="text-xs font-semibold text-[#00ffcc] truncate block">Hritik AI</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOM AI INSTRUCTIONS */}
              {activeTab === 'instructions' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-1">
                      <Sparkles size={16} className="text-[#00ffcc]" /> Custom System Instructions
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Customize how Jyoti AI responds to you. For example: "Answer concisely in bullet points", "Explain code step by step", or "Speak in casual Hinglish".
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Preferred Language / शैली
                    </label>
                    <select
                      value={langSelect}
                      onChange={(e) => setLangSelect(e.target.value)}
                      className="w-full bg-[#050510] border border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00ffcc]/60"
                    >
                      <option value="auto">Auto (Detect from message / मिश्रित)</option>
                      <option value="hindi">Hindi (शुद्ध हिंदी)</option>
                      <option value="hinglish">Hinglish (हिंदी + English)</option>
                      <option value="english">English Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      User Context & Personal Instructions
                    </label>
                    <textarea
                      rows={4}
                      value={instructionsText}
                      onChange={(e) => setInstructionsText(e.target.value)}
                      placeholder="e.g. I am a software developer. Always give code snippets in TypeScript with brief explanations..."
                      className="w-full bg-[#050510] border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00ffcc]/60 resize-none font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {instructionsSuccess && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                        <Check size={14} /> System Instructions Saved!
                      </span>
                    )}
                    <button
                      onClick={handleSaveInstructions}
                      className="ml-auto px-4 py-2 rounded-xl bg-[#00ffcc] hover:bg-[#00e6b8] text-black text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: AI ENGINE & MEMORY */}
              {activeTab === 'system' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#050510] border border-[#00ffcc]/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu size={18} className="text-[#00ffcc]" />
                        <span className="text-xs font-semibold text-white">Active AI Architecture</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                        Hritik AI Engine
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Jyoti AI is backed by Hritik AI neural models with high context understanding, multi-turn dialogue tracking, and real-time process indexing.
                    </p>
                  </div>

                </div>
              )}

              {/* TAB 4: DATA & CONTROLS */}
              {activeTab === 'data' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#050510] border border-zinc-800 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Export Chat History</h4>
                      <p className="text-[11px] text-zinc-400">Download all your chat history and topic references in JSON format.</p>
                    </div>
                    <button
                      onClick={handleExportData}
                      disabled={chats.length === 0}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Download size={14} /> Export
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-red-300">Clear All Chat History</h4>
                      <p className="text-[11px] text-zinc-400">Permanently remove all conversations from LocalStorage and Firebase.</p>
                    </div>
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Trash2 size={14} /> Clear All
                    </button>
                  </div>

                  {/* Clear confirmation sub-dialog */}
                  {showClearConfirm && (
                    <div className="p-4 rounded-xl bg-red-900/40 border border-red-500/60 space-y-3">
                      <div className="flex items-center gap-2 text-red-300 text-xs font-semibold">
                        <AlertTriangle size={16} /> क्या आप सभी पुरानी चैट्स को डिलीट करना चाहते हैं?
                      </div>
                      <p className="text-[11px] text-zinc-300">
                        यह क्रिया वापस नहीं ली जा सकती। आपकी सभी बातचीत हमेशा के लिए मिटा दी जाएगी।
                      </p>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onClearAllChats();
                            setShowClearConfirm(false);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                        >
                          Yes, Clear Everything
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
