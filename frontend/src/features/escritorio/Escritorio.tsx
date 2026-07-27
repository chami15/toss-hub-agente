import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container } from 'pixi.js'
import { criarCena } from './cena'
import { criarEditor, type Editor, type EstadoEditor } from './edicao'
import { carregarSala } from './persistencia'
import { PALETA } from './sala'
import { PainelEdicao } from './PainelEdicao'
import { PainelCatalogo } from './PainelCatalogo'

// Hospeda o mundo isométrico. React cuida do ciclo de vida do canvas e
// dos painéis; tudo que é desenho mora em cena.ts / maquete.ts. O
// `mundo` é o container que vai levar câmera (pan/zoom) quando a gente
// chegar lá — por isso a cena entra dentro dele, e não direto no palco.
export function Escritorio() {
  const hospedeiroRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [estado, setEstado] = useState<EstadoEditor | null>(null)
  const [catalogoAberto, setCatalogoAberto] = useState(false)

  useEffect(() => {
    const hospedeiro = hospedeiroRef.current
    if (!hospedeiro) return

    let desmontado = false
    let app: Application | null = null

    async function montar() {
      const aplicacao = new Application()
      await aplicacao.init({
        background: PALETA.vazio,
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
      const { sala } = carregarSala()
      const cena = await criarCena(sala)
      if (desmontado) return
      mundo.addChild(cena.raiz)

      const editor = criarEditor(cena, mundo, aplicacao.stage, () =>
        setEstado(editorRef.current?.estado() ?? null),
      )
      editorRef.current = editor
      setEstado(editor.estado())

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
      editorRef.current?.destruir()
      editorRef.current = null
      app?.destroy(true, { children: true })
    }
  }, [])

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const editor = editorRef.current
      if (!editor) return
      // não sequestrar o teclado enquanto o chefe digita num campo
      const alvo = e.target as HTMLElement | null
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return

      if (e.key === 'e' || e.key === 'E') {
        editor.alternar()
        return
      }
      if (!editor.estado().ativo) return

      // as setas andam nas 4 direções nomeadas: a tela sobe = fundo da
      // sala = PARA_TRAS (−1,−1); desce = PARA_FRENTE (1,1); direita =
      // PARA_DIREITA (1,−1); esquerda = PARA_ESQUERDA (−1,1)
      const setas: Record<string, [number, number]> = {
        ArrowUp: [-1, -1],
        ArrowDown: [1, 1],
        ArrowRight: [1, -1],
        ArrowLeft: [-1, 1],
      }
      const seta = setas[e.key]
      if (seta) {
        e.preventDefault()
        editor.mover(seta[0], seta[1])
        return
      }

      switch (e.key) {
        case 'Tab':
          e.preventDefault()
          editor.ciclar(e.shiftKey ? -1 : 1)
          break
        case 'q':
        case 'Q':
          editor.girar(-1)
          break
        case 'w':
        case 'W':
          editor.girar(1)
          break
        // altura: A sobe, Z desce (logo abaixo no teclado — e
        // presente em qualquer layout, ao contrário de PgUp/PgDn, que
        // faltam em teclado compacto). PgUp/PgDn seguem valendo pra
        // quem tiver.
        case 'a':
        case 'A':
        case 'PageUp':
          e.preventDefault()
          editor.mudarAltura(0.02)
          break
        case 'z':
        case 'Z':
        case 'PageDown':
          e.preventDefault()
          editor.mudarAltura(-0.02)
          break
        case '[':
          editor.mudarPasso(-1)
          break
        case ']':
          editor.mudarPasso(1)
          break
        case 'Delete':
        case 'Backspace':
          e.preventDefault()
          editor.remover()
          break
      }
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  const chamar = useCallback((f: (e: Editor) => void) => {
    const editor = editorRef.current
    if (editor) f(editor)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', position: 'relative' }}>
      <div ref={hospedeiroRef} style={{ width: '100%', height: '100%' }} />
      {estado && (
        <PainelEdicao
          estado={estado}
          aoGirar={() => chamar((e) => e.girar(1))}
          aoApoiar={() => chamar((e) => e.apoiarNoDeBaixo())}
          aoRemover={() => chamar((e) => e.remover())}
          aoAtribuirAgente={(id) => chamar((e) => e.atribuirAgente(id))}
          aoSalvarRascunho={() => chamar((e) => e.salvarRascunho())}
          aoGravarNaFonte={() => chamar((e) => e.gravarNaFonte())}
          aoVoltarParaFonte={() => chamar((e) => e.voltarParaFonte())}
          aoCopiarJson={() => chamar((e) => e.copiarJson())}
        />
      )}
      {estado?.ativo && (
        <PainelCatalogo
          aberto={catalogoAberto}
          aoAlternar={() => setCatalogoAberto((v) => !v)}
          aoAdicionar={(peca) => chamar((e) => e.adicionar(peca))}
        />
      )}
    </div>
  )
}
