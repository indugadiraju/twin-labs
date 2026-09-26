const tracked = ['fatigue', 'nausea', 'pain', 'anxiety', 'sleep_quality', 'overall_wellbeing']
const title = (name) => name === 'sleep_quality' ? 'Sleep quality' : name === 'overall_wellbeing' ? 'Wellbeing' : name[0].toUpperCase() + name.slice(1)

export function getResearchFacts(timeline, twin) {
  const reports = (timeline?.weeks || []).filter((week) => week.checkin).map((week) => ({ week: week.week, ...week.checkin }))
  const first = reports[0]
  const latest = reports.at(-1)
  const changes = first && latest && first.week !== latest.week
    ? tracked.filter((key) => first[key] != null && latest[key] != null && first[key] !== latest[key]).map((key) => ({ name: title(key), key, from: first[key], to: latest[key] }))
    : []
  const worsening = changes.filter((item) => item.key === 'sleep_quality' || item.key === 'overall_wellbeing' ? item.to < item.from : item.to > item.from)
  return { reports, first, latest, changes, worsening, status: twin?.status || 'stable' }
}

export function answerResearchQuestion(question, timeline, twin) {
  const q = question.toLowerCase()
  const facts = getResearchFacts(timeline, twin)
  const prefix = 'Demo-derived insight from simulated check-ins. '
  if (/treatment|medication|dose|diagnos|recommend/.test(q)) return { text: 'I only summarize the structured demo data. Treatment and clinical decisions belong with the study team.', source: 'Scope limit · no treatment recommendations' }
  if (!facts.latest) return { text: 'No simulated check-in has been submitted yet. There is no longitudinal patient report to summarize.', source: 'Structured demo data · no reports' }
  if (/signal|alert|review|concern/.test(q)) {
    const concern = facts.worsening.length ? facts.worsening.map((item) => `${item.name} ${item.from} → ${item.to}`).join(', ') : 'no recorded worsening between the first and latest reports'
    return { text: `${prefix}Current twin status is ${facts.status.replace('_', ' ')}. The structured reports show ${concern}. A researcher should review source reports before acting.`, source: 'Twin status and simulated reports · no alert model' }
  }
  if (/symptom|worsen/.test(q)) {
    if (facts.reports.length < 2) return { text: `${prefix}A second weekly report is needed before symptom changes can be compared.`, source: 'Simulated patient check-ins' }
    const symptoms = facts.worsening.filter((item) => !['sleep_quality', 'overall_wellbeing'].includes(item.key))
    return { text: `${prefix}${symptoms.length ? symptoms.map((item) => `${item.name} rose from ${item.from}/10 to ${item.to}/10`).join('; ') : 'No tracked symptom increased between the first and latest submitted reports.'}`, source: 'Simulated patient check-ins' }
  }
  if (/biggest|longitudinal|change|trend|summari|since/.test(q)) {
    if (!facts.changes.length) return { text: `${prefix}Only Week ${facts.latest.week} has a report, or the tracked values have not changed. A second report is needed for a comparison.`, source: 'Simulated patient check-ins' }
    const sorted = [...facts.changes].sort((a,b) => Math.abs(b.to-b.from)-Math.abs(a.to-a.from))
    return { text: `${prefix}From Week ${facts.first.week} to Week ${facts.latest.week}, the largest recorded changes are ${sorted.slice(0,4).map((item) => `${item.name} ${item.from} → ${item.to}`).join(', ')}.`, source: 'Simulated patient check-ins' }
  }
  return { text: `${prefix}There are ${facts.reports.length} submitted weekly reports. The latest is Week ${facts.latest.week}, with wellbeing ${facts.latest.overall_wellbeing}/10 and twin status ${facts.status.replace('_',' ')}. Ask about changes, symptoms, or review signals for more detail.`, source: 'Structured demo data' }
}
