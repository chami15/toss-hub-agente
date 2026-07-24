import { useEffect, useRef } from 'react'
import { SALA } from './room'
import { desenharSala } from './renderer'

// Tentativa via Canvas2D puro (prompt do chefe): a sala isométrica
// inteira é desenhada num único <canvas>, não em SVG/DOM. React só
// cuida de montar o canvas e disparar o desenho — a lógica de
// grid/parede/mesa mora em iso.ts / room.ts / furniture.ts / renderer.ts.
const LARGURA = 960
const ALTURA = 620

export function Escritorio() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = LARGURA * dpr
    canvas.height = ALTURA * dpr
    canvas.style.width = `${LARGURA}px`
    canvas.style.height = `${ALTURA}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    desenharSala(ctx, SALA, LARGURA, ALTURA)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f2ee',
      }}
    >
      <canvas ref={canvasRef} style={{ borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }} />
    </div>
  )
}
