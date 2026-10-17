import React from 'react';
import { 
  TrendingUp, Shield, Truck, Scale, Phone, CheckCircle, 
  MapPin, Sparkles, Building2, Flame
} from 'lucide-react';

/**
 * TickerMarquee - Double horizontal running ticker marquees with gradient fade masks:
 * - Marquee 1: Real-time APMC Mandi Spot Prices (Azadpur, Lawrence Road, Alwar, Jaipur, etc.)
 * - Marquee 2: KhetOS Core Logistics & Escrow Trust Guarantees
 * - Left/Right gradient fade masks for smooth edge vanishing
 * - 60fps GPU compositor animations with pause-on-hover
 */
export default function TickerMarquee() {
  const mandiRates = [
    { mandi: 'Azadpur APMC (Delhi)', price: '₹5,420', change: '+2.4%', high: true },
    { mandi: 'Lawrence Road (Delhi)', price: '₹5,460', change: '+1.8%', high: true },
    { mandi: 'Alwar Mandi (Rajasthan)', price: '₹5,380', change: '+0.9%', high: false },
    { mandi: 'Jaipur APMC (Rajasthan)', price: '₹5,410', change: '+1.2%', high: true },
    { mandi: 'Hapur APMC (UP)', price: '₹5,395', change: '+0.5%', high: false },
    { mandi: 'Bhiwani Sub-Yard (Haryana)', price: '₹5,405', change: '+1.1%', high: true },
    { mandi: 'Najafgarh APMC (Delhi)', price: '₹5,430', change: '+2.0%', high: true },
    { mandi: 'Rohtak Anaj Mandi (Haryana)', price: '₹5,390', change: '+1.4%', high: false },
  ];

  const logisticsGuarantees = [
    { icon: Truck, title: '1.5T Bolero Pooling', desc: 'Auto-clustering into 30-bag flatbed payloads' },
    { icon: Shield, title: '20% Advance Escrow', desc: 'Locked before truck ignition via Razorpay' },
    { icon: Scale, title: '50kg Discrete Knapsack', desc: 'Standard bag accounting with zero fragmentation' },
    { icon: Sparkles, title: '₹0 Farmer Fee', desc: '100% free for smallholders, 0 commission' },
    { icon: MapPin, title: 'PMGSY Dirt-Road Snapping', desc: 'High-precision village GPS waypoint snapping' },
    { icon: Phone, title: '1800-KHET-OS Toll-Free IVR', desc: 'Operable on ₹1,200 feature phones' },
    { icon: CheckCircle, title: '0% Khali Phera Guarantee', desc: 'Pre-matched backhaul loads for transporters' },
    { icon: Building2, title: 'ICAR Grade-A Passports', desc: 'Tamper-evident optical quality certificates' },
  ];

  return (
    <div className="w-full my-6 space-y-3 relative select-none">
      {/* Edge Gradient Fade Mask Container */}
      <div 
        className="relative overflow-hidden py-1"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        {/* Marquee 1: Mandi Spot Prices (Scrolls Left) */}
        <div className="animate-marquee-left flex items-center gap-3">
          {/* Double array to create seamless loop */}
          {[...mandiRates, ...mandiRates].map((item, idx) => (
            <div 
              key={`mandi-${idx}`}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0d1224]/80 border border-white/[0.08] backdrop-blur-md shadow-xs hover:border-emerald-500/40 transition shrink-0"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">{item.mandi}</span>
              <span className="text-xs font-mono font-bold text-white whitespace-nowrap">{item.price}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee 2: Logistics Guarantees (Scrolls Right) */}
      <div 
        className="relative overflow-hidden py-1"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div className="animate-marquee-right flex items-center gap-3">
          {/* Double array to create seamless loop */}
          {[...logisticsGuarantees, ...logisticsGuarantees].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={`guarantee-${idx}`}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0d1224]/80 border border-white/[0.08] backdrop-blur-md shadow-xs hover:border-indigo-500/40 transition shrink-0"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-white whitespace-nowrap">{item.title}</span>
                <span className="text-[10px] text-slate-400 whitespace-nowrap hidden sm:inline">&bull; {item.desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
