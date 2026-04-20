export function calculateStreak(letters: { created_at: string }[]): number {
  if (letters.length === 0) return 0

  // 날짜별 그룹화 (YYYY-MM-DD), 중복 제거 후 내림차순 정렬
  const dates = [...new Set(letters.map(l => l.created_at.slice(0, 10)))]
    .sort()
    .reverse()

  let streak = 0
  let prev = new Date()
  prev.setHours(0, 0, 0, 0)

  for (const dateStr of dates) {
    const curr = new Date(dateStr)
    curr.setHours(0, 0, 0, 0)
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diffDays <= 1) {
      streak++
      prev = curr
    } else {
      break
    }
  }

  return streak
}
