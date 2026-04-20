// lib/utils/sentence-parser.ts
export type SentenceLang = 'en' | 'ko' | 'ja'

/**
 * 다국어 텍스트에서 마지막 문장을 추출합니다.
 * 마지막 문장은 "END WITH A HOOK" 규칙에 따른 인과관계 연결고리입니다.
 */
export function extractLastSentence(text: string, lang: SentenceLang): string {
  if (!text || text.trim().length === 0) return ''

  // 언어별 문장 구분자
  const delimiter = /[.。!！?？]+\s*/g
  const sentences = text
    .split(delimiter)
    .map(s => s.trim())
    .filter(s => s.length > 2)

  if (sentences.length === 0) return text.slice(0, 80)

  const last = sentences[sentences.length - 1]
  return last || text.slice(0, 80)
}
