import { useCallback, useEffect, useRef, useState } from 'react'
import { Application, Container } from 'pixi.js'
import { criarCena } from './cena'
import { criarEditor, type Editor, type EstadoEditor } from './edicao'
import { carregarSala, todasAsSalasComRascunho } from './persistencia'
import { PALETAS } from './sala'
import { conferirConjuntoDeSalas } from './sala-conferir'
import { PainelEdicao } from './PainelEdicao'
import { PainelCatalogo } from './PainelCatalogo'
import { PainelProblemas } from './PainelProblemas'
import { PainelSalas } from './PainelSalas'
import { PopupPorta } from './PopupPorta'
import { PainelDoAgente } from '../agentes/PainelDoAgente'
import { PainelCaixaDeEntrada } from '../agentes/PainelCaixaDeEntrada'
import { PainelRelogio } from './PainelRelogio'

// Hospeda o mundo isométrico. React cuida do ciclo de vida do canvas e
// dos painéis; tudo que é desenho mora em cena.ts / maquete.ts. O
// `mundo` é o container que vai levar câmera (pan/zoom) quando a gente
// chegar lá — por isso a cena entra dentro dele, e não direto no palco.
export function Escritorio() {
  const hospedeiroRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)
  const [estado, setEstado] = useState<EstadoEditor | null>(null)
  const [catalogoAberto, setCatalogoAberto] = useState(false)
  const [problemas, setProblemas] = useState<string[]>([])
  // qual painel de agente está aberto (id local: cifra/agenda/vita/norte).
  // Um por vez: abrir outro troca o conteúdo, nunca empilha. Não persiste
  // entre reloads de propósito — é estado de tela, não dado.
  const [agenteAberto, setAgenteAberto] = useState<string | null>(null)
  // a caixa de entrada não é de nenhum agente — é do chefe, cruzando os
  // quatro. Mutuamente exclusiva com o painel de agente (mesma regra de
  // "um painel de cada vez" que já valia só entre agentes)
  const [caixaAberta, setCaixaAberta] = useState(false)

  useEffect(() => {
    const hospedeiro = hospedeiroRef.current
    if (!hospedeiro) return

    let desmontado = false
    let app: Application | null = null

    async function montar() {
      // a sala carrega ANTES do Pixi iniciar, pra pintar o fundo com a
      // cor certa desde o primeiro frame — cada sala tem sua própria
      // paleta agora, não existe mais uma cor de fundo global
      const { sala, idSala } = carregarSala()
      const corFundo = typeof sala.paleta?.vazio === 'number' ? sala.paleta.vazio : PALETAS.neutra.vazio

      const aplicacao = new Application()
      await aplicacao.init({
        background: corFundo,
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
      const cena = await criarCena(sala, {
        aoClicarAgente: (id) => {
          setAgenteAberto(id)
          setCaixaAberta(false)
        },
      })
      if (desmontado) return
      mundo.addChild(cena.raiz)

      // defeitos da sala sozinha (cena.problemas) + defeitos que só
      // aparecem olhando o conjunto — nome duplicado, agente já usado
      // em outra sala, porta pra sala que não existe. Cada sala entra
      // com o próprio rascunho quando existe (não com a fonte crua) —
      // senão um defeito já corrigido em algum rascunho local
      // apareceria denunciado mesmo assim.
      const problemasConjunto = conferirConjuntoDeSalas(todasAsSalasComRascunho())
      setProblemas([...cena.problemas, ...problemasConjunto])

      const editor = criarEditor(
        cena,
        mundo,
        aplicacao.stage,
        () => {
          const atual = editorRef.current?.estado() ?? null
          setEstado(atual)
          // em edição o crachá deixa de ser botão e o clique passa
          // pro móvel embaixo — senão a cadeira do agente ficaria
          // impossível de arrastar
          cena.definirAgentesClicaveis(!atual?.ativo)
        },
        idSala,
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
      // Esc fecha o painel aberto — checado ANTES do filtro de campo de
      // texto logo abaixo, porque é justamente dentro do campo que a mão
      // está quando se quer fechar
      if (e.key === 'Escape' && (agenteAberto || caixaAberta)) {
        setAgenteAberto(null)
        setCaixaAberta(false)
        return
      }
      // com um painel de agente (ou a caixa de entrada) aberto o teclado
      // é dele: sem isso, um "e" digitado fora do campo ligaria o modo
      // de edição por baixo do painel, deixando os dois modos ativos ao
      // mesmo tempo
      if (caixaAberta) return
      if (agenteAberto) return

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

      // Ctrl+Z desfaz, Ctrl+Shift+Z refaz (Cmd no mac). Ctrl+Y também
      // refaz, que é o costume de quem vem do Windows.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) editor.refazer()
        else editor.desfazer()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        editor.refazer()
        return
      }

      // Ctrl+C / Ctrl+V da peça selecionada. Só chega aqui fora de campo
      // de texto (filtrado lá em cima), então copiar texto de um input
      // continua funcionando normalmente.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        editor.copiar()
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        editor.colar()
        return
      }

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
    // re-registra ao abrir/fechar painel: o atalho precisa enxergar o
    // valor atual de `agenteAberto`/`caixaAberta`, não o da montagem
  }, [agenteAberto, caixaAberta])

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
          aoDesfazer={() => chamar((e) => e.desfazer())}
          aoRefazer={() => chamar((e) => e.refazer())}
          aoApoiar={() => chamar((e) => e.apoiarNoDeBaixo())}
          aoRemover={() => chamar((e) => e.remover())}
          aoAtribuirAgente={(id) => chamar((e) => e.atribuirAgente(id))}
          aoAtribuirPorta={(idSala) => chamar((e) => e.atribuirPorta(idSala))}
          aoSalvarRascunho={() => chamar((e) => e.salvarRascunho())}
          aoGravarNaFonte={() => chamar((e) => e.gravarNaFonte())}
          aoVoltarParaFonte={() => chamar((e) => e.voltarParaFonte())}
          aoCopiarJson={() => chamar((e) => e.copiarJson())}
        />
      )}
      <PainelProblemas problemas={problemas} aoFechar={() => setProblemas([])} />
      {/* sempre visível, em qualquer modo — ver comentário no arquivo */}
      <PainelRelogio />
      {/* o menu de salas some com um agente (ou a caixa) aberto: trocar
          de sala no meio de uma conversa não faz sentido, mesma regra
          que já vale pro modo de edição */}
      {!estado?.ativo && !agenteAberto && !caixaAberta && <PainelSalas />}
      {!estado?.ativo && !caixaAberta && (
        <button
          onClick={() => {
            setCaixaAberta(true)
            setAgenteAberto(null)
          }}
          style={{
            position: 'absolute',
            left: 16,
            top: 16,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 11,
            color: '#e6e1d6',
            background: 'rgba(20, 22, 27, 0.93)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 6,
            padding: '7px 11px',
            cursor: 'pointer',
          }}
        >
          ✉ caixa de entrada
        </button>
      )}
      {!estado?.ativo && <PopupPorta popup={estado?.popupPorta ?? null} />}
      {agenteAberto && <PainelDoAgente agenteId={agenteAberto} aoFechar={() => setAgenteAberto(null)} />}
      {caixaAberta && <PainelCaixaDeEntrada aoFechar={() => setCaixaAberta(false)} />}
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
