import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, ArrowLeft, Volume2, CheckCircle2, ChevronRight, 
  Mic, Sparkles, MapPin, ShieldCheck, UserCheck, RefreshCw, MessageSquare, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import OmnichannelNotificationDrawer from '../components/OmnichannelNotificationDrawer';

export default function CallSimulator() {
  const navigate = useNavigate();
  const { customPhone, setCustomPhone } = useRole();

  const [phoneInput, setPhoneInput] = useState(customPhone || '+91 98123 45099');
  const [callActive, setCallActive] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [spokenText, setSpokenText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [poolJoined, setPoolJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(true);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [farmerNameInput, setFarmerNameInput] = useState('Ramu Sharma');
  const [selectedVillageChoice, setSelectedVillageChoice] = useState('1');
  const [voiceCueText, setVoiceCueText] = useState('बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।');
  const [registeredKhetPin, setRegisteredKhetPin] = useState(null);
  const [dualAlertDispatched, setDualAlertDispatched] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  const audioContextRef = useRef(null);

  // Sync phone change to context
  const handlePhoneChange = (newPhone) => {
    setPhoneInput(newPhone);
    setCustomPhone(newPhone);
    setSessionUser(null);
    setRegisteredKhetPin(null);
    setDualAlertDispatched(false);
  };

  // Timer for live call duration
  useEffect(() => {
    let timer;
    if (callActive) {
      timer = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(timer);
  }, [callActive]);

  // DTMF Tone Generator via Web Audio API
  const playDtmfTone = (digit) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const freqs = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
      };

      const pair = freqs[digit] || [700, 1200];
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = pair[0];
      osc2.frequency.value = pair[1];

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // AudioContext fallback
    }
  };

  const playAudioB64 = (b64) => {
    if (!b64) return;
    try {
      if (window.khetosAudio) {
        window.khetosAudio.pause();
        window.khetosAudio.currentTime = 0;
      }
      const audio = new Audio("data:audio/mp3;base64," + b64);
      window.khetosAudio = audio;
      setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      audio.play().catch(e => {
        console.warn("Audio autoplay blocked:", e);
        setIsSpeaking(false);
      });
    } catch (e) {
      console.warn("Audio play error:", e);
      setIsSpeaking(false);
    }
  };

  const speakHindi = async (text, directB64 = null) => {
    setSpokenText(text);
    setIsSpeaking(true);

    if (directB64) {
      playAudioB64(directB64);
      return;
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          playAudioB64(data.audio_base64);
          return;
        }
      }
    } catch (err) {
      console.warn("TTS fetch error, using speech synth fallback:", err);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsSpeaking(false), 2500);
    }
  };

  const handleStartCall = async () => {
    setCallActive(true);
    setPoolJoined(false);
    setDualAlertDispatched(false);
    playDtmfTone('1');

    try {
      setLoading(true);
      const res = await fetch(`/api/call/session?phone=${encodeURIComponent(phoneInput)}`);
      if (res.ok) {
        const data = await res.json();
        setIsRegistered(data.is_registered);
        if (!data.is_registered) {
          setRegistrationMode(true);
          setSessionUser(null);
          speakHindi(data.voice_prompt_hi, data.audio_base64);
        } else {
          setRegistrationMode(false);
          setSessionUser(data.user);
          setRegisteredKhetPin(data.user?.khet_pin);
          speakHindi(data.voice_prompt_hi, data.audio_base64);
        }
      } else {
        speakHindi("KhetOS में आपका स्वागत है। मंडी भाव के लिए 1 दबाएं। गाड़ी पूलिंग के लिए 2 दबाएं।");
      }
    } catch (e) {
      speakHindi("KhetOS में आपका स्वागत है। मंडी भाव के लिए 1 दबाएं। गाड़ी पूलिंग के लिए 2 दबाएं।");
    } finally {
      setLoading(false);
    }
  };

  const handleEndCall = () => {
    setCallActive(false);
    setIsSpeaking(false);
    setRegistrationMode(false);
    if (window.khetosAudio) {
      window.khetosAudio.pause();
      window.khetosAudio.currentTime = 0;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // First-Call Voice Registration Workflow
  const handleCompleteRegistration = async (villageChoice = selectedVillageChoice) => {
    playDtmfTone(villageChoice);
    setLoading(true);
    try {
      const res = await fetch('/api/call/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caller_phone: phoneInput,
          farmer_name: farmerNameInput,
          village_choice: villageChoice,
          voice_breadcrumb_text: voiceCueText
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setLoading(false);

      setIsRegistered(true);
      setRegistrationMode(false);
      setSessionUser(data.user);
      setRegisteredKhetPin(data.khet_pin);
      setDualAlertDispatched(true);

      if (data.voice_prompt_hi) {
        speakHindi(data.voice_prompt_hi, data.audio_base64);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setLoading(false);
    }
  };

  const handleKeypadPress = async (digit) => {
    playDtmfTone(digit);

    if (!callActive) {
      handleStartCall();
      return;
    }

    // If currently in first-call registration mode, digits 1-4 select village
    if (registrationMode) {
      if (['1', '2', '3', '4'].includes(digit)) {
        setSelectedVillageChoice(digit);
        handleCompleteRegistration(digit);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/call/keypad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digit: digit,
          caller_phone: phoneInput,
          farmer_name: sessionUser?.name || farmerNameInput,
          village: sessionUser?.village || 'Bhalaut'
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setLoading(false);

      if (data.voice_prompt_hi) {
        speakHindi(data.voice_prompt_hi, data.audio_base64);
      }

      if (digit === '2') {
        setPoolJoined(true);
        setDualAlertDispatched(true);
      }
    } catch (err) {
      console.error('Call simulator keypad error:', err);
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-muted-fg hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/25">
          Dedicated Telephony Route (/call)
        </span>
      </div>

      {/* Caller Phone Number Selector Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-primary" />
            Active Caller Phone Number (CLI Simulator)
          </label>
          <span className="text-[10px] text-muted-fg font-mono">Multi-Session Persistent</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={phoneInput}
            onChange={(e) => handlePhoneChange(e.target.value)}
            disabled={callActive}
            placeholder="+91 98123 45099"
            className="flex-1 bg-secondary/80 border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => handlePhoneChange('+91 98123 45099')}
              disabled={callActive}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition shrink-0 ${
                phoneInput === '+91 98123 45099'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-fg border-border hover:text-foreground'
              }`}
            >
              Ramu (+91 98123)
            </button>
            <button
              onClick={() => handlePhoneChange('+91 98991 22334')}
              disabled={callActive}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition shrink-0 ${
                phoneInput === '+91 98991 22334'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-fg border-border hover:text-foreground'
              }`}
            >
              Suresh (+91 98991)
            </button>
            <button
              onClick={() => handlePhoneChange('+91 99999 88888')}
              disabled={callActive}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition shrink-0 ${
                phoneInput === '+91 99999 88888'
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-secondary text-amber-500 border-border hover:text-foreground'
              }`}
            >
              New Caller ⚡
            </button>
          </div>
        </div>
      </div>

      {/* Main Feature Phone Chassis */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-w-md mx-auto relative overflow-hidden transition-colors">
        {/* Phone Earpiece Speaker Notch */}
        <div className="w-20 h-3 bg-secondary rounded-full mx-auto flex items-center justify-center">
          <div className="w-8 h-1 bg-border rounded-full" />
        </div>

        {/* OLED Caller Display */}
        <div className="text-center py-4 px-4 bg-secondary/80 rounded-2xl border border-border space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className={`w-2 h-2 rounded-full ${callActive ? 'bg-emerald-500 animate-ping' : 'bg-muted-fg'}`} />
            <span className="text-[11px] font-bold text-primary uppercase tracking-widest font-mono">
              {callActive ? `Toll-Free Connected (${formatTimer(callSeconds)})` : 'Toll-Free Dialpad • 1800-KHET-OS'}
            </span>
          </div>

          <h3 className="text-xl font-black text-foreground">
            KhetOS Telephony Gateway
          </h3>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-card rounded-lg border border-border text-xs">
            <span className="font-mono text-muted-fg">{phoneInput}</span>
            {isRegistered ? (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {sessionUser?.name || 'Verified Farmer'} ({sessionUser?.khet_pin || registeredKhetPin || 'HR-ROH-78G4'})
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Unregistered First-Time Caller
              </span>
            )}
          </div>

          {/* Hindi Voice Waveform & Transcript */}
          {callActive && (
            <div className="mt-3 p-3 bg-card rounded-xl border border-border text-xs text-left space-y-2 animate-fade-in shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce text-primary' : 'text-muted-fg'}`} />
                  Azure Neural Hindi Audio Stream
                </span>
                {isSpeaking ? (
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="w-1 h-5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold ml-1">
                      Speaking
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-fg">Audio standby</span>
                )}
              </div>
              <p className="italic text-foreground text-xs leading-relaxed font-medium">
                "{spokenText || 'Audio prompt playing...'}"
              </p>
            </div>
          )}
        </div>

        {/* First-Call Registration Dialog Box */}
        {callActive && registrationMode && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-amber-500 font-bold">
              <MapPin className="w-4 h-4" />
              <span>First-Call Voice Farm Registration</span>
            </div>
            <p className="text-muted-fg text-[11px] leading-relaxed">
              Press keypad 1–4 to pick Panchayat village, or click below. A permanent KhetPin will be generated for this mobile number:
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { key: '1', name: 'Bhalaut (Rohtak)' },
                { key: '2', name: 'Kalanaur (Rohtak)' },
                { key: '3', name: 'Najafgarh (Delhi)' },
                { key: '4', name: 'Madina (Rohtak)' }
              ].map((v) => (
                <button
                  key={v.key}
                  onClick={() => handleCompleteRegistration(v.key)}
                  className="p-2 bg-card hover:bg-primary/20 border border-border hover:border-primary/50 rounded-xl text-left font-bold transition flex items-center justify-between"
                >
                  <span className="text-foreground">{v.name}</span>
                  <span className="font-mono text-primary text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                    Key {v.key}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-border/60">
              <span className="text-[10px] text-muted-fg block mb-1">Simulated 10s Landmark Audio Breadcrumb:</span>
              <div className="p-2 bg-secondary/80 rounded-lg border border-border text-[11px] font-mono text-foreground flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-primary" />
                <span className="truncate">"{voiceCueText}"</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stage Key 2 Demo Button */}
        {callActive && !poolJoined && !registrationMode && (
          <button
            onClick={() => handleKeypadPress('2')}
            className="w-full py-2.5 px-3 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 animate-pulse shadow-sm active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Stage Shortcut: Press Key 2 (Pool Ramu's 4 Qtl & Fill Truck ⚡)
          </button>
        )}

        {/* 100% Pool Full Celebratory Banner */}
        {poolJoined && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl space-y-2 animate-bounce">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Bolero Truck Pool 100% Full & Dispatched!</span>
            </div>
            <p className="text-xs text-muted-fg">
              4 quintals added to Mahindra Bolero. Azadpur APMC Mandi route locked.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              Inspect Live Projector Dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dual-Channel Notification Dispatched Ribbon */}
        {dualAlertDispatched && (
          <div className="p-3 bg-blue-500/15 border border-blue-500/40 rounded-xl flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <div>
                <span className="font-bold text-blue-400 block">Dual Alert Dispatched!</span>
                <span className="text-[10px] text-muted-fg">Phone IVR Audio + Telegram Synced</span>
              </div>
            </div>
            <button
              onClick={() => setIsNotifDrawerOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-500 transition"
            >
              View Feed
            </button>
          </div>
        )}

        {/* DTMF Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[300px] mx-auto">
          {[
            { num: '1', sub: registrationMode ? 'Bhalaut' : 'Mandi Rates' },
            { num: '2', sub: registrationMode ? 'Kalanaur' : 'Pool Truck ⚡' },
            { num: '3', sub: registrationMode ? 'Najafgarh' : 'My Stock' },
            { num: '4', sub: registrationMode ? 'Madina' : 'Weather' },
            { num: '5', sub: 'Order Status' },
            { num: '6', sub: 'KhetPin' },
            { num: '7', sub: 'Payments' },
            { num: '8', sub: 'FPO Support' },
            { num: '9', sub: 'Language' },
            { num: '*', sub: 'Repeat' },
            { num: '0', sub: 'Operator' },
            { num: '#', sub: 'Confirm' },
          ].map((key) => (
            <button
              key={key.num}
              onClick={() => handleKeypadPress(key.num)}
              className="py-3 px-2 bg-secondary/70 hover:bg-primary/20 hover:border-primary/50 text-foreground border border-border rounded-2xl transition-all duration-100 active:scale-95 flex flex-col items-center justify-center shadow-sm group"
            >
              <span className="text-xl font-black font-mono group-hover:text-primary transition-colors">
                {key.num}
              </span>
              <span className="text-[9px] text-muted-fg tracking-tighter truncate max-w-[80px]">
                {key.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Call Action Controls (Start / End Call) */}
        <div className="pt-2 flex justify-center">
          {!callActive ? (
            <button
              onClick={handleStartCall}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="w-5 h-5 animate-bounce" />
              Dial 1800-KHET-OS (Start Toll-Free Call)
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              End IVR Call
            </button>
          )}
        </div>

        <p className="text-[10px] text-center text-muted-fg">
          Empowering 86% of Indian farmers who use feature phones without 4G apps.
        </p>
      </div>

      {/* Omnichannel Drawer Mounted */}
      <OmnichannelNotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        activePhone={phoneInput}
      />
    </div>
  );
}
