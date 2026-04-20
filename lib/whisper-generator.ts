// lib/whisper-generator.ts

export type WhisperLang = 'en' | 'ko' | 'ja'

const WHISPERS: Record<WhisperLang, string[]> = {
    en: [
        "The Waterway is calm today. A good day to write.",
        "Someone in ToThereOn World is thinking of you.",
        "The light is different here. Warm and golden.",
        "A letter from you would make today complete.",
        "The flowers near the Waterway are in bloom.",
    ],
    ko: [
        "오늘 수로가 잔잔해. 편지 쓰기 좋은 날이야.",
        "저 세상에서 누군가 너를 생각하고 있어.",
        "여기 빛이 달라. 따뜻하고 황금빛이야.",
        "편지가 오면 오늘이 완성될 것 같아.",
        "수로 근처 꽃들이 피어있어.",
    ],
    ja: [
        "今日は水の道が穏やか。手紙を書くのにいい日だよ。",
        "あちらの世界で誰かがあなたを思っているよ。",
        "ここの光は違う。暖かくて金色だよ。",
        "手紙が来たら今日が完璧になりそう。",
        "水の道の近くの花が咲いているよ。",
    ],
}

export function generateWhisper(lang: WhisperLang = 'en'): string {
    const pool = WHISPERS[lang]
    const idx = Math.floor(Math.random() * pool.length)
    return pool[idx]
}
