export type SupportedLang = 'en' | 'ko' | 'ja'

export const CONVERSATION_STARTERS: Record<SupportedLang, string[]> = {
  en: [
    "The weather today reminded me of you...",
    "I had a dream about you last night...",
    "I found something that made me think of you today...",
    "I wanted to tell you about something that happened...",
    "I miss the way you used to...",
  ],
  ko: [
    "오늘 날씨가 좋아서 네 생각이 났어.",
    "어젯밤 꿈에서 너를 봤어.",
    "네가 좋아하던 걸 보다가 문득 네가 보고 싶었어.",
    "오늘 있었던 일을 너한테 얘기하고 싶어서.",
    "요즘도 가끔 네 모습이 떠올라.",
  ],
  ja: [
    "今日の天気を見て、あなたのことを思い出したよ。",
    "昨夜、夢であなたに会ったよ。",
    "あなたが好きだったものを見て、会いたくなったよ。",
    "今日あったことをあなたに話したくて。",
    "最近もたまにあなたのことを思い出すよ。",
  ],
}

export function getStarters(lang: string): string[] {
  const key = (lang === 'ko' || lang === 'ja') ? lang as SupportedLang : 'en'
  return CONVERSATION_STARTERS[key]
}
