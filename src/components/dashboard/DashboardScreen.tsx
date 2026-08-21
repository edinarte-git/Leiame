import { useEffect, useMemo } from 'react'
import { Flame, Trophy, Lock, Brain, PenLine, Mic, GraduationCap, Sparkles, type LucideIcon } from 'lucide-react'
import { useLogsStore } from '../../store/logsStore'
import { useAuthStore } from '../../store/authStore'
import { useStats } from '../../hooks/useStats'
import { buildDailyTotals } from '../../logic/streak'
import { calculateSkillProgress } from '../../logic/skills'
import { Heatmap } from '../ui/Heatmap'
import { BADGES } from '../../lib/badges'

const SKILL_ICONS: Record<string, LucideIcon> = { Brain, PenLine, Mic, GraduationCap, Sparkles }

export function DashboardScreen() {
  const session = useAuthStore((s) => s.session)
  const { stats, badges, error: statsError } = useStats()
  const logs = useLogsStore((s) => s.logs)
  const fetchLogs = useLogsStore((s) => s.fetchLogs)
  const logsError = useLogsStore((s) => s.error)

  useEffect(() => {
    if (session) fetchLogs(session.user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id])

  const dailyTotals = useMemo(() => buildDailyTotals(logs), [logs])
  const earnedCodes = useMemo(() => new Set(badges.map((b) => b.badge_code)), [badges])
  const skillProgress = useMemo(
    () => calculateSkillProgress(stats?.total_pages_read ?? 0),
    [stats?.total_pages_read],
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
      <h2 className="font-display mb-4 text-xl font-semibold text-text">Suas conquistas</h2>

      {(statsError || logsError) && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          Não foi possível carregar seus dados: {statsError || logsError}
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className={`card p-4 text-center ${(stats?.current_streak ?? 0) > 0 ? 'ember' : ''}`}>
          <Flame className="mx-auto mb-1 text-warning" size={22} />
          <p className="font-display text-2xl font-semibold text-text">{stats?.current_streak ?? 0}</p>
          <p className="text-xs text-text-muted">dias seguidos lendo</p>
        </div>
        <div className="card p-4 text-center">
          <Trophy className="mx-auto mb-1 text-accent" size={22} />
          <p className="font-display text-2xl font-semibold text-text">{stats?.longest_streak ?? 0}</p>
          <p className="text-xs text-text-muted">seu recorde</p>
        </div>
      </div>

      <div className="mb-5 card p-4">
        <p className="mb-2 text-sm font-medium text-text">Últimos 90 dias</p>
        <Heatmap dailyTotals={dailyTotals} />
      </div>

      <div className="mb-5 card p-4">
        <p className="mb-3 text-sm font-medium text-text">Habilidades que você está desenvolvendo</p>
        <ul className="flex flex-col gap-3">
          {skillProgress.map((skill, index) => {
            const Icon = SKILL_ICONS[skill.icon] ?? Sparkles
            return (
              <li
                key={skill.code}
                className="animate-rise flex items-center gap-3"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-text">{skill.name}</span>
                    <span className="text-text-muted">nível {skill.level}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
                      style={{ width: `${skill.percentIntoLevel}%` }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mb-3 text-sm font-medium text-text">Todas as conquistas</p>
      <ul className="grid grid-cols-2 gap-3">
        {BADGES.map((badge, index) => {
          const earned = earnedCodes.has(badge.code)
          return (
            <li
              key={badge.code}
              className={`animate-rise flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-shadow ${
                earned
                  ? 'border-accent/60 bg-gradient-to-b from-accent/15 to-transparent shadow-md shadow-accent/10'
                  : 'border-border bg-surface opacity-60'
              }`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {earned ? <Trophy className="text-accent" size={20} /> : <Lock className="text-text-muted" size={20} />}
              <p className="text-xs font-medium text-text">{badge.name}</p>
              <p className="text-[11px] text-text-muted">{badge.description}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
