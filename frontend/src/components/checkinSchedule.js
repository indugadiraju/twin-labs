// Participant check-in (observation) schedule for the What-If Studio.
//
// Cadence describes HOW OFTEN WE OBSERVE the participant. It never changes the
// simulated clinical trajectory. Shaped like a small protocol object so later
// work can add study durations, visit schedules, required questionnaires and
// triggered/adaptive check-ins without changing the callers.

export const CADENCES = [
  { id: 'daily', label: 'Daily', pattern: { weekdayOffsets: [0, 1, 2, 3, 4, 5, 6] } },
  { id: 'twice_weekly', label: '2× per week', pattern: { weekdayOffsets: [0, 3] } },
  { id: 'weekly', label: 'Weekly', pattern: { weekdayOffsets: [0] } },
  { id: 'biweekly', label: 'Every 2 weeks', pattern: { everyDays: 14 } },
  { id: 'monthly', label: 'Monthly', pattern: { everyDays: 28 }, note: 'Every 4 weeks in this demo' },
]

// The app's existing Week 1–4 visit schedule implies a weekly check-in.
export const DEFAULT_PROTOCOL = { durationDays: 28, cadence: 'weekly' }

// Fields the existing check-in form collects — what a scheduled check-in is expected to provide.
export const COLLECTED_FIELDS = ['Overall wellbeing', 'Fatigue', 'Nausea', 'Pain', 'Anxiety', 'Sleep quality', 'Mood', 'New symptoms']

export function scheduleDays({ cadence, durationDays }) {
  const { pattern } = CADENCES.find((c) => c.id === cadence) || CADENCES[2]
  const days = []
  if (pattern.weekdayOffsets) {
    for (let week = 0; week * 7 <= durationDays; week++) {
      pattern.weekdayOffsets.forEach((offset) => { if (week * 7 + offset <= durationDays) days.push(week * 7 + offset) })
    }
  } else {
    for (let day = 0; day <= durationDays; day += pattern.everyDays) days.push(day)
  }
  return days
}

// Observation density only — how often data arrives, not prediction quality.
export function observationDensity(count, durationDays) {
  const perWeek = count / (durationDays / 7)
  return perWeek >= 2 ? 'High' : perWeek >= 1 ? 'Medium' : 'Low'
}

// Demo assumption (documented in the UI): "Today" is the participant's current
// study week, so a check-in recorded for study week N sits (N − current week)
// weeks from Today. Only check-ins that actually exist are returned.
export function completedCheckins(timeline, currentWeek) {
  return (timeline?.weeks || [])
    .filter((w) => w.checkin && w.week <= currentWeek)
    .map((w) => ({ day: (w.week - currentWeek) * 7, studyWeek: w.week, checkin: w.checkin }))
}
