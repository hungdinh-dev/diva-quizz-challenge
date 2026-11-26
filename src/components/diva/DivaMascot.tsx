import React from 'react'
import { cn } from '@/lib/utils'

export type DivaPose =
  | 'presenting'
  | 'pointing'
  | 'thinking'
  | 'explore'
  | 'wink'
  | 'curious'
  | 'happy'
  | 'excited'
  | 'confused'
  | 'cheering'
  | 'determined'

interface DivaMascotProps {
  pose?: DivaPose | string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const DivaMascot: React.FC<DivaMascotProps> = ({
  pose = 'presenting',
  className,
  size = 'md',
}) => {
  const sizeClass =
    size === 'sm' ? 'w-20 h-20' : size === 'lg' ? 'w-44 h-44 sm:w-52 sm:h-52' : 'w-28 h-28 sm:w-32 sm:h-32'

  const isWink = pose === 'wink' || pose === 'cheering' || pose === 'excited' || pose === 'happy'
  const isThinking = pose === 'thinking' || pose === 'confused' || pose === 'curious'
  const isExplore = pose === 'explore'

  return (
    <div className={cn('relative inline-flex items-center justify-center select-none', sizeClass, className)}>
      <svg viewBox="0 0 220 220" className="w-full h-full drop-shadow-md" aria-label={`DiVA Mascot (${pose})`}>
        {/* Rainbow Curled Tail */}
        <path
          d="M 65 152 C 25 152, 18 110, 48 102 C 68 97, 74 122, 56 128 C 46 131, 44 118, 52 115"
          fill="none"
          stroke="#212121"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 65 152 C 25 152, 18 110, 48 102 C 68 97, 74 122, 56 128 C 46 131, 44 118, 52 115"
          fill="none"
          stroke="url(#divaTailGrad)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="divaTailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8BC34A" />
            <stop offset="35%" stopColor="#42A5F5" />
            <stop offset="65%" stopColor="#AB47BC" />
            <stop offset="100%" stopColor="#FF6F91" />
          </linearGradient>
        </defs>

        {/* Back Spikes */}
        <circle cx="72" cy="118" r="6" fill="#42A5F5" stroke="#212121" strokeWidth="2.5" />
        <circle cx="68" cy="132" r="5.5" fill="#AB47BC" stroke="#212121" strokeWidth="2.5" />

        {/* Legs */}
        <path
          d="M 88 175 L 82 195 L 68 197 M 82 195 L 88 200"
          fill="none"
          stroke="#212121"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 88 175 L 82 195 L 68 197 M 82 195 L 88 200"
          fill="none"
          stroke="#8BC34A"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 132 175 L 138 195 L 152 197 M 138 195 L 132 200"
          fill="none"
          stroke="#212121"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 132 175 L 138 195 L 152 197 M 138 195 L 132 200"
          fill="none"
          stroke="#8BC34A"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Body */}
        <ellipse cx="110" cy="146" rx="34" ry="36" fill="#8BC34A" stroke="#212121" strokeWidth="4" />

        {/* Flower Belly Motif */}
        <circle cx="110" cy="146" r="18" fill="#FFD54F" stroke="#FF8A00" strokeWidth="2" />
        <circle cx="110" cy="134" r="6" fill="#FF8A00" />
        <circle cx="121" cy="142" r="6" fill="#FF8A00" />
        <circle cx="117" cy="155" r="6" fill="#FF8A00" />
        <circle cx="103" cy="155" r="6" fill="#FF8A00" />
        <circle cx="99" cy="142" r="6" fill="#FF8A00" />
        <circle cx="110" cy="146" r="6" fill="#FFEB3B" />

        {/* Arms + White Gloves */}
        {pose === 'pointing' || pose === 'presenting' ? (
          <>
            <path d="M 78 134 Q 62 142 66 156" fill="none" stroke="#8BC34A" strokeWidth="10" strokeLinecap="round" />
            <circle cx="67" cy="158" r="8" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
            <path d="M 142 132 L 176 112" fill="none" stroke="#212121" strokeWidth="12" strokeLinecap="round" />
            <path d="M 142 132 L 176 112" fill="none" stroke="#8BC34A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="180" cy="109" r="10" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
          </>
        ) : pose === 'cheering' || pose === 'excited' ? (
          <>
            <path d="M 78 130 L 52 104" fill="none" stroke="#212121" strokeWidth="12" strokeLinecap="round" />
            <path d="M 78 130 L 52 104" fill="none" stroke="#8BC34A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="50" cy="101" r="10" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
            <path d="M 142 130 L 168 104" fill="none" stroke="#212121" strokeWidth="12" strokeLinecap="round" />
            <path d="M 142 130 L 168 104" fill="none" stroke="#8BC34A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="170" cy="101" r="10" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
          </>
        ) : (
          <>
            <path d="M 78 134 Q 62 142 66 156" fill="none" stroke="#212121" strokeWidth="11" strokeLinecap="round" />
            <path d="M 78 134 Q 62 142 66 156" fill="none" stroke="#8BC34A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="67" cy="158" r="8" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
            <path d="M 142 134 Q 158 124 148 108" fill="none" stroke="#212121" strokeWidth="11" strokeLinecap="round" />
            <path d="M 142 134 Q 158 124 148 108" fill="none" stroke="#8BC34A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="147" cy="107" r="9" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
          </>
        )}

        {/* Head */}
        <ellipse cx="110" cy="84" rx="40" ry="34" fill="#8BC34A" stroke="#212121" strokeWidth="4" />

        {/* Cheek Orange Dots */}
        <circle cx="79" cy="92" r="4" fill="#FF8A00" />
        <circle cx="141" cy="92" r="4" fill="#FF8A00" />

        {/* Eyes */}
        {isExplore ? (
          <g>
            <circle cx="93" cy="78" r="14" fill="#455A64" stroke="#212121" strokeWidth="3.5" />
            <circle cx="93" cy="78" r="8" fill="#81D4FA" stroke="#212121" strokeWidth="2" />
            <circle cx="127" cy="78" r="14" fill="#455A64" stroke="#212121" strokeWidth="3.5" />
            <circle cx="127" cy="78" r="8" fill="#81D4FA" stroke="#212121" strokeWidth="2" />
            <rect x="105" y="75" width="10" height="6" fill="#212121" />
          </g>
        ) : (
          <g>
            {/* Left Eye */}
            <ellipse cx="94" cy="77" rx="12" ry="13" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
            <circle cx="96" cy="78" r="6" fill="#212121" />
            <circle cx="98" cy="75" r="2.2" fill="#FFFFFF" />
            {/* Right Eye */}
            {isWink ? (
              <path
                d="M 116 78 Q 126 68 136 78"
                fill="none"
                stroke="#212121"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ) : (
              <>
                <ellipse cx="126" cy="77" rx="12" ry="13" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
                <circle cx="124" cy="78" r="6" fill="#212121" />
                <circle cx="126" cy="75" r="2.2" fill="#FFFFFF" />
              </>
            )}
          </g>
        )}

        {/* Mouth */}
        {isThinking ? (
          <path d="M 102 102 Q 112 98 118 103" fill="none" stroke="#212121" strokeWidth="3.5" strokeLinecap="round" />
        ) : (
          <>
            <path
              d="M 94 96 Q 110 112 126 96 Z"
              fill="#B71C1C"
              stroke="#212121"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M 103 103 Q 110 109 117 103" fill="#FF6F91" />
          </>
        )}

        {/* Vietnam-style Red Conical Hat with Yellow Star */}
        <path
          d="M 52 58 L 110 16 L 168 58 Q 110 68 52 58 Z"
          fill="#E53935"
          stroke="#212121"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M 82 40 L 110 16 L 138 40" fill="none" stroke="#B71C1C" strokeWidth="2" opacity="0.45" />
        {/* Yellow Star */}
        <polygon
          points="110,26 114,37 125,37 116,44 119,54 110,48 101,54 104,44 95,37 106,37"
          fill="#FFEB3B"
          stroke="#212121"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Context Badges (? / ! / Sparks) */}
        {isThinking && (
          <g transform="translate(166, 22)">
            <circle cx="16" cy="16" r="15" fill="#FFFFFF" stroke="#212121" strokeWidth="3" />
            <text x="16" y="22" textAnchor="middle" fontSize="20" fontWeight="900" fill="#FF8A00">
              ?
            </text>
          </g>
        )}
        {(pose === 'excited' || pose === 'cheering') && (
          <g stroke="#FFEB3B" strokeWidth="4" strokeLinecap="round">
            <line x1="34" y1="54" x2="22" y2="42" />
            <line x1="186" y1="54" x2="198" y2="42" />
            <line x1="188" y1="74" x2="204" y2="72" />
          </g>
        )}
      </svg>
    </div>
  )
}
