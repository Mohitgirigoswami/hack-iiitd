import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Volume2, ShieldCheck, Sparkles, RefreshCw, 
  CheckCircle2, XCircle, ChevronRight, CornerDownLeft, MessageSquare,
  Camera, Image, Upload, X, Droplets, Mic, MicOff, Radio
} from 'lucide-react';
import { useRole } from '../context/RoleContext';

export default function TelegramBotSimulator({ activePhone, onRefresh }) {
  const { customPhone, activeRole } = useRole();
  const currentPhone = activePhone || customPhone || activeRole?.phone || '+91 98123 45099';

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: `🌾 नमस्ते रामू जी!\nKhetOS (खेतOS) किसान साथी में आपका स्वागत है।\n\n📍 आपका खेतपिन: HR-ROH-78G4 (Bhalaut)\n📱 फोन CLI: ${currentPhone} (स्वचालित प्रमाणित)\n\n⚡ आपको कुछ टाइप करने की जरूरत नहीं है! नीचे दिए गए विकल्पों में से चुनें:`,
      options: [
        { label: '🌾 फसल जोड़ें (Add Crop)', cmd: '/addlot_start' },
        { label: '🚿 ट्यूबवेल सलाह (Tubewell)', cmd: '/tubewell' },
        { label: '📈 मंडी भाव (Mandi Rates)', cmd: '/mandi' },
        { label: '📦 मेरा स्टॉक (My Stock)', cmd: '/mystock' },
        { label: '📸 पत्ती रोग जांच (Doctor)', cmd: '/photo' },
        { label: '🚛 गाड़ी स्थिति (Truck)', cmd: '/truckstatus' }
      ],
      timestamp: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [playingAudioIdx, setPlayingAudioIdx] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
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
        options: data.options || [],
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

  const handleSendVoice = async (spokenTranscript, audioB64 = null) => {
    setShowVoiceModal(false);
    if (isRecording) stopRecording(false);

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      isVoice: true,
      text: `🎙️ "${spokenTranscript}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          text: spokenTranscript,
          audio_base64: audioB64
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply || 'आवाज़ नोट प्रोसेस हो गया है।',
        audio_base64: data.audio_base64,
        options: data.options || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Voice processing error:', err);
      const errMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: '⚠️ आवाज़ समझने में कठिनाई हुई। कृपया दोबारा बोलें या नीचे दिए विकल्पों का उपयोग करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result.split(',')[1];
          handleSendVoice('माइक्रोफोन रिकॉर्डिंग', base64Data);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access unavailable, using vernacular speech presets:', err);
      handleSendVoice('20 बोरी गेहूं मंडी भेजनी है');
    }
  };

  const stopRecording = (shouldProcess = true) => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (shouldProcess) {
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    }
  };

  const handleSendPhoto = async (crop, disease, label, imagePreview) => {
    setShowPhotoModal(false);
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: `📸 [पत्ती फोटो]: ${label || crop}`,
      imagePreview: imagePreview,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/bot/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          text: `/photo ${crop.toLowerCase()}`,
          crop: crop,
          disease: disease
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();

      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply || 'जांच पूरी हो गई है।',
        audio_base64: data.audio_base64,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Photo scan error:', err);
      const errMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: '⚠️ फोटो स्कैन करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      handleSendPhoto('Mustard', 'White Rust', file.name, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const quickCommands = [
    { label: '🌾 फसल जोड़ें', cmd: '/addlot_start' },
    { label: '🚿 ट्यूबवेल सलाह', cmd: '/tubewell' },
    { label: '📈 मंडी भाव', cmd: '/mandi' },
    { label: '📦 मेरा स्टॉक', cmd: '/mystock' },
    { label: '📸 फसल रोग', cmd: '/photo' },
    { label: '🚛 गाड़ी स्थिति', cmd: '/truckstatus' },
    { label: '📞 सहायता', cmd: '/help' },
    { label: '🔄 रीफ्रेश', cmd: '/start' },
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
                {m.imagePreview && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-white/20 bg-black/40">
                    <img src={m.imagePreview} alt="Leaf Scan" className="w-full h-32 object-cover" />
                  </div>
                )}
                <div className="whitespace-pre-wrap font-sans text-[12px]">{m.text}</div>

                {/* Voice synthesis button if audio available */}
                {m.audio_base64 && (
                  <button
                    onClick={() => playVoice(idx, m.audio_base64)}
                    className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold transition cursor-pointer"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${playingAudioIdx === idx ? 'animate-bounce text-emerald-300' : ''}`} />
                    <span>{playingAudioIdx === idx ? 'Playing Hindi Audio...' : 'Listen to Spoken Hindi'}</span>
                  </button>
                )}

                {/* Interactive Telegram Inline Buttons */}
                {isBot && m.options && m.options.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-1.5">
                    {m.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleSendCommand(opt.cmd)}
                        disabled={loading}
                        className="px-2.5 py-1.5 bg-[#253547] hover:bg-[#2e4259] active:scale-95 text-[#64b5f6] hover:text-white border border-[#374e69] hover:border-emerald-500/60 rounded-xl text-[11px] font-bold transition flex items-center justify-center text-center shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
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

      {/* ICAR Crop Leaf Disease Scanner Drawer */}
      {showPhotoModal && (
        <div className="p-3 bg-[#1e2c3a] border-t border-[#2b3d52] space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-[#2b3d52]">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
              <Camera className="w-3.5 h-3.5" />
              ICAR AI Leaf Disease Doctor (पत्ती रोग पहचान)
            </span>
            <button
              onClick={() => setShowPhotoModal(false)}
              className="p-1 rounded text-[#708499] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-[#8fa7be]">
            रोगग्रस्त पत्ती का नमूना चुनें या कैमरे से तस्वीर अपलोड करें:
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSendPhoto('Mustard', 'White Rust', 'सरसों सफेद रतुआ (White Rust)', 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&auto=format&fit=crop&q=80')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-emerald-500/50 rounded-xl text-left transition flex flex-col justify-between"
            >
              <span className="text-[11px] font-bold text-white block">🌿 सरसों पत्ती</span>
              <span className="text-[9px] text-amber-400 mt-1">White Rust</span>
            </button>

            <button
              onClick={() => handleSendPhoto('Wheat', 'Yellow Rust', 'गेहूँ पीला रतुआ (Yellow Rust)', 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&auto=format&fit=crop&q=80')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-emerald-500/50 rounded-xl text-left transition flex flex-col justify-between"
            >
              <span className="text-[11px] font-bold text-white block">🌾 गेहूँ पत्ती</span>
              <span className="text-[9px] text-yellow-400 mt-1">Yellow Rust</span>
            </button>

            <button
              onClick={() => handleSendPhoto('Potato', 'Late Blight', 'आलू झुलसा रोग (Late Blight)', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-emerald-500/50 rounded-xl text-left transition flex flex-col justify-between"
            >
              <span className="text-[11px] font-bold text-white block">🥔 आलू पत्ती</span>
              <span className="text-[9px] text-rose-400 mt-1">Late Blight</span>
            </button>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCustomFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-1.5 px-3 bg-[#2b415a] hover:bg-[#344f6d] border border-[#3d5a7d] text-[#64b5f6] rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>अपने फोन/कैमरे से फोटो अपलोड करें</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Note Simulator Modal Drawer */}
      {showVoiceModal && (
        <div className="p-3 bg-[#1d2733] border-t border-[#293a4c] space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#293a4c]">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>आवाज़ संदेश व क्षेत्रीय बोली (Vernacular Voice Note)</span>
            </span>
            <button
              onClick={() => {
                if (isRecording) stopRecording(false);
                setShowVoiceModal(false);
              }}
              className="p-1 rounded text-[#708499] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real Mic Recorder */}
          <div className="p-3 bg-[#17212b] rounded-xl border border-[#2b3d52] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={isRecording ? () => stopRecording(true) : startRecording}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 shadow-md ${
                  isRecording 
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <div>
                <span className="text-xs font-bold text-white block">
                  {isRecording ? `रिकॉर्डिंग जारी है (00:0${recordingSeconds})` : 'माइक पर बोलें (Tap to Speak)'}
                </span>
                <span className="text-[10px] text-[#8fa7be]">
                  {isRecording ? 'बोलने के बाद दोबारा टैप करें...' : 'हिंदी, हरियाणवी या ग्रामीण बोली में बोलें'}
                </span>
              </div>
            </div>
            {isRecording && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                REC ●
              </span>
            )}
          </div>

          <p className="text-[10px] text-[#8fa7be] font-semibold">
            या बिना माइक के तुरंत किसान आवाज़ संदेश भेजें:
          </p>

          {/* Spoken Vernacular Presets across 5 domains */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <button
              onClick={() => handleSendVoice('20 बोरी गेहूं मंडी भेजनी है')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-emerald-500/50 rounded-xl text-left transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-white block">🌾 "20 बोरी गेहूं मंडी भेजनी है"</span>
                <span className="text-[9px] text-emerald-400">लॉट बुकिंग (20 Bags Wheat)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-fg shrink-0" />
            </button>

            <button
              onClick={() => handleSendVoice('आज ट्यूबवेल कितनी देर चलाना है?')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-sky-500/50 rounded-xl text-left transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-white block">🚿 "आज ट्यूबवेल कितनी देर चलाना है?"</span>
                <span className="text-[9px] text-sky-400">सिंचाई व 3-फेज बिजली सलाह</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-fg shrink-0" />
            </button>

            <button
              onClick={() => handleSendVoice('सरसों का क्या भाव है आजादपुर में?')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-amber-500/50 rounded-xl text-left transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-white block">📈 "सरसों का क्या भाव है आजादपुर में?"</span>
                <span className="text-[9px] text-amber-400">APMC बनाम आढ़ती भाव</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-fg shrink-0" />
            </button>

            <button
              onClick={() => handleSendVoice('सरसों में चेपा कीट लगा है, क्या दवा डालें?')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-rose-500/50 rounded-xl text-left transition flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-white block">🌿 "सरसों में चेपा कीट लगा है दवा बताओ"</span>
                <span className="text-[9px] text-rose-400">ICAR डॉक्टर (15L ढोलकी नाप)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-fg shrink-0" />
            </button>

            <button
              onClick={() => handleSendVoice('गाड़ी पिकअप के लिए कब पहुंचेगी?')}
              className="p-2 bg-[#253547] hover:bg-[#2d4057] border border-[#374e69] hover:border-purple-500/50 rounded-xl text-left transition flex items-center justify-between sm:col-span-2"
            >
              <div>
                <span className="text-[11px] font-bold text-white block">🚛 "गाड़ी पिकअप के लिए कब पहुंचेगी?"</span>
                <span className="text-[9px] text-purple-400">मिल्क-रन शेड्यूल व पिकअप स्लॉट (08:45 AM)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-fg shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Input Message Bar */}
      <div className="p-2.5 bg-[#17212b] border-t border-[#0e1621] flex items-center gap-2">
        <button
          onClick={() => {
            setShowVoiceModal(!showVoiceModal);
            setShowPhotoModal(false);
          }}
          title="आवाज़ नोट भेजें (Voice Note / Regional Dialect)"
          className={`p-2 border rounded-xl transition cursor-pointer ${
            showVoiceModal || isRecording
              ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-[#242f3d] hover:bg-[#2f3d4f] text-emerald-400 border-[#324357]'
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setShowPhotoModal(!showPhotoModal);
            setShowVoiceModal(false);
          }}
          title="पत्ती की फोटो भेजें (Crop Leaf Disease Scanner)"
          className={`p-2 border rounded-xl transition cursor-pointer ${
            showPhotoModal
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-[#242f3d] hover:bg-[#2f3d4f] text-[#64b5f6] border-[#324357]'
          }`}
        >
          <Camera className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
          placeholder="बोलें या टाइप करें (/tubewell, /mandi, 20 बोरी गेहूं)..."
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
