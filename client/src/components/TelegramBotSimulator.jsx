import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Volume2, ShieldCheck, Sparkles, RefreshCw, 
  CheckCircle2, XCircle, ChevronRight, CornerDownLeft, MessageSquare
} from 'lucide-react';
import { useRole } from '../context/RoleContext';

export default function TelegramBotSimulator({ activePhone, onRefresh }) {
  const { customPhone, activeRole } = useRole();
  const currentPhone = activePhone || customPhone || activeRole?.phone || '+91 98123 45099';

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `🌾 नमस्ते रामू जी!\nKhetOS (खेतOS) किसान सहायता बॉट में आपका स्वागत है।\n\n📍 आपका खेतपिन: HR-ROH-78G4 (Bhalaut)\n📱 फोन CLI: ${currentPhone} (स्वचालित प्रमाणित)\n\nआज़ादपुर मंडी भाव जानने के लिए /mandi दबाएं।\nस्टॉक देखने के लिए /mystock दबाएं।`,
      timestamp: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [playingAudioIdx, setPlayingAudioIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendCommand = async (cmdText) => {
    const textToSend = cmdText || inputText;
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/bot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          text: textToSend.trim()
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply || 'कमांड प्रोसेस हो गया है।',
        audio_base64: data.audio_base64,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);

      // If stock updated, trigger parent refresh
      if (['/addlot', '/modlot', '/dellot', '/accept', '/reject'].some(c => textToSend.startsWith(c))) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Telegram bot command error:', err);
      const errMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: '⚠️ सर्वर से कनेक्ट करने में समस्या हुई। कृपया दोबारा प्रयास करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const playVoice = (idx, b64) => {
    if (!b64) return;
    if (playingAudioIdx === idx && window.khetosTgAudio) {
      window.khetosTgAudio.pause();
      setPlayingAudioIdx(null);
      return;
    }
    try {
      if (window.khetosTgAudio) {
        window.khetosTgAudio.pause();
      }
      const audio = new Audio("data:audio/mp3;base64," + b64);
      window.khetosTgAudio = audio;
      setPlayingAudioIdx(idx);
      audio.onended = () => setPlayingAudioIdx(null);
      audio.onerror = () => setPlayingAudioIdx(null);
      audio.play().catch(e => {
        console.warn("Audio blocked:", e);
        setPlayingAudioIdx(null);
      });
    } catch (e) {
      console.warn("Audio play error:", e);
      setPlayingAudioIdx(null);
    }
  };

  const quickCommands = [
    { label: '/mandi (भाव)', cmd: '/mandi' },
    { label: '/mystock (स्टॉक)', cmd: '/mystock' },
    { label: '/addlot 4 (नया लॉट)', cmd: '/addlot 4' },
    { label: '/modlot 1 5 (संशोधन)', cmd: '/modlot 1 5' },
    { label: '/dellot 1 (₹0 रद्द)', cmd: '/dellot 1' },
    { label: '/accept 1 (स्वीकार)', cmd: '/accept 1' },
    { label: '/help (मदद)', cmd: '/help' },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl shadow-xl flex flex-col h-[560px] overflow-hidden">
      {/* Telegram Chat Header */}
      <div className="p-3.5 bg-[#17212b] text-white border-b border-[#0e1621] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Avatar */}
          <div className="relative">
            <img 
              src="/khetos-logo.png" 
              alt="KhetOS Logo" 
              className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover shadow-sm bg-[#0a0d12]"
              onError={(e) => {
                // Fallback if image path differs
                e.target.style.display = 'none';
              }}
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#17212b]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">KhetOS Kisan Mitra Bot 🌾</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                bot
              </span>
            </div>
            <p className="text-[11px] text-[#708499] flex items-center gap-1">
              <span>@khetos_bot</span> &bull; 
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-mono text-[10px]">{currentPhone}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-[#242f3d] text-[#7996b2] font-semibold px-2 py-1 rounded-lg border border-[#2b394a]">
            Zero-App Architecture
          </span>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0e1621]/40 dark:bg-[#0e1621]/90">
        <div className="text-center my-2">
          <span className="text-[10px] bg-[#17212b]/80 text-[#7996b2] px-2.5 py-1 rounded-full border border-[#242f3d]">
            Connected via Farmer Caller Line Identification (CLI)
          </span>
        </div>

        {messages.map((m, idx) => {
          const isBot = m.sender === 'bot';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <img 
                  src="/khetos-logo.png" 
                  alt="KhetOS" 
                  className="w-7 h-7 rounded-full border border-emerald-500/30 shrink-0 mt-0.5 object-cover bg-black"
                />
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm relative ${
                  isBot
                    ? 'bg-[#182533] text-[#e4ecf2] border border-[#243343] rounded-tl-sm'
                    : 'bg-[#2b5278] text-white border border-[#3b6a9b] rounded-tr-sm'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-[12px]">{m.text}</div>

                {/* Voice synthesis button if audio available */}
                {m.audio_base64 && (
                  <button
                    onClick={() => playVoice(idx, m.audio_base64)}
                    className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold transition"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${playingAudioIdx === idx ? 'animate-bounce text-emerald-300' : ''}`} />
                    <span>{playingAudioIdx === idx ? 'Playing Hindi Audio...' : 'Listen to Spoken Hindi'}</span>
                  </button>
                )}

                <div className="text-[9px] text-[#708499] text-right mt-1 font-mono">
                  {m.timestamp}
                </div>
              </div>

              {!isBot && (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  K
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#7996b2] bg-[#182533] p-2.5 rounded-xl max-w-[200px] border border-[#243343]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>KhetOS Bot is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 bg-[#17212b] border-t border-[#242f3d] overflow-x-auto flex items-center gap-1.5">
        <span className="text-[10px] text-[#708499] font-bold uppercase shrink-0 pl-1">Quick:</span>
        {quickCommands.map((qc) => (
          <button
            key={qc.cmd}
            onClick={() => handleSendCommand(qc.cmd)}
            disabled={loading}
            className="px-2.5 py-1 bg-[#242f3d] hover:bg-[#2f3d4f] text-[#64b5f6] border border-[#324357] rounded-lg text-[11px] font-mono font-bold transition whitespace-nowrap active:scale-95 disabled:opacity-50"
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* Input Message Bar */}
      <div className="p-2.5 bg-[#17212b] border-t border-[#0e1621] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
          placeholder="Type message or command (/mandi, /addlot 4)..."
          disabled={loading}
          className="flex-1 bg-[#242f3d] border border-[#324357] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#708499] focus:outline-none focus:border-emerald-500 font-sans"
        />
        <button
          onClick={() => handleSendCommand()}
          disabled={loading || !inputText.trim()}
          className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl shadow transition active:scale-95 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
