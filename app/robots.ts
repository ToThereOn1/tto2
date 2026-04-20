import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tothereon.com'

/**
 * Next.js App Router 자동 robots.txt 생성
 * - GET /robots.txt 으로 자동 서빙됩니다.
 * - 관리자/대시보드/API/개발 경로는 크롤러에서 제외.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                // 구글봇 및 AI 크롤러에게 공개 페이지 전체 허용
                userAgent: '*',
                allow: ['/', '/pricing', '/faq', '/login', '/signup', '/privacy', '/terms'],
                disallow: [
                    '/dashboard/',  // 인증이 필요한 대시보드
                    '/admin/',      // 관리자 전용
                    '/api/',        // API 라우트
                    '/dev/',        // 개발용 페이지
                    '/qa-test/',    // QA 테스트 페이지
                    '/test-db/',    // DB 테스트 페이지
                    '/auth/',       // 인증 콜백
                ],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    }
}
