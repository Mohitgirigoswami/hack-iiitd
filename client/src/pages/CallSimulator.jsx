import React, { useState } from 'react';
import { Phone, PhoneOff, ArrowLeft, Volume2, CheckCircle2 } from 'lucide-react';

export default function CallSimulator({ onNavigate }) {
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('Idle');
  const [spokenText, setSpokenText] = useState('');
  const [poolJoined, setPoolJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const speakHindi = (text) => {
    setSpokenText(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartCall = () => {
    setCallActive(true);
    setCallStatus('Connected');
    speakHindi("KhetOS में आपका स्वागत है। मंडी भाव जानने के लिए 1 दबाएं। गाड़ी पूलिंग में जुड़ने के लिए 2 दबाएं।");
  };

  const handleEndCall = () => {
    setCallActive(false);
    setCallStatus('Call Ended');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleKeypadPress = async (digit) => {
    if (!callActive) {
      handleStartCall();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/call/keypad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digit: digit,
          farmer_name: 'Ramu Sharma',
          village: 'Najafgarh'
        })
      });
      const data = await res.json();
      setLoading(false);

      if (data.voice_prompt_hi) {
        speakHindi(data.voice_prompt_hi);
      }

      if (digit === '2') {
        setPoolJoined(true);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projector Dashboard
      </button>

      {/* Mobile Phone Mockup */}
      <div className="bg-card rounded-3xl p-6 border-2 border-border shadow-2xl relative overflow-hidden transition-colors">
        {/* Speaker Notch */}
        <div className="w-24 h-4 bg-secondary rounded-full mx-auto mb-4 flex items-center justify-center">
          <div className="w-10 h-1.5 bg-border rounded-full"></div>
        </div>

        {/* In-Call Header Display */}
        <div className="text-center py-4 bg-secondary/80 rounded-2xl border border-border/60 mb-5">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">
            {callActive ? '🟢 Live IVR Telephony Call' : 'Toll-Free Dialpad: 1800-KHET-OS'}
          </p>
          <h3 className="text-xl font-bold text-foreground mt-1">KhetOS Rural Telephony Gateway</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Caller ID: Ramu Sharma (+91 98123 45099)</p>

          {callActive && (
            <div className="mt-3 p-3 bg-card mx-3 rounded-lg border border-border text-xs text-foreground flex items-start gap-2 text-left shadow-sm">
              <Volume2 className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-semibold text-primary block">System Speaking (Hindi):</span>
                <p className="italic text-muted-foreground mt-0.5">{spokenText || "Audio streaming..."}</p>
              </div>
            </div>
          )}
        </div>

        {/* Success Banner if Key 2 pressed */}
        {poolJoined && (
          <div className="mb-4 p-3 bg-primary/20 border border-primary/40 rounded-xl text-xs text-primary flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="font-bold block">Bolero Pool 100% Full!</span>
              <span>Ramu's 4 quintals successfully loaded. Projector dashboard updated!</span>
            </div>
          </div>
        )}

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-5">
          {[
            { num: '1', sub: 'Mandi Price' },
            { num: '2', sub: 'Pool Truck' },
            { num: '3', sub: 'Crop Doctor' },
            { num: '4', sub: 'Weather' },
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
              disabled={loading}
              className={`h-16 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-95 ${
                key.num === '2' && callActive
                  ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30 animate-pulse font-bold'
                  : 'bg-secondary/70 hover:bg-secondary border-border text-foreground'
              }`}
            >
              <span className="text-xl font-bold leading-tight">{key.num}</span>
              <span className="text-[9px] text-muted-foreground font-medium leading-tight">{key.sub}</span>
            </button>
          ))}
        </div>

        {/* Call Action Bar */}
        <div className="flex justify-center gap-6 pt-2">
          {!callActive ? (
            <button
              onClick={handleStartCall}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-full shadow-glow transition-all active:scale-95"
            >
              <Phone className="w-5 h-5 fill-current" />
              Dial Call (कॉल करें)
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="flex items-center gap-2 px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-full shadow-lg transition-all active:scale-95"
            >
              <PhoneOff className="w-5 h-5" />
              End Call (काटें)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
