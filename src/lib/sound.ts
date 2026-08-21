/**
 * Sons curtos sintetizados via Web Audio API — sem baixar nenhum arquivo
 * de áudio. O AudioContext só é criado no primeiro gesto do usuário
 * (regra de autoplay dos navegadores).
 */

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(value: boolean) {
  enabled = value
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq: number, startOffset: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const audio = getContext()
  if (!audio) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  const start = audio.currentTime + startOffset
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

/** Clique leve ao navegar entre abas. */
export function playTap() {
  if (!enabled) return
  tone(520, 0, 0.06, 0.05)
}

/** Confirmação ao registrar páginas lidas. */
export function playChime() {
  if (!enabled) return
  tone(660, 0, 0.12, 0.08)
  tone(880, 0.08, 0.18, 0.07)
}

/** Comemoração para badge/level-up/livro concluído. */
export function playSuccess() {
  if (!enabled) return
  tone(523.25, 0, 0.15, 0.08) // C5
  tone(659.25, 0.1, 0.15, 0.08) // E5
  tone(783.99, 0.2, 0.3, 0.09) // G5
}
