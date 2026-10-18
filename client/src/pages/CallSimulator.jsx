import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, ArrowLeft, Volume2, CheckCircle2, ChevronRight, 
  Mic, Sparkles, MapPin, ShieldCheck, UserCheck, RefreshCw, MessageSquare, Bell, Package,
  Droplets, Zap, CloudRain
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
  const [stockSubmenuMode, setStockSubmenuMode] = useState(false);
  const [userStockLots, setUserStockLots] = useState([]);
  const [tubewellData, setTubewellData] = useState(null);
  const [activeSubmenu, setActiveSubmenu] = useState('MAIN'); // 'MAIN' | 'CROP' | 'BAG' | 'MANDI' | 'TUBEWELL' | 'STOCK' | 'TRUCK'
  const [chosenCropCode, setChosenCropCode] = useState('21');
  const [mandiPriceData, setMandiPriceData] = useState(null);
  const [truckData, setTruckData] = useState(null);

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
    setTubewellData(null);
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
    setStockSubmenuMode(false);
    setTubewellData(null);
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
    playDtmfTone(digit.length === 1 ? digit : digit[0]);

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

    // Handle return to Main Menu
    if (digit === '*' || digit === '#') {
      setActiveSubmenu('MAIN');
      setStockSubmenuMode(false);
      speakHindi("मुख्य मेनू पर वापस आ गए हैं। मंडी भाव के लिए 1 दबाएं, पूलिंग के लिए 2 दबाएं, स्टॉक के लिए 3 दबाएं, ट्यूबवेल सलाह के लिए 4 दबाएं।");
      return;
    }

    // Dynamic Multi-Key Stock Submenu Mapping
    let sendDigit = digit;
    if (stockSubmenuMode) {
      if (digit === '1') sendDigit = '31';
      else if (digit === '2') sendDigit = '32';
      else if (digit === '3') sendDigit = '33';
    }

    setLoading(true);
    try {
      const res = await fetch('/api/call/keypad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digit: sendDigit,
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

      if (sendDigit === '1' || (sendDigit.startsWith('1') && sendDigit.length === 2)) {
        setActiveSubmenu('MANDI');
        setMandiPriceData(data.price_data);
      } else if (sendDigit === '2') {
        setActiveSubmenu('CROP');
        setPoolJoined(true);
        setDualAlertDispatched(true);
      } else if (['21', '22', '23', '24', '25'].includes(sendDigit)) {
        setChosenCropCode(sendDigit);
        setActiveSubmenu('BAG');
        setPoolJoined(true);
        setDualAlertDispatched(true);
      } else if (sendDigit.length === 3 && sendDigit.startsWith('2')) {
        setActiveSubmenu('CONFIRMED');
        setPoolJoined(true);
        setDualAlertDispatched(true);
      } else if (sendDigit === '3') {
        setActiveSubmenu('STOCK');
        setStockSubmenuMode(true);
        setUserStockLots(data.user_lots || []);
      } else if (sendDigit === '31' || sendDigit === '32') {
        setDualAlertDispatched(true);
        if (data.lot) {
          setUserStockLots([data.lot]);
        }
      } else if (sendDigit === '33') {
        setDualAlertDispatched(true);
        setUserStockLots([]);
      } else if (sendDigit === '4' || (sendDigit.startsWith('4') && sendDigit.length === 2) || data.status === 'TUBEWELL_ADVISORY') {
        setActiveSubmenu('TUBEWELL');
        setTubewellData(data.advisory);
      } else if (sendDigit === '5') {
        setActiveSubmenu('TRUCK');
        setTruckData(data.pool);
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

        {/* Key 1 Mandi Rates Multi-Crop Submenu Panel */}
        {callActive && activeSubmenu === 'MANDI' && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>IVR Key 1: Mandi Rates Submenu (आज़ादपुर APMC भाव)</span>
              </div>
              <button
                onClick={() => setActiveSubmenu('MAIN')}
                className="text-[10px] text-muted-fg hover:text-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border"
              >
                Press * for Main Menu
              </button>
            </div>
            <p className="text-muted-fg text-[11px]">
              फसल का चयन करें या कीपैड 11–15 दबाएं:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { digit: '11', label: '🟡 सरसों (Mustard)' },
                { digit: '12', label: '🌾 गेहूँ (Wheat)' },
                { digit: '13', label: '🥔 आलू (Potato)' },
                { digit: '14', label: '🌾 धान (Paddy)' },
                { digit: '15', label: '🌱 चना (Gram)' },
              ].map(opt => (
                <button
                  key={opt.digit}
                  onClick={() => handleKeypadPress(opt.digit)}
                  className="p-2.5 bg-card hover:bg-amber-500/20 border border-border hover:border-amber-500/50 rounded-xl text-left font-bold transition flex items-center justify-between active:scale-95 cursor-pointer"
                >
                  <span className="text-foreground text-[11px]">{opt.label}</span>
                  <span className="font-mono text-amber-500 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                    Key {opt.digit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Key 2 Crop Selection Submenu Panel */}
        {callActive && activeSubmenu === 'CROP' && (
          <div className="p-4 bg-primary/10 border border-primary/40 rounded-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Package className="w-4 h-4" />
                <span>IVR Key 2: Select Crop Variety (फसल चुनें)</span>
              </div>
              <button
                onClick={() => setActiveSubmenu('MAIN')}
                className="text-[10px] text-muted-fg hover:text-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border"
              >
                Press * for Main Menu
              </button>
            </div>
            <p className="text-muted-fg text-[11px]">
              गाड़ी पूलिंग के लिए फसल चुनें (कीपैड 21–25 दबाएं):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { digit: '21', label: '🟡 सरसों (Mustard)' },
                { digit: '22', label: '🌾 गेहूँ (Wheat)' },
                { digit: '23', label: '🌾 धान (Paddy)' },
                { digit: '24', label: '🥔 आलू (Potato)' },
                { digit: '25', label: '🌱 चना (Gram)' },
              ].map(opt => (
                <button
                  key={opt.digit}
                  onClick={() => handleKeypadPress(opt.digit)}
                  className="p-2.5 bg-card hover:bg-primary/20 border border-border hover:border-primary/50 rounded-xl text-left font-bold transition flex items-center justify-between active:scale-95 cursor-pointer"
                >
                  <span className="text-foreground text-[11px]">{opt.label}</span>
                  <span className="font-mono text-primary text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                    Key {opt.digit}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Key 2 Bag Selection Submenu Panel */}
        {callActive && activeSubmenu === 'BAG' && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <Package className="w-4 h-4" />
                <span>IVR Key 2: Select 50kg Bags (बोरी संख्या चुनें)</span>
              </div>
              <button
                onClick={() => setActiveSubmenu('CROP')}
                className="text-[10px] text-muted-fg hover:text-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border cursor-pointer"
              >
                Press 2 to Change Crop
              </button>
            </div>
            <p className="text-muted-fg text-[11px]">
              गाड़ी में कितने कट्टे / बोरी लोड कराने हैं चुनें:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { code: '1', label: '5 बोरी (2.5 Qtl)' },
                { code: '2', label: '10 बोरी (5.0 Qtl)' },
                { code: '3', label: '20 बोरी (10.0 Qtl)' },
                { code: '4', label: '30 बोरी (15.0 Qtl)' },
              ].map(opt => (
                <button
                  key={opt.code}
                  onClick={() => handleKeypadPress(`${chosenCropCode}${opt.code}`)}
                  className="p-2.5 bg-card hover:bg-emerald-500/20 border border-border hover:border-emerald-500/50 rounded-xl text-left font-bold transition flex flex-col justify-between active:scale-95 cursor-pointer"
                >
                  <span className="text-foreground text-xs">{opt.label}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[10px] mt-1">
                    Key {chosenCropCode}{opt.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Key 5 Truck & Bolero Status Submenu */}
        {callActive && activeSubmenu === 'TRUCK' && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/40 rounded-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400 font-bold">
                <Package className="w-4 h-4" />
                <span>IVR Key 5: Scheduled Milk-Run Pickup Tracking</span>
              </div>
              <button
                onClick={() => setActiveSubmenu('MAIN')}
                className="text-[10px] text-muted-fg hover:text-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border"
              >
                Press * for Main Menu
              </button>
            </div>
            <div>
              <p className="text-foreground font-bold text-xs">
                महिन्द्रा बोलेरो मैक्सी ट्रक (HR-12-AE-8419) • ड्राइवर: बलजीत सिंह (+91 94160 88219)
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-card/60 border border-border">
                  <span className="text-muted-fg block text-[10px]">पूलिंग स्थिति</span>
                  <span className="font-semibold text-emerald-500">पूलिंग जारी है (कट-ऑफ शाम 6:00 बजे)</span>
                </div>
                <div className="p-2 rounded-lg bg-card/60 border border-border">
                  <span className="text-muted-fg block text-[10px]">रवाना समय</span>
                  <span className="font-semibold text-foreground">कल सुबह 07:00 बजे</span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 col-span-2">
                  <span className="text-blue-400 block text-[10px] font-bold">रामू शर्मा - पिकअप स्लॉट (स्टॉप #3)</span>
                  <span className="font-bold text-foreground">कल सुबह 08:45 AM - 09:15 AM (Village Bhalaut PACS)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key 3 Stock Management Multi-Key Interactive Panel */}
        {callActive && stockSubmenuMode && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Package className="w-4 h-4" />
                <span>IVR Key 3: Stock Management Submenu</span>
              </div>
              <button
                onClick={() => setStockSubmenuMode(false)}
                className="text-[10px] text-muted-fg hover:text-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border"
              >
                Press * for Main Menu
              </button>
            </div>

            <p className="text-muted-fg text-[11px] leading-relaxed">
              Farmer can increase, decrease, or cancel/remove their harvest lot with ₹0 penalty:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleKeypadPress('31')}
                className="p-2.5 bg-card hover:bg-emerald-500/20 border border-border hover:border-emerald-500/50 rounded-xl text-left font-bold transition flex flex-col justify-between group active:scale-95"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-foreground text-xs block group-hover:text-emerald-400">+1 Qtl Stock</span>
                  <span className="font-mono text-emerald-400 text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                    Key 31
                  </span>
                </div>
                <span className="text-[10px] text-muted-fg mt-1">Add 2 bags</span>
              </button>

              <button
                onClick={() => handleKeypadPress('32')}
                className="p-2.5 bg-card hover:bg-amber-500/20 border border-border hover:border-amber-500/50 rounded-xl text-left font-bold transition flex flex-col justify-between group active:scale-95"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-foreground text-xs block group-hover:text-amber-400">-1 Qtl Stock</span>
                  <span className="font-mono text-amber-400 text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                    Key 32
                  </span>
                </div>
                <span className="text-[10px] text-muted-fg mt-1">Reduce 2 bags</span>
              </button>

              <button
                onClick={() => handleKeypadPress('33')}
                className="p-2.5 bg-card hover:bg-rose-500/20 border border-border hover:border-rose-500/50 rounded-xl text-left font-bold transition flex flex-col justify-between group active:scale-95"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-foreground text-xs block group-hover:text-rose-400">Cancel Lot</span>
                  <span className="font-mono text-rose-400 text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                    Key 33
                  </span>
                </div>
                <span className="text-[10px] text-muted-fg mt-1">₹0 Zero penalty</span>
              </button>
            </div>
          </div>
        )}

        {/* Key 4 Smart Tubewell Advisory Panel */}
        {callActive && tubewellData && (
          <div className="p-4 bg-sky-500/10 border border-sky-500/40 rounded-2xl space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-bold">
                <Droplets className="w-4 h-4" />
                <span>IVR Key 4: Smart Tubewell & Irrigation Advisor</span>
              </div>
              <span className="font-mono text-sky-400 font-bold text-xs bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30">
                {tubewellData.hours_recommended > 0 ? `${tubewellData.hours_recommended} hrs today` : '0.0 hrs (Rain Alert)'}
              </span>
            </div>

            <div className="space-y-1.5">
              <p className="text-foreground font-bold text-xs">
                {tubewellData.headline_hi}
              </p>
              <p className="text-muted-fg text-[11px] leading-relaxed">
                {tubewellData.reason_hi}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60 text-[10px]">
              <div className="flex items-center gap-1.5 text-muted-fg">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Roster: {tubewellData.power_roster?.active_slot || '06:00 - 12:00 (Day)'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-fg text-right justify-end">
                <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>Rain: {tubewellData.weather_forecast?.rain_probability_pct || 0}% (~{tubewellData.weather_forecast?.rainfall_expected_mm || 0}mm)</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stage Key 2 Demo Button */}
        {callActive && !poolJoined && !registrationMode && !stockSubmenuMode && (
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
            { 
              num: '1', 
              sub: registrationMode ? 'Bhalaut' : 
                   activeSubmenu === 'MANDI' ? 'सरसों (11)' : 
                   activeSubmenu === 'CROP' ? 'सरसों (21)' : 
                   activeSubmenu === 'BAG' ? '5 बोरी (1)' : 
                   activeSubmenu === 'TUBEWELL' ? 'गेहूँ (41)' : 
                   stockSubmenuMode ? '+1 Qtl (31)' : 'Mandi Rates' 
            },
            { 
              num: '2', 
              sub: registrationMode ? 'Kalanaur' : 
                   activeSubmenu === 'MANDI' ? 'गेहूँ (12)' : 
                   activeSubmenu === 'CROP' ? 'गेहूँ (22)' : 
                   activeSubmenu === 'BAG' ? '10 बोरी (2)' : 
                   activeSubmenu === 'TUBEWELL' ? 'सरसों (42)' : 
                   stockSubmenuMode ? '-1 Qtl (32)' : 'Pool Truck ⚡' 
            },
            { 
              num: '3', 
              sub: registrationMode ? 'Najafgarh' : 
                   activeSubmenu === 'MANDI' ? 'आलू (13)' : 
                   activeSubmenu === 'CROP' ? 'धान (23)' : 
                   activeSubmenu === 'BAG' ? '20 बोरी (3)' : 
                   activeSubmenu === 'TUBEWELL' ? 'आलू (43)' : 
                   stockSubmenuMode ? 'Delete (33)' : 'My Stock' 
            },
            { 
              num: '4', 
              sub: registrationMode ? 'Madina' : 
                   activeSubmenu === 'MANDI' ? 'धान (14)' : 
                   activeSubmenu === 'CROP' ? 'आलू (24)' : 
                   activeSubmenu === 'BAG' ? '30 बोरी (4)' : 
                   activeSubmenu === 'TUBEWELL' ? 'धान (44)' : 
                   'Tubewell ⚡' 
            },
            { 
              num: '5', 
              sub: activeSubmenu === 'MANDI' ? 'चना (15)' : 
                   activeSubmenu === 'CROP' ? 'चना (25)' : 
                   activeSubmenu === 'TUBEWELL' ? 'चना (45)' : 
                   'Bolero Status' 
            },
            { num: '6', sub: 'KhetPin' },
            { num: '7', sub: 'Payments' },
            { num: '8', sub: 'Helpline' },
            { num: '9', sub: 'Language' },
            { num: '*', sub: 'Main Menu' },
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
