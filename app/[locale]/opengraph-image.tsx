import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'QRevent — collect event photos over WhatsApp'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #577fff 0%, #3d61f1 45%, #00224a 100%)',
          padding: '90px',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '96px',
              height: '96px',
              borderRadius: '24px',
              background: '#ffffff',
              color: '#3d61f1',
              fontSize: '46px',
              fontWeight: 800,
            }}
          >
            QR
          </div>
          <div style={{ display: 'flex', fontSize: '52px', fontWeight: 800 }}>QRevent</div>
        </div>

        <div style={{ display: 'flex', fontSize: '66px', fontWeight: 800, lineHeight: 1.1, maxWidth: '950px' }}>
          Collect every guest’s photo over WhatsApp
        </div>

        <div style={{ display: 'flex', fontSize: '30px', marginTop: '30px', opacity: 0.85 }}>
          One QR code · no apps · a private gallery you own
        </div>

        <div style={{ display: 'flex', fontSize: '26px', marginTop: '46px', opacity: 0.7 }}>qrevent.pro</div>
      </div>
    ),
    { ...size }
  )
}
