import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { CookieBanner } from '@/components/ui/CookieBanner'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import { Analytics } from '@vercel/analytics/next'
import { cookies, headers } from 'next/headers'
import Script from 'next/script'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ToThereOn — AI Pet Memorial & Digital Sanctuary for Pet Loss Healing',
  description: 'Grieve, heal, and reconnect through ToThereOn — an AI-powered digital memorial where your beloved pet lives on. Receive personalized letters from across the Rainbow Bridge.',
  keywords: [
    // 핵심 추모/치유 키워드
    'pet memorial', 'AI pet memorial', 'digital pet memorial', 'interactive pet memorial',
    'pet loss grief support', 'pet loss healing', 'cope with pet loss', 'dealing with pet loss',
    'pet bereavement', 'pet grief support', 'how to cope with losing a pet',
    // 무지개다리 관련
    'rainbow bridge pet', 'pet afterlife', 'pet heaven', 'pet crossed rainbow bridge',
    'pet in heaven', 'after pet dies', 'my pet died what to do',
    // 서비스 기능 키워드
    'letters from your pet', 'AI pet letters', 'personalized pet tribute',
    'digital pet sanctuary', 'pet memorial app', 'virtual pet memorial',
    'pet loss support app', 'pet remembrance', 'eternal pet memorial',
    // 감정/상황 키워드
    'losing a dog', 'losing a cat', 'dog died', 'cat died',
    'pet passed away', 'grieving pet loss', 'pet loss comfort',
  ],
  openGraph: {
    title: 'ToThereOn — AI Pet Memorial & Digital Sanctuary',
    description: 'Your beloved pet lives on across the Rainbow Bridge. Receive heartfelt AI-generated letters, watch their story unfold, and find comfort in your pet loss journey — only at ToThereOn.',
    type: 'website',
    url: 'https://www.tothereon.com',
    siteName: 'ToThereOn',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ToThereOn — AI Pet Memorial & Digital Sanctuary',
    description: 'Your beloved pet lives on across the Rainbow Bridge. Receive heartfelt AI-generated letters and heal through ToThereOn.',
  },
  alternates: {
    canonical: 'https://www.tothereon.com',
  },
}

const SUPPORTED_LANGS = ['en', 'ko', 'ja'] as const
type SupportedLang = typeof SUPPORTED_LANGS[number]

async function detectLang(): Promise<SupportedLang> {
  // 1. 쿠키에서 언어 설정 확인
  const cookieStore = await cookies()
  const langCookie = cookieStore.get('lang')?.value
  if (langCookie && (SUPPORTED_LANGS as readonly string[]).includes(langCookie)) {
    return langCookie as SupportedLang
  }

  // 2. Accept-Language 헤더 파싱
  const headersList = await headers()
  const acceptLang = headersList.get('accept-language') ?? ''
  if (acceptLang.startsWith('ko')) return 'ko'
  if (acceptLang.startsWith('ja')) return 'ja'

  // 3. fallback
  return 'en'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const lang = await detectLang()
  return (
    <html lang={lang} className={`${plusJakartaSans.variable} ${notoSansKr.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Chrome translate wraps text nodes inside <font> elements.
          React then calls removeChild/insertBefore on the original text node,
          which is no longer a direct child → NotFoundError.
          This patch makes those calls safe by checking parentNode first.
        */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){
          var _removeChild = Node.prototype.removeChild;
          Node.prototype.removeChild = function(child) {
            if (child.parentNode !== this) return child;
            return _removeChild.call(this, child);
          };
          var _insertBefore = Node.prototype.insertBefore;
          Node.prototype.insertBefore = function(newNode, refNode) {
            if (refNode && refNode.parentNode !== this) return newNode;
            return _insertBefore.call(this, newNode, refNode);
          };
        })();` }} />

        {/* ══ SoftwareApplication JSON-LD — SEO/GEO 구조화 데이터 ══
            반려동물을 잃은 보호자가 구글에서 검색할 때 Rich Result 로 노출되도록 설계.
            SoftwareApplication + FAQPage + WebSite 스키마를 결합하여 최대 커버리지 확보.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              // ── 1. SoftwareApplication ──────────────────────────────────
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "@id": "https://tothereon.world/#app",
                "name": "ToThereOn",
                "url": "https://tothereon.world",
                "description": "ToThereOn is an AI-powered digital pet memorial and sanctuary. After your beloved pet crosses the Rainbow Bridge, our AI builds a personalized persona and sends you weekly letters written from their perspective — helping you grieve, heal, and stay connected.",
                "applicationCategory": "LifestyleApplication",
                "applicationSubCategory": "Pet Loss Grief Support & Digital Memorial",
                "operatingSystem": "Web",
                "offers": [
                  {
                    "@type": "Offer",
                    "name": "Free Plan",
                    "price": "0",
                    "priceCurrency": "USD",
                    "description": "Register your pet and watch their journey unfold in ToThereOn World — no payment required."
                  },
                  {
                    "@type": "Offer",
                    "name": "Basic Plan",
                    "price": "4.99",
                    "priceCurrency": "USD",
                    "description": "Receive heartfelt AI-generated letters from your pet every week."
                  },
                  {
                    "@type": "Offer",
                    "name": "Premium Plan",
                    "price": "9.99",
                    "priceCurrency": "USD",
                    "description": "Full access including multiple pets, priority letters, and deep persona customization."
                  }
                ],
                "featureList": [
                  "AI-generated personalized pet memorial letters delivered weekly",
                  "Deep Remembrance persona engine built from your pet's unique traits and memories",
                  "Living time-flow simulation: 7 real-world days = 1 day in ToThereOn World",
                  "Interactive digital sanctuary — a continuously evolving pet afterlife",
                  "Pet loss grief support through meaningful reconnection",
                  "Rainbow Bridge memorial timeline with day-by-day updates"
                ],
                "keywords": "pet memorial, AI pet memorial, pet loss grief support, rainbow bridge pet, cope with pet loss, pet loss healing, letters from your pet, pet afterlife, digital pet sanctuary, pet bereavement, losing a dog, losing a cat, dog died, cat died, pet passed away, grieving pet loss",
                "screenshot": "https://tothereon.world/og-image.png",
                "provider": {
                  "@type": "Organization",
                  "name": "ToThereOn",
                  "url": "https://tothereon.world",
                  "email": "support@tothereon.world"
                },
                "audience": {
                  "@type": "Audience",
                  "audienceType": "Pet owners grieving the loss of a beloved pet"
                },
                "about": [
                  { "@type": "Thing", "name": "Pet Loss Grief" },
                  { "@type": "Thing", "name": "Pet Memorial" },
                  { "@type": "Thing", "name": "Rainbow Bridge" },
                  { "@type": "Thing", "name": "Pet Bereavement" },
                  { "@type": "Thing", "name": "Digital Pet Afterlife" },
                  { "@type": "Thing", "name": "AI Pet Letters" }
                ]
              },

              // ── 2. WebSite (Sitelinks SearchBox) ────────────────────────
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": "https://tothereon.world/#website",
                "url": "https://tothereon.world",
                "name": "ToThereOn — AI Pet Memorial & Digital Sanctuary",
                "description": "A digital memorial sanctuary where your beloved pet lives on across the Rainbow Bridge. Receive personalized AI letters and find healing after pet loss.",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://tothereon.world/search?q={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              },

              // ── 3. FAQPage ───────────────────────────────────────────────
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "What is ToThereOn and how can it help with pet loss grief?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "ToThereOn is an AI-powered digital pet memorial and sanctuary. After registering your pet, our AI builds a personalized persona based on their unique traits and your shared memories — then sends you weekly letters written from their perspective, helping you navigate pet loss grief and find comfort."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "How do I cope with losing my dog or cat?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Coping with pet loss is a deeply personal journey. ToThereOn offers a gentle, ongoing way to stay connected — you can register your pet for free, share their memories through our Deep Remembrance process, and receive heartfelt AI-generated letters every week as a meaningful form of pet loss support."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Can I receive letters from my pet after they cross the Rainbow Bridge?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Yes. ToThereOn's AI persona engine writes weekly letters from your pet's perspective — personalized based on their personality, habits, and the memories you've shared. Each letter feels like a genuine message from the companion you knew and loved."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "What does '3 days = 1 day' mean in ToThereOn World?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "In ToThereOn World, time flows differently. Every 3 real-world days equals 1 day in your pet's digital afterlife across the Rainbow Bridge. This means your pet's story unfolds at a gentle pace — each chapter continuing the evolving story of their life and their love for you."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "Is ToThereOn free to use?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Yes! You can register your pet and watch their journey unfold in ToThereOn World for free, with no payment required. Upgrade anytime to send and receive personalized letters and unlock deeper features."
                    }
                  },
                  {
                    "@type": "Question",
                    "name": "My pet just died. What should I do first?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "We are deeply sorry for your loss. When you are ready, ToThereOn is here to help you grieve and heal. Simply register your pet — it's free — and begin building their digital memorial. Share their name, personality, and your favorite memories. Our AI will craft a living sanctuary and, with a subscription, send you heartfelt letters in their voice every week."
                    }
                  }
                ]
              }
            ])
          }}
        />
      </head>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <PostHogProvider>
          <Toaster position="top-center" richColors />
          {children}
          <Analytics />
          <CookieBanner />
        </PostHogProvider>
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}
          </Script>
        </>
      )}
    </html>
  )
}
