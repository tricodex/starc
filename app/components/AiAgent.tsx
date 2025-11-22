'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface AiAgentProps {
  balance: number;
  vaultBalance: number;
  walletId?: string | null;
  onAction?: (action: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AiAgent({ balance, vaultBalance, walletId, onAction }: AiAgentProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Starc Agent. I can help you optimize your treasury or manage your Circle Wallet.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: { balance, vaultBalance }
        })
      });

      const data = await response.json();
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('Failed to chat:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to the Starc network right now. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-0 p-6 border-b border-indigo-100 bg-white/50 backdrop-blur-sm z-10">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 overflow-hidden">
           <img src="/logo.png" alt="Starc Agent" className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="font-bold text-zinc-900 font-display">Starc Agent</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${walletId ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
            <span className="text-xs text-zinc-500 font-medium">
              {walletId ? 'Wallet Connected' : 'Wallet Disconnected'} • Gemini 1.5 Flash
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-6 custom-scrollbar pb-24">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-zinc-100 text-zinc-700 rounded-bl-none'}
            `}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Pinned to Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-indigo-50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !(!walletId || isLoading) && handleSend()}
            placeholder={walletId ? "Ask about yield, bridging, or automation..." : "Connect Circle Wallet to chat"}
            className="w-full pl-4 pr-12 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed"
            disabled={!walletId || isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!walletId || isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {!walletId && (
          <div className="text-center mt-2">
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
              ⚠️ Wallet Connection Required
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
