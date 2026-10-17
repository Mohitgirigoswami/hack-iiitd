import React, { useState, useEffect } from 'react';
import { 
  Bell, X, Phone, MessageSquare, Volume2, CheckCircle2, 
  ExternalLink, Send, ShieldCheck, Clock, Radio, Sparkles, RefreshCw, Bot
} from 'lucide-react';
import TelegramBotSimulator from './TelegramBotSimulator';

export default function OmnichannelNotificationDrawer({ isOpen, onClose, activePhone = "+91 98123 45099" }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'ivr_call' | 'telegram'
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [tgHandle, setTgHandle] = useState('@ramu_kisan');
  const [linking, setLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showBot, setShowBot] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activePhone]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?phone=${encodeURIComponent(activePhone)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
    setLoading(false);
  };

  const playAudio = (id, base64Audio) => {
    if (!base64Audio) return;
    if (playingAudioId === id && window.khetosNotifAudio) {
      window.khetosNotifAudio.pause();
      setPlayingAudioId(null);
      return;
    }
    try {
      if (window.khetosNotifAudio) {
        window.khetosNotifAudio.pause();
      }
      const audio = new Audio("data:audio/mp3;base64," + base64Audio);
      window.khetosNotifAudio = audio;
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
      audio.play().catch(e => {
        console.warn("Audio autoplay blocked:", e);
        setPlayingAudioId(null);
      });
    } catch (err) {
      console.warn("Audio error:", err);
      setPlayingAudioId(null);
    }
  };

  const handleLinkTelegram = async () => {
    setLinking(true);
    try {
      const res = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activePhone,
          username: tgHandle,
          chat_id: '129841029'
        })
      });
      if (res.ok) {
        setLinkSuccess(true);
        setTimeout(() => setLinkSuccess(false), 3000);
      }
    } catch (e) {
      console.warn('Telegram link failed:', e);
    }
    setLinking(false);
  };

  const handleSendTestDual = async () => {
    setSendingTest(true);
    try {
      await fetch('/api/telegram/notify-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: activePhone })
      });
      await fetchNotifications();
    } catch (e) {
      console.warn('Test dual notification failed:', e);
    }
    setSendingTest(false);
  };

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.channel === filter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div 
        className="w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col transform transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">Omnichannel Notifications</h3>
                <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 font-bold px-1.5 py-0.5 rounded">
                  Dual Live
                </span>
              </div>
              <p className="text-[11px] text-muted-fg font-mono">{activePhone}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={fetchNotifications}
              title="Refresh notifications"
              className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-secondary transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-fg hover:text-foreground hover:bg-secondary transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telegram Linking & Test Ribbon */}
        <div className="p-3.5 bg-secondary/80 border-b border-border space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              Telegram Account Link
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Auto-Synced to Caller ID
            </span>
          </div>

          <div className="flex gap-2">
            <input 
              type="text"
              value={tgHandle}
              onChange={(e) => setTgHandle(e.target.value)}
              placeholder="@username"
              className="flex-1 bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            />
            <button
              onClick={handleLinkTelegram}
              disabled={linking}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shrink-0"
            >
              {linking ? 'Linking...' : linkSuccess ? 'Linked ✓' : 'Link Telegram'}
            </button>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-border/40">
            <span className="text-[10px] text-muted-fg">Simultaneous IVR Call + Telegram Ping</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBot(!showBot)}
                className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1"
              >
                <Bot className="w-3.5 h-3.5" />
                {showBot ? 'View Alerts' : 'Open Bot Terminal'}
              </button>
              <button
                onClick={handleSendTestDual}
                disabled={sendingTest}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                {sendingTest ? 'Sending...' : 'Test Dual ⚡'}
              </button>
            </div>
          </div>
        </div>

        {/* Telegram Bot Simulator or Notifications Scroll List */}
        {showBot ? (
          <div className="flex-1 overflow-hidden p-2">
            <TelegramBotSimulator activePhone={activePhone} onRefresh={fetchNotifications} />
          </div>
        ) : (
          <>
            {/* Channel Filter Pills */}
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 text-xs bg-card">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-fg hover:text-foreground hover:bg-secondary'
            }`}
          >
            All Channels ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('ivr_call')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
              filter === 'ivr_call'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-fg hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Phone className="w-3 h-3" />
            Phone (IVR)
          </button>
          <button
            onClick={() => setFilter('telegram')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition flex items-center gap-1 ${
              filter === 'telegram'
                ? 'bg-blue-600 text-white'
                : 'text-muted-fg hover:text-foreground hover:bg-secondary'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            Telegram
          </button>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-muted-fg space-y-2">
              <Bell className="w-8 h-8 opacity-30" />
              <p className="text-xs">No notifications yet for this number.</p>
              <button 
                onClick={handleSendTestDual}
                className="text-xs text-primary font-bold hover:underline"
              >
                Send a test dual-channel notification
              </button>
            </div>
          ) : (
            filteredNotifs.map((n) => {
              const isCall = n.channel === 'ivr_call';
              const isPlaying = playingAudioId === n.id;
              return (
                <div 
                  key={n.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                    isCall 
                      ? 'bg-emerald-950/20 border-emerald-500/30' 
                      : 'bg-blue-950/20 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                      isCall 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                      {isCall ? <Phone className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                      {isCall ? 'IVR Outbound Phone Call' : 'Telegram Verified Alert'}
                    </span>
                    <span className="text-[10px] text-muted-fg flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {n.created_at ? n.created_at.slice(11, 16) : 'Just now'}
                    </span>
                  </div>

                  <h4 className="font-bold text-foreground text-xs">{n.title}</h4>
                  <p className="text-muted-fg text-[11px] whitespace-pre-line leading-relaxed">
                    {n.message}
                  </p>

                  {/* Play audio button if IVR call with audio */}
                  {n.audio_base64 && (
                    <div className="pt-1.5 flex items-center justify-between border-t border-border/50">
                      <button
                        onClick={() => playAudio(n.id, n.audio_base64)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition ${
                          isPlaying
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                        }`}
                      >
                        <Volume2 className={`w-3 h-3 ${isPlaying ? 'animate-bounce' : ''}`} />
                        {isPlaying ? 'Playing Phone Audio...' : 'Listen to IVR Voice Alert 🔊'}
                      </button>
                      <span className="text-[9px] text-muted-fg font-mono">Azure Neural hi-IN</span>
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        </>
      )}
    </div>
  </div>
);
}
