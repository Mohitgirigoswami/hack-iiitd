import React from 'react';

export default function KhetOSLogo({ size = 36, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="khetosBg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a0d12" />
          <stop offset="1" stopColor="#131c26" />
        </linearGradient>

        <linearGradient id="khetosEmerald" x1="20" y1="100" x2="100" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#059669" />
          <stop offset="0.5" stopColor="#10b981" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>

        <linearGradient id="khetosGold" x1="30" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d97706" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>

        <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Rounded squircle chassis */}
      <rect x="2" y="2" width="116" height="116" rx="28" fill="url(#khetosBg)" stroke="#1e293b" strokeWidth="2.5" />
      <rect x="5" y="5" width="110" height="110" rx="25" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.25" />

      {/* Curved Corridor Highway (Pucca Road) */}
      <path
        d="M24 96 C42 94 48 68 62 58 C76 48 88 52 98 26"
        stroke="url(#khetosEmerald)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        filter="url(#emeraldGlow)"
      />

      {/* Highway Centerline Dashes */}
      <path
        d="M26 95 C43 93 49 68 62 58 C75 48 87 52 96 28"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 6"
        fill="none"
        opacity="0.8"
      />

      {/* Golden Wheat Grains (खेत Harvest) */}
      {/* Grain 1 - Center Right */}
      <ellipse cx="68" cy="40" rx="7" ry="13" transform="rotate(35 68 40)" fill="url(#khetosGold)" />
      {/* Grain 2 - Center Left */}
      <ellipse cx="46" cy="48" rx="6" ry="12" transform="rotate(-35 46 48)" fill="url(#khetosGold)" />
      {/* Grain 3 - Top Right */}
      <ellipse cx="80" cy="28" rx="6" ry="11" transform="rotate(40 80 28)" fill="url(#khetosGold)" />
      {/* Grain 4 - Lower Center */}
      <ellipse cx="54" cy="66" rx="6" ry="11" transform="rotate(-25 54 66)" fill="url(#khetosGold)" />

      {/* Devanagari 'ख' Central Accent Node */}
      <circle cx="62" cy="58" r="4.5" fill="#ffffff" />
      <circle cx="62" cy="58" r="8" stroke="#10b981" strokeWidth="2" fill="none" opacity="0.6" />
    </svg>
  );
}
