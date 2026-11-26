import React from 'react'
import { cn } from '@/lib/utils'

export type DivaPose =
  | 'hero_presenting'
  | 'pointing'
  | 'presenting'
  | 'thinking'
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
  hero_presenting: '/assets/mascot/hero_presenting.png',
  pointing: '/assets/mascot/pointing.png',
  presenting: '/assets/mascot/presenting.png',
  thinking: '/assets/mascot/thinking.png',
  running: '/assets/mascot/running.png',
  explore: '/assets/mascot/explore.png',
  cheering: '/assets/mascot/cheering.png',
  happy: '/assets/mascot/happy.png',
  excited: '/assets/mascot/excited.png',
  curious: '/assets/mascot/curious.png',
  surprised: '/assets/mascot/surprised.png',
  confused: '/assets/mascot/confused.png',
  worried: '/assets/mascot/worried.png',
  sad: '/assets/mascot/sad.png',
  angry: '/assets/mascot/angry.png',
  determined: '/assets/mascot/determined.png',
  sleepy: '/assets/mascot/sleepy.png',
  laughing: '/assets/mascot/laughing.png',
  wink: '/assets/mascot/wink.png',
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
