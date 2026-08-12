import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Sparkles, Zap, Shield } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050510] text-[#00ffcc] font-sans selection:bg-[#00ffcc]/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="border-b border-[#00ffcc]/20 bg-[#050510]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00ffcc]/10 flex items-center justify-center border border-[#00ffcc]/30">
              <Bot size={20} className="text-[#00ffcc]" />
            </div>
            <span className="font-bold text-lg tracking-wide">Jyoti AI</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 rounded-full bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/30 hover:bg-[#00ffcc]/20 transition-all text-sm font-medium"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 pt-20 pb-32">
        <div className="flex flex-col items-center text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-sm font-medium mb-4"
          >
            <Sparkles size={16} />
            Powered by Gemma 4 31B
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl leading-tight"
          >
            Your Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ffcc] to-[#ff00ff]">Companion</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl"
          >
            Experience lightning-fast responses, advanced code generation, and intelligent text extraction from images and PDFs, all powered by our next-gen AI model.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pt-8"
          >
            <button
              onClick={() => navigate('/chat')}
              className="px-8 py-4 rounded-full bg-[#00ffcc] text-[#050510] font-bold text-lg hover:bg-[#00ccaa] hover:shadow-[0_0_30px_rgba(0,255,204,0.4)] transition-all flex items-center gap-2"
            >
              Start Chatting <Zap size={20} />
            </button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="grid md:grid-cols-3 gap-8 mt-32"
        >
          <div className="bg-[#0a0a1a] p-8 rounded-2xl border border-[#00ffcc]/20 hover:border-[#00ffcc]/50 transition-colors">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 border border-purple-500/30 text-purple-400">
              <Bot size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Smart Conversations</h3>
            <p className="text-gray-400 leading-relaxed">Engage in natural, context-aware conversations powered by the massive 31 Billion parameter Gemma model.</p>
          </div>
          <div className="bg-[#0a0a1a] p-8 rounded-2xl border border-[#00ffcc]/20 hover:border-[#00ffcc]/50 transition-colors">
            <div className="w-12 h-12 bg-[#00ffcc]/10 rounded-xl flex items-center justify-center mb-6 border border-[#00ffcc]/30 text-[#00ffcc]">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">OCR & PDF Parsing</h3>
            <p className="text-gray-400 leading-relaxed">Upload images and PDFs directly. The AI instantly extracts and understands the text inside your documents.</p>
          </div>
          <div className="bg-[#0a0a1a] p-8 rounded-2xl border border-[#00ffcc]/20 hover:border-[#00ffcc]/50 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 border border-blue-500/30 text-blue-400">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Secure & Private</h3>
            <p className="text-gray-400 leading-relaxed">Your data is secured with Firebase authentication. Create an account to access the advanced AI features securely.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
