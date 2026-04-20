import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const petName = searchParams.get('pet') || 'Your Friend'
  const species = searchParams.get('species') || 'companion'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2340 50%, #1a3a5c 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          color: 'white',
          position: 'relative',
        }}
      >
        {/* Waterway background effect */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          width: '100%',
          height: '120px',
          background: 'linear-gradient(to top, rgba(100,180,255,0.15), transparent)',
          display: 'flex',
        }} />

        {/* ToThereOn brand */}
        <div style={{ fontSize: '28px', color: '#94c5f7', marginBottom: '16px', letterSpacing: '0.15em' }}>
          ToThereOn
        </div>

        {/* Pet name */}
        <div style={{ fontSize: '72px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>
          {petName}
        </div>

        {/* Message */}
        <div style={{ fontSize: '28px', color: '#c9e0f7', textAlign: 'center', maxWidth: '800px' }}>
          is waiting for your letter through the Waterway
        </div>

        {/* Divider */}
        <div style={{ width: '200px', height: '1px', background: 'rgba(100,180,255,0.4)', marginTop: '32px' }} />

        {/* Footer */}
        <div style={{ fontSize: '20px', color: '#6ba3cc', marginTop: '20px' }}>
          Letters float through the Waterway to reach them
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
