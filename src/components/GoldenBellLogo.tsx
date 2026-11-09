import React from 'react';

interface GoldenBellLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
}

export const GoldenBellLogo: React.FC<GoldenBellLogoProps> = ({ size = 'md', animated = true }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeMap[size]}`}>
      {/* Glow aura */}
      <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-md animate-pulse pointer-events-none" />
      
      {/* SVG Golden Bell */}
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full drop-shadow-[0_4px_10px_rgba(217,119,6,0.6)] ${
          animated ? 'animate-[bellRing_3s_ease-in-out_infinite]' : ''
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bellGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF275" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="70%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="rimGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Top Ring / Handle */}
        <circle cx="50" cy="18" r="9" stroke="url(#bellGoldGrad)" strokeWidth="5" fill="none" />
        <rect x="46" y="24" width="8" height="6" rx="2" fill="#B45309" />

        {/* Bell Body */}
        <path
          d="M50 28 C35 28 30 42 27 60 C24 74 15 76 15 82 C15 85 18 87 23 87 L77 87 C82 87 85 85 85 82 C85 76 76 74 73 60 C70 42 65 28 50 28 Z"
          fill="url(#bellGoldGrad)"
          stroke="#78350F"
          strokeWidth="2.5"
        />

        {/* Metallic Highlights & Highlights curve */}
        <path
          d="M48 32 C38 34 35 48 33 62 C31 72 24 76 22 80"
          stroke="#FEF3C7"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M50 36 C55 36 60 48 61 62"
          stroke="#FEF3C7"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* Bell Rim */}
        <ellipse cx="50" cy="86" rx="35" ry="6" fill="url(#rimGoldGrad)" stroke="#78350F" strokeWidth="2.5" />

        {/* Clapper (quả lắc chuông) */}
        <ellipse cx="50" cy="91" rx="9" ry="6" fill="#F59E0B" stroke="#78350F" strokeWidth="2" />
        <ellipse cx="48" cy="89" rx="3" ry="1.5" fill="#FEF3C7" />

        {/* Sparkling stars */}
        <path
          d="M80 20 L82 25 L87 27 L82 29 L80 34 L78 29 L73 27 L78 25 Z"
          fill="#FFF"
          className="animate-ping"
          style={{ transformOrigin: '80px 27px', animationDuration: '2s' }}
        />
        <path
          d="M20 35 L21 38 L24 39 L21 40 L20 43 L19 40 L16 39 L19 38 Z"
          fill="#FEF08A"
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};
