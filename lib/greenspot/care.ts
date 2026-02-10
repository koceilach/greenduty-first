type ClimateZone = "coastal" | "mediterranean" | "steppe" | "desert"

export type CareTask = {
  task_type: "watering" | "fertilizing" | "pruning" | "seasonal_care"
  due_at: string
  description: string
  tips: string
  status: "not_done" | "done"
}

export type CareScheduleInput = {
  plantName: string
  plantType: "Tree" | "Plant"
  latitude?: number | null
  longitude?: number | null
  startDate?: Date
}

export const detectClimate = (lat?: number | null): ClimateZone => {
  if (lat == null || Number.isNaN(lat)) return "mediterranean"
  if (lat < 28) return "desert"
  if (lat < 32) return "steppe"
  if (lat < 35.5) return "mediterranean"
  return "coastal"
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const seasonFromMonth = (month: number) => {
  if ([12, 1, 2].includes(month)) return "winter"
  if ([3, 4, 5].includes(month)) return "spring"
  if ([6, 7, 8].includes(month)) return "summer"
  return "autumn"
}

export const buildCareSchedule = ({
  plantName,
  plantType,
  latitude,
  startDate,
}: CareScheduleInput): CareTask[] => {
  const now = startDate ?? new Date()
  const climate = detectClimate(latitude)
  const season = seasonFromMonth(now.getMonth() + 1)

  const baseWatering = plantType === "Tree" ? 7 : 3
  const climateAdjust = climate === "desert" ? -1 : climate === "steppe" ? 0 : 1
  const seasonAdjust = season === "summer" ? -2 : season === "winter" ? 3 : 0
  const interval = Math.max(2, baseWatering + climateAdjust + seasonAdjust)

  const tasks: CareTask[] = []
  for (let i = 0; i < 6; i += 1) {
    const due = addDays(now, interval * i + 1)
    tasks.push({
      task_type: "watering",
      due_at: due.toISOString(),
      description: `Water ${plantName} gently to keep soil moist but not waterlogged.`,
      tips: `Check soil moisture depth (5-7cm). Climate: ${climate}, season: ${season}.`,
      status: "not_done",
    })
  }

  const fertilizeDate = addDays(now, 21)
  tasks.push({
    task_type: "fertilizing",
    due_at: fertilizeDate.toISOString(),
    description: `Apply a light organic feed to support healthy growth.`,
    tips: "Use compost or slow-release fertilizer. Avoid over-fertilizing.",
    status: "not_done",
  })

  const pruningMonth = ["winter", "early spring"].includes(season) ? 14 : 60
  tasks.push({
    task_type: "pruning",
    due_at: addDays(now, pruningMonth).toISOString(),
    description: `Remove dead or weak branches to encourage strong structure.`,
    tips: "Sanitize tools before pruning. Focus on shape and airflow.",
    status: "not_done",
  })

  tasks.push({
    task_type: "seasonal_care",
    due_at: addDays(now, 45).toISOString(),
    description: `Prepare ${plantName} for the next seasonal shift.`,
    tips: "Mulch to retain moisture and protect roots from temperature swings.",
    status: "not_done",
  })

  return tasks
}
