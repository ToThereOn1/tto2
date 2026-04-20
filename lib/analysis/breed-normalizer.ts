/**
 * Breed Normalizer
 * Translates Korean/Japanese breed names to English for DB lookup.
 * Used before querying breed_characteristics table which stores English names only.
 */

// Korean breed name → English
const KO_TO_EN: Record<string, string> = {
    // Dogs
    '골든 리트리버': 'Golden Retriever',
    '골든리트리버': 'Golden Retriever',
    '황금 리트리버': 'Golden Retriever',
    '래브라도 리트리버': 'Labrador Retriever',
    '래브라도': 'Labrador Retriever',
    '라브라도 리트리버': 'Labrador Retriever',
    '라브라도': 'Labrador Retriever',
    '푸들': 'Poodle',
    '미니 푸들': 'Miniature Poodle',
    '토이 푸들': 'Toy Poodle',
    '치와와': 'Chihuahua',
    '말티즈': 'Maltese',
    '몰티즈': 'Maltese',
    '시추': 'Shih Tzu',
    '포메라니안': 'Pomeranian',
    '포메': 'Pomeranian',
    '요크셔 테리어': 'Yorkshire Terrier',
    '요크셔테리어': 'Yorkshire Terrier',
    '요키': 'Yorkshire Terrier',
    '닥스훈트': 'Dachshund',
    '닥스훈드': 'Dachshund',
    '비글': 'Beagle',
    '진도견': 'Jindo',
    '진도': 'Jindo',
    '시베리안 허스키': 'Siberian Husky',
    '허스키': 'Siberian Husky',
    '독일 셰퍼드': 'German Shepherd',
    '셰퍼드': 'German Shepherd',
    '저먼 셰퍼드': 'German Shepherd',
    '보더 콜리': 'Border Collie',
    '보더콜리': 'Border Collie',
    '불독': 'Bulldog',
    '영국 불독': 'Bulldog',
    '프렌치 불독': 'French Bulldog',
    '프렌치불독': 'French Bulldog',
    '프불': 'French Bulldog',
    '코커 스패니얼': 'Cocker Spaniel',
    '코카 스파니엘': 'Cocker Spaniel',
    '사모예드': 'Samoyed',
    '웰시 코기': 'Welsh Corgi',
    '코기': 'Corgi',
    '보스턴 테리어': 'Boston Terrier',
    '미니어처 슈나우저': 'Miniature Schnauzer',
    '슈나우저': 'Schnauzer',
    '셰틀랜드 쉽독': 'Shetland Sheepdog',
    '쉘티': 'Shetland Sheepdog',
    '아키타': 'Akita',
    '아키타견': 'Akita',
    '시바 이누': 'Shiba Inu',
    '시바견': 'Shiba Inu',
    '시바이누': 'Shiba Inu',
    '그레이하운드': 'Greyhound',
    '이탈리안 그레이하운드': 'Italian Greyhound',
    '도베르만': 'Doberman',
    '로트와일러': 'Rottweiler',
    '로트바일러': 'Rottweiler',
    '복서': 'Boxer',
    '달마시안': 'Dalmatian',
    '달마티안': 'Dalmatian',
    '스피츠': 'Spitz',
    '사모': 'Samoyed',
    '비숑 프리제': 'Bichon Frise',
    '비숑': 'Bichon Frise',
    '믹스견': 'Mixed',
    '혼혈견': 'Mixed',
    '잡종견': 'Mixed',
    '잡종': 'Mixed',
    '혼혈': 'Mixed',
    // Cats
    '페르시안': 'Persian',
    '페르시아': 'Persian',
    '샴': 'Siamese',
    '샴고양이': 'Siamese',
    '벵갈': 'Bengal',
    '벵골': 'Bengal',
    '브리티시 쇼트헤어': 'British Shorthair',
    '영국 단모': 'British Shorthair',
    '브리티쉬 쇼트헤어': 'British Shorthair',
    '메인쿤': 'Maine Coon',
    '메인 쿤': 'Maine Coon',
    '랙돌': 'Ragdoll',
    '랙 돌': 'Ragdoll',
    '스코티시 폴드': 'Scottish Fold',
    '스코티쉬 폴드': 'Scottish Fold',
    '스코폴': 'Scottish Fold',
    '아비시니안': 'Abyssinian',
    '노르웨이 숲 고양이': 'Norwegian Forest Cat',
    '노르웨이': 'Norwegian Forest Cat',
    '버마': 'Burmese',
    '버미즈': 'Burmese',
    '러시안 블루': 'Russian Blue',
    '러시안블루': 'Russian Blue',
    '스핑크스': 'Sphynx',
    '스핑스': 'Sphynx',
    '터키시 앙고라': 'Turkish Angora',
    '앙고라': 'Angora',
    '아메리칸 쇼트헤어': 'American Shorthair',
    '아메숏': 'American Shorthair',
    '코리안 쇼트헤어': 'Korean Shorthair',
    '코숏': 'Korean Shorthair',
    '믹스': 'Mixed',
    '혼혈묘': 'Mixed',
    '잡종묘': 'Mixed',
}

// Japanese breed name → English
const JA_TO_EN: Record<string, string> = {
    // Dogs
    'ゴールデンレトリーバー': 'Golden Retriever',
    'ゴールデン・レトリーバー': 'Golden Retriever',
    'ラブラドールレトリーバー': 'Labrador Retriever',
    'ラブラドール': 'Labrador Retriever',
    'プードル': 'Poodle',
    'トイプードル': 'Toy Poodle',
    'ミニチュアプードル': 'Miniature Poodle',
    'チワワ': 'Chihuahua',
    'マルチーズ': 'Maltese',
    'シーズー': 'Shih Tzu',
    'ポメラニアン': 'Pomeranian',
    'ヨークシャーテリア': 'Yorkshire Terrier',
    'ダックスフンド': 'Dachshund',
    'ダックスフント': 'Dachshund',
    'ビーグル': 'Beagle',
    '柴犬': 'Shiba Inu',
    'しばいぬ': 'Shiba Inu',
    'シバイヌ': 'Shiba Inu',
    '秋田犬': 'Akita',
    'あきたいぬ': 'Akita',
    'アキタ': 'Akita',
    'シベリアンハスキー': 'Siberian Husky',
    'ハスキー': 'Siberian Husky',
    'ジャーマンシェパード': 'German Shepherd',
    'シェパード': 'German Shepherd',
    'ボーダーコリー': 'Border Collie',
    'ブルドッグ': 'Bulldog',
    'フレンチブルドッグ': 'French Bulldog',
    'フレブル': 'French Bulldog',
    'コッカースパニエル': 'Cocker Spaniel',
    'サモエド': 'Samoyed',
    'ウェルシュコーギー': 'Welsh Corgi',
    'コーギー': 'Corgi',
    'ボストンテリア': 'Boston Terrier',
    'シュナウザー': 'Schnauzer',
    'ミニチュアシュナウザー': 'Miniature Schnauzer',
    'シェットランドシープドッグ': 'Shetland Sheepdog',
    'シェルティ': 'Shetland Sheepdog',
    'グレイハウンド': 'Greyhound',
    'ドーベルマン': 'Doberman',
    'ロットワイラー': 'Rottweiler',
    'ボクサー': 'Boxer',
    'ダルメシアン': 'Dalmatian',
    'スピッツ': 'Spitz',
    'ビションフリーゼ': 'Bichon Frise',
    '雑種': 'Mixed',
    'ミックス犬': 'Mixed',
    // Cats
    'ペルシャ': 'Persian',
    'シャム': 'Siamese',
    'ベンガル': 'Bengal',
    'ブリティッシュショートヘア': 'British Shorthair',
    'メインクーン': 'Maine Coon',
    'ラグドール': 'Ragdoll',
    'スコティッシュフォールド': 'Scottish Fold',
    'スコティッシュ・フォールド': 'Scottish Fold',
    'アビシニアン': 'Abyssinian',
    'ノルウェージャンフォレストキャット': 'Norwegian Forest Cat',
    'バーミーズ': 'Burmese',
    'ロシアンブルー': 'Russian Blue',
    'スフィンクス': 'Sphynx',
    'ターキッシュアンゴラ': 'Turkish Angora',
    'アメリカンショートヘア': 'American Shorthair',
    'アメショー': 'American Shorthear',
    '雑種猫': 'Mixed',
    'ミックス猫': 'Mixed',
    'ミックス': 'Mixed',
}

function isKorean(text: string): boolean {
    return /[가-힣]/.test(text)
}

function isJapanese(text: string): boolean {
    return /[ぁ-ゔゞァ-ヴーｦ-ｯｱ-ﾝ\u4e00-\u9fa5]/.test(text)
}

/**
 * Normalizes a breed name to English.
 * Handles Korean, Japanese, and returns English as-is.
 * Case-insensitive for English lookups.
 */
export function normalizeBreedName(breedName: string): string {
    const trimmed = breedName.trim()
    if (!trimmed) return trimmed

    if (isKorean(trimmed)) {
        // Try exact match first
        const exact = KO_TO_EN[trimmed]
        if (exact) return exact
        // Try case-insensitive match
        const lower = trimmed.toLowerCase()
        for (const [ko, en] of Object.entries(KO_TO_EN)) {
            if (ko.toLowerCase() === lower) return en
        }
        // Try partial match (contains)
        for (const [ko, en] of Object.entries(KO_TO_EN)) {
            if (trimmed.includes(ko) || ko.includes(trimmed)) return en
        }
        // Return as-is if no match (will fall through to fuzzy DB search)
        return trimmed
    }

    if (isJapanese(trimmed)) {
        const exact = JA_TO_EN[trimmed]
        if (exact) return exact
        for (const [ja, en] of Object.entries(JA_TO_EN)) {
            if (trimmed.includes(ja) || ja.includes(trimmed)) return en
        }
        return trimmed
    }

    // English or other: return as-is
    return trimmed
}
