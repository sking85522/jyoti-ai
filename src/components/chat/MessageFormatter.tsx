import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

export const CodeBlock = ({ className, children, ...props }: any) => {
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

export const AnimatedMarkdown = ({ content, isTyping, onComplete, onType }: { content: string, isTyping?: boolean, onComplete?: () => void, onType?: () => void }) => {
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
