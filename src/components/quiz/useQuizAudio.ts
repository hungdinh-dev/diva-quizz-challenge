import { useEffect, useRef, useState } from 'react'

const theme = [60, 64, 67, 64, 62, 65, 69, 65, 64, 67, 71, 67, 62, 65, 67, 59]
const beat = 0.34

function note(context: AudioContext, output: AudioNode, key: number, when: number, duration: number, level: number) {
  const oscillator = context.createOscillator()
  const envelope = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = 440 * 2 ** ((key - 69) / 12)
  oscillator.connect(envelope).connect(output)
  envelope.gain.setValueAtTime(0.0001, when)
  envelope.gain.exponentialRampToValueAtTime(level, when + 0.024)
  envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration)
  oscillator.start(when)
  oscillator.stop(when + duration)
}

export function useQuizAudio(playing: boolean) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('diva-audio') !== 'off')
  const audio = useRef<AudioContext | null>(null)
  const [ready, setReady] = useState(false)

  const activate = () => {
    try {
      audio.current ??= new AudioContext()
      if (audio.current.state === 'running') setReady(true)
      else void audio.current.resume().then(() => setReady(true)).catch(() => {})
      return audio.current
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!enabled) return
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('button:not(:disabled), a, select')) return
      const context = activate()
      if (context) note(context, context.destination, 82, context.currentTime + 0.015, 0.08, 0.07)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [enabled])

  useEffect(() => {
    const context = audio.current
    if (!enabled || !playing || !ready || !context) return
    const output = context.createGain()
    output.gain.value = 0.42
    output.connect(context.destination)
    let next = context.currentTime + 0.06
    let index = 0
    const schedule = () => {
      if (document.hidden || context.state !== 'running') {
        next = context.currentTime + 0.06
        return
      }
      if (next < context.currentTime) next = context.currentTime + 0.06
      while (next < context.currentTime + 0.16) {
        const key = theme[index % theme.length]
        note(context, output, key, next, 0.28, 0.07)
        if (index % 4 === 0) note(context, output, key - 12, next, 0.95, 0.065)
        index++
        next += beat
      }
    }
    schedule()
    const timer = window.setInterval(schedule, 80)
    return () => {
      window.clearInterval(timer)
      output.gain.value = 0
      output.disconnect()
    }
  }, [enabled, playing, ready])

  useEffect(() => () => {
    const context = audio.current
    audio.current = null
    if (context && context.state !== 'closed') void context.close()
  }, [])

  return {
    enabled,
    toggle: () => {
      if (!enabled) activate()
      localStorage.setItem('diva-audio', enabled ? 'off' : 'on')
      setEnabled(!enabled)
    },
    feedback: (correct: boolean) => {
      if (!enabled) return
      const context = activate()
      if (!context) return
      const melody = correct ? [72, 76, 79] : [61, 56]
      melody.forEach((key, index) => note(context, context.destination, key, context.currentTime + 0.02 + index * 0.11, 0.22, 0.16))
    },
  }
}
