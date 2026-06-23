import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const dot = (
    left: number,
    top: number,
    s = 16,
    h = s,
    o = 1
  ): React.CSSProperties => ({
    position: 'absolute',
    left,
    top,
    width: s,
    height: h,
    borderRadius: 4,
    background: `rgba(255,255,255,${o})`,
    display: 'flex',
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #577fff, #3d61f1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 38,
            top: 38,
            width: 52,
            height: 52,
            borderRadius: 14,
            border: '13px solid #fff',
            display: 'flex',
          }}
        />
        <div style={dot(57, 57, 18, 18)} />
        <div style={dot(110, 40)} />
        <div style={dot(130, 62)} />
        <div style={dot(110, 110)} />
        <div style={dot(40, 110)} />
        <div style={dot(40, 132, 16, 16, 0.85)} />
        <div style={dot(84, 128, 13, 13)} />
        <div style={dot(134, 110, 9, 16, 0.85)} />
      </div>
    ),
    { ...size }
  )
}
