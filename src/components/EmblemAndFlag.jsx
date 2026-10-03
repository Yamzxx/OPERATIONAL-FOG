import React from 'react';

/**
 * Authentic Indian National Emblem (Ashoka Lion Capital) SVG
 */
export const NationalEmblem = ({ height = 64, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 160 220" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`gov-emblem-svg ${className}`}
    aria-label="National Emblem of India"
  >
    {/* Upper Lion Crowns & Mane Silhouette */}
    <g fill="#946E13">
      {/* Central Lion Head */}
      <path d="M80 12 C72 12, 64 20, 64 32 C64 42, 70 50, 80 54 C90 50, 96 42, 96 32 C96 20, 88 12, 80 12 Z" />
      {/* Crown mane features */}
      <circle cx="80" cy="22" r="6" fill="#C59B27" />
      <path d="M72 32 H88 V42 H72 Z" fill="#C59B27" />

      {/* Left Lion Head */}
      <path d="M48 24 C42 24, 34 30, 34 42 C34 50, 40 58, 48 62 C54 58, 60 50, 60 42 C60 30, 54 24, 48 24 Z" />
      <circle cx="48" cy="32" r="5" fill="#C59B27" />

      {/* Right Lion Head */}
      <path d="M112 24 C106 24, 100 30, 100 42 C100 50, 106 58, 112 62 C120 58, 126 50, 126 42 C126 30, 118 24, 112 24 Z" />
      <circle cx="112" cy="32" r="5" fill="#C59B27" />

      {/* Back Mane & Chest Mass */}
      <path d="M36 60 C30 72, 30 95, 45 110 C58 122, 102 122, 115 110 C130 95, 130 72, 124 60 C110 75, 50 75, 36 60 Z" fill="#B38519" />
      <path d="M60 70 C70 65, 90 65, 100 70 C105 85, 105 105, 80 115 C55 105, 55 85, 60 70 Z" fill="#805B0A" />

      {/* Abacus Platform Base */}
      <rect x="25" y="118" width="110" height="14" rx="2" fill="#946E13" />
      <rect x="28" y="121" width="104" height="8" fill="#C59B27" />

      {/* Central Ashoka Chakra on Abacus */}
      <circle cx="80" cy="125" r="5" fill="#0F2C59" stroke="#FFF" strokeWidth="1" />
      <circle cx="80" cy="125" r="1.5" fill="#FFF" />
      
      {/* Bull and Horse Relics on flanks */}
      <path d="M42 122 Q46 125 42 128" stroke="#0F2C59" strokeWidth="1.5" />
      <path d="M118 122 Q114 125 118 128" stroke="#0F2C59" strokeWidth="1.5" />

      {/* Inverted Bell Lotus Base */}
      <path d="M35 132 C45 150, 60 158, 80 158 C100 158, 115 150, 125 132 Z" fill="#755207" />
      <path d="M42 134 C50 148, 62 154, 80 154 C98 154, 110 148, 118 134 Z" fill="#C59B27" />

      {/* Plinth Base */}
      <rect x="20" y="158" width="120" height="10" fill="#946E13" />
      <rect x="15" y="168" width="130" height="6" fill="#755207" />
    </g>

    {/* Devanagari Inscription: सत्यमेव जयते (Satyameva Jayate) */}
    <text 
      x="80" 
      y="196" 
      textAnchor="middle" 
      fill="#8B261D" 
      fontSize="16" 
      fontWeight="bold" 
      fontFamily="'Noto Sans', 'Merriweather', serif"
      letterSpacing="1"
    >
      सत्यमेव जयते
    </text>
    <text 
      x="80" 
      y="212" 
      textAnchor="middle" 
      fill="#555" 
      fontSize="8" 
      fontWeight="700" 
      fontFamily="sans-serif"
      letterSpacing="0.5"
    >
      SATYAMEVA JAYATE
    </text>
  </svg>
);

/**
 * Authentic Indian National Flag (Tiranga) SVG
 */
export const IndianFlag = ({ width = 28, height = 18, className = "" }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 300 200" 
    className={className}
    style={{ border: '1px solid rgba(0,0,0,0.15)', borderRadius: '1px' }}
    aria-label="Indian National Flag"
  >
    {/* Saffron Top Band */}
    <rect width="300" height="66.6" fill="#FF9933" />
    {/* White Middle Band */}
    <rect y="66.6" width="300" height="66.6" fill="#FFFFFF" />
    {/* Green Bottom Band */}
    <rect y="133.3" width="300" height="66.6" fill="#128807" />
    {/* 24-Spoke Ashoka Chakra */}
    <g transform="translate(150, 100)">
      <circle r="24" fill="none" stroke="#000080" strokeWidth="3.5" />
      <circle r="4" fill="#000080" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          y1="0"
          x2="0"
          y2="-24"
          stroke="#000080"
          strokeWidth="1.8"
          transform={`rotate(${i * 15})`}
        />
      ))}
    </g>
  </svg>
);
