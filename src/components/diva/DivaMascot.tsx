import React from 'react'
import { cn } from '@/lib/utils'

export type DivaPose =
  | 'hero_presenting'
  | 'pointing'
  | 'presenting'
  | 'thinking'
  | 'stage_think'
  | 'running'
  | 'explore'
  | 'cheering'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'surprised'
  | 'confused'
  | 'worried'
  | 'sad'
  | 'angry'
  | 'determined'
  | 'sleepy'
  | 'laughing'
  | 'wink'

const POSE_TO_FILE: Record<DivaPose, string> = {
  hero_presenting: '/assets/vision2035/welcome.webp',
  pointing: '/assets/vision2035/connect.webp',
  presenting: '/assets/vision2035/welcome.webp',
  thinking: '/assets/vision2035/thinking.webp',
  stage_think: '/assets/vision2035/think.webp',
  running: '/assets/vision2035/connect.webp',
  explore: '/assets/vision2035/look.webp',
  cheering: '/assets/vision2035/cheerful.webp',
  happy: '/assets/vision2035/cheerful.webp',
  excited: '/assets/vision2035/excited.webp',
  curious: '/assets/vision2035/look.webp',
  surprised: '/assets/vision2035/surprised.webp',
  confused: '/assets/vision2035/anxious.webp',
  worried: '/assets/vision2035/anxious.webp',
  sad: '/assets/vision2035/sad.webp',
  angry: '/assets/vision2035/anxious.webp',
  determined: '/assets/vision2035/think.webp',
  sleepy: '/assets/vision2035/sleepy.webp',
  laughing: '/assets/vision2035/cheerful.webp',
  wink: '/assets/vision2035/sneaky.webp',
}

interface DivaMascotProps {
  pose?: DivaPose | string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
}

export const DivaMascot: React.FC<DivaMascotProps> = ({
  pose = 'hero_presenting',
  className,
  size = 'md',
  animate = true,
}) => {
  const normalizedPose = (pose in POSE_TO_FILE ? pose : 'hero_presenting') as DivaPose
  const src = POSE_TO_FILE[normalizedPose]

  const sizeClass =
    size === 'sm'
      ? 'w-16 h-16'
      : size === 'lg'
        ? 'w-40 h-40 sm:w-48 sm:h-48'
        : size === 'xl'
          ? 'w-48 h-48 sm:w-56 sm:h-56'
          : 'w-28 h-28 sm:w-32 sm:h-32'

  const motionClass = !animate
    ? ''
    : normalizedPose === 'cheering' || normalizedPose === 'excited' || normalizedPose === 'laughing'
      ? 'animate-diva-cheer'
      : normalizedPose === 'running'
        ? 'animate-diva-run'
        : 'animate-diva-float'

  return (
    <div
      key={normalizedPose}
      className={cn(
        'relative inline-flex items-center justify-center select-none animate-diva-pop',
        sizeClass,
        className
      )}
    >
      <img
        src={src}
        alt={`DiVA Mascot (${normalizedPose})`}
        draggable={false}
        className={cn(
          'w-full h-full object-contain drop-shadow-[0_6px_8px_rgba(33,33,33,0.22)]',
          motionClass
        )}
      />
    </div>
  )
}
