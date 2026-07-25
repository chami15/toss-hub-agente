import { useEffect, useRef } from 'react'
import { Application, Container } from 'pixi.js'
import { criarCena } from './cena'
import { COR_FUNDO } from './sala'

// Hospeda o mundo isométrico. React cuida só do ciclo de vida do
// canvas; tudo que é desenho mora em cena.ts. O `mundo` é o container
// que vai levar câmera (pan/zoom) quando a gente chegar lá — por isso
// a cena entra dentro dele, e não direto no palco.
export function Escritorio() {
  const hospedeiroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hospedeiro = hospedeiroRef.current
    if (!hospedeiro) return

    let desmontado = false
    let app: Application | null = null

    async function montar() {
      const aplicacao = new Application()
      await aplicacao.init({
        background: COR_FUNDO,
        resizeTo: hospedeiro!,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })

      // o componente pode ter desmontado enquanto o init rodava
      if (desmontado) {
        aplicacao.destroy(true, { children: true })
        return
      }

      app = aplicacao
      hospedeiro!.appendChild(aplicacao.canvas)

      const mundo = new Container()
      aplicacao.stage.addChild(mundo)

      // as texturas do pack são carregadas antes da cena existir
      mundo.addChild(await criarCena())
      if (desmontado) return

      // Encaixa a maquete inteira na tela, com uma margem, e centraliza.
      // Quando a câmera com pan/zoom entrar, isso vira só o estado inicial.
      const MARGEM = 0.88

      function centralizar() {
        const limites = mundo.getLocalBounds()
        const escala = Math.min(
          (aplicacao.screen.width * MARGEM) / limites.width,
          (aplicacao.screen.height * MARGEM) / limites.height,
        )
        mundo.scale.set(escala)
        mundo.x = aplicacao.screen.width / 2 - (limites.x + limites.width / 2) * escala
        mundo.y = aplicacao.screen.height / 2 - (limites.y + limites.height / 2) * escala
      }

      centralizar()
      aplicacao.renderer.on('resize', centralizar)
    }

    void montar()

    return () => {
      desmontado = true
      app?.destroy(true, { children: true })
    }
  }, [])

  return <div ref={hospedeiroRef} style={{ width: '100vw', height: '100dvh', overflow: 'hidden' }} />
}
