/**
 * Language Detector for ToThereOn
 * Detects the appropriate language for content generation based on user inputs.
 */

// ─── Language Instruction Builder ───────────────────────────────────────────

export interface LanguageInstruction {
    /** Top-of-prompt language declaration + style guide */
    header: string;
    /** FORMAT section rule (replaces "English ONLY") */
    formatRule: string;
    /** Language-specific forbidden words for prompt injection (empty string for English) */
    forbiddenWordsPrompt: string;
    /** English NPC name → localized name mapping */
    npcNames: Record<string, string>;
    /** English location name → localized name mapping */
    locationNames: Record<string, string>;
}

export function getLanguageInstruction(language: string): LanguageInstruction {
    switch (language) {
        case 'Korean':
            return {
                header: `LANGUAGE: Korean (한국어) — Write ONLY in Korean (한국어).
문체 지침: 따뜻하고 절제된 1인칭 일기체 (나는/내가/나). 과거형 (~했다, ~였다). 감정을 직접 서술하지 않는다.
행동과 몸짓으로만 표현한다. "~을 느꼈다", "마음이 ~했다" 같은 표현은 절대 금지.`,
                formatRule: '2~3개의 짧은 단락. 1인칭(나/내가), 과거형, 한국어로만 작성.',
                forbiddenWordsPrompt: `한국어 금지어 (절대 사용 금지): 행복한, 행복했, 슬픈, 즐거운, 감사한, 그리운, 외로운, 궁금했다, 그리워하며, 아련한, 아마도, 일지도, 마치 기억하듯, 편지 덕분에, 엄마 덕분에, 아빠 덕분에, ~을 느꼈다, 마음이, 가슴이, 울다, 흐느끼, 재미있게 놀았, 무지개다리
방위 금지: "동쪽/서쪽/남쪽/북쪽" 절대 사용 금지. 대신: "냄새가 강해지는 쪽으로", "빛이 더 따뜻한 방향으로", "바람이 불어오는 쪽으로"
시간 금지: "3시", "오후 2시" 같은 시계 시간 금지. 대신: "햇살이 낮게 깔릴 때", "이슬이 아직 마르지 않았을 때", "하늘이 붉어질 무렵"
요일 금지: "월요일", "화요일" 등 절대 사용 금지.`,
                npcNames: {
                    'Granny Shell': '느림보 할망',
                    'Pip': '달래',
                    'Professor Clover': '콩선생',
                    'Old Finn': '꼬리상인',
                    'Bun & Bun': '뭉실과 몽실',
                    'Digby': '굴돌이',
                    'Lune': '은빛',
                },
                locationNames: {
                    'The Arriving Gate': '도착의 문',
                    'The Waterway': '수로',
                    "Professor Clover's Sand Field": '콩선생 모래밭',
                    "Old Finn's Market": '꼬리상인 시장',
                    "Under Bun & Bun's Eaves": '빵집 처마 아래',
                    'The Bloom Field': '꽃밭',
                    'Two-Moon Hill': '두 달 언덕',
                    'Personal Spots': '개인 자리',
                },
            };

        case 'Japanese':
            return {
                header: `LANGUAGE: Japanese (日本語) — Write ONLY in Japanese (日本語).
文体指針: 温かく抑制された一人称日記体（私は/ぼくは）。過去形（〜た、〜だった）。感情を直接述べない。
行動と仕草だけで表現する。「〜と感じた」「気持ちが〜した」などの表現は絶対禁止。`,
                formatRule: '2〜3つの短い段落。一人称（私/ぼく）、過去形、日本語のみで記述。',
                forbiddenWordsPrompt: `日本語禁止語 (絶対使用禁止): 嬉しい, 悲しい, 楽しい, 感謝, 寂しい, 平和な, 穏やかな, 懐かしい, かもしれない, たぶん, だろう, まるで覚えているように, 感じた, 気持ち, 虹の橋, 〜のおかげで, 〜したからこそ, 〜に気づいた, 泣く, 泣いた, 楽しく遊んだ
方角禁止: "東/西/南/北"は絶対使わない。代わりに: "匂いが強くなる方向へ", "光が温かい方へ", "風が来る方向"
時間禁止: "3時", "午後2時"などの時計表現禁止。代わりに: "光が低くなる頃", "草露が残る朝"
曜日禁止: "月曜日", "火曜日"などの曜日禁止.`,
                npcNames: {
                    'Granny Shell': 'グラニー・シェル',
                    'Pip': 'ピップ',
                    'Professor Clover': 'クローバー先生',
                    'Old Finn': 'フィン老人',
                    'Bun & Bun': 'バンとバン',
                    'Digby': 'ディグビー',
                    'Lune': 'ルーン',
                },
                locationNames: {
                    'The Arriving Gate': '到着の門',
                    'The Waterway': '水の道',
                    "Professor Clover's Sand Field": 'クローバー先生の砂場',
                    "Old Finn's Market": 'フィン老人の市場',
                    "Under Bun & Bun's Eaves": 'バンとバンの軒先',
                    'The Bloom Field': '花畑',
                    'Two-Moon Hill': '二つの月の丘',
                    'Personal Spots': '自分の場所',
                },
            };

        default: // English
            return {
                header: 'LANGUAGE: English — Write ONLY in English. Write in first person (I, me, my).',
                formatRule: 'First person (I/me/my), past tense, English ONLY.',
                forbiddenWordsPrompt: '',
                npcNames: {},
                locationNames: {},
            };
    }
}

/**
 * Returns the localized NPC name if available, otherwise the original English name.
 */
export function localizeNpcName(englishName: string, language: string): string {
    const instruction = getLanguageInstruction(language);
    return instruction.npcNames[englishName] ?? englishName;
}

/**
 * Returns the localized location name if available, otherwise the original English name.
 */
export function localizeLocationName(englishName: string, language: string): string {
    const instruction = getLanguageInstruction(language);
    return instruction.locationNames[englishName] ?? englishName;
}

export function detectUserLanguage(
    petData: any,
    guardianData: any,
    recentLetter?: any
): string {

    // Priority 1: Recent letter language (Highest signal of current intent)
    if (recentLetter?.content) {
        const detected = detectLanguageFromText(recentLetter.content);
        if (detected !== 'Unknown') return detected;
    }

    // Priority 2: Deep Remembrance input language (Strong signal of user's core language)
    if (petData.deep_remembrance_responses) {
        // Sample a few responses to detect language
        // deep_remembrance_responses is JSONB, can be flat map or nested with {responses: {...}}
        let sampleText = '';
        const responses = petData.deep_remembrance_responses.responses || petData.deep_remembrance_responses;

        if (responses && typeof responses === 'object') {
            sampleText = Object.values(responses)
                .map((v: any) => {
                    // Handle plain string
                    if (typeof v === 'string') return v;
                    // Handle structured SurveyResponse object (v2.0 format)
                    if (typeof v === 'object' && v !== null) {
                        return [
                            v.text_answer || '',
                            v.other_text || '',
                            // Single choice label
                            v.selected_choice?.label || '',
                        ].join(' ');
                    }
                    return '';
                })
                .join(' ')
                .substring(0, 800);
        }

        const detected = detectLanguageFromText(sampleText);
        if (detected !== 'Unknown') return detected;
    }

    // Priority 3: Guardian's profile language preference (Explicit setting)
    if (guardianData?.preferred_language) {
        return guardianData.preferred_language;
    }

    // Default: English
    return 'English';
}

/**
 * Simple heuristic language detection (exported for direct use)
 */
export function detectLanguageFromText(text: string): string {
    if (!text || text.trim().length === 0) return 'Unknown';

    // Regex checks for specific scripts
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
    // Japanese detection requires kana (hiragana or katakana) — CJK ideographs alone are NOT sufficient
    // because they are shared with Chinese. Kana is the reliable discriminator.
    const hasKana = /[ぁ-ゔァ-ヴーｦ-ﾟ]/.test(text);
    const hasCJK = /[\u4e00-\u9fa5]/.test(text);
    const hasJapanese = hasKana; // kana presence = Japanese (may also have CJK)
    const hasChinese = hasCJK && !hasKana; // CJK without kana = Chinese
    // German/European chars (not exclusive to German but a hint if mixed with English-like text)
    // Actually, simple script detection is safer.

    if (hasKorean) return 'Korean';
    if (hasJapanese) return 'Japanese';
    if (hasChinese) return 'Chinese';

    // Distinguishing German vs English purely by regex is hard without dictionary,
    // but we can look for specific characters if needed. 
    // For now, if it's Latin script without specific Asian chars, we might default to English 
    // unless the User explicitly sets German.
    // The prompt says "If in German -> Write in German".
    // Let's assume explicit profile setting handles European nuances best, 
    // or we assume English for Latin script unless confident.

    return 'English'; // Default for Latin script
}
