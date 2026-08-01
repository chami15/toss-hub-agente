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
import { PainelMensagens } from '../agentes/PainelMensagens'
import { PainelConfiguracoes } from './PainelConfiguracoes'
import { IconeAvancarTick, IconeConfiguracoes, IconeMensagens } from './icones'
import { useAvancarMundo, type ResultadoAvancoMundo } from '../../hooks/useMundo'
import { useContagemNaoLidas } from '../../hooks/useMensagens'
import { definirDryRunAtivo, dryRunEstaAtivo, lerPreviewSalva, salvarPreview } from './dry-run'

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
  // o painel de mensagens (conversas do chefe + mural geral) não é de
  // nenhum agente — cruza os quatro. Mutuamente exclusivo com o painel
  // de agente (mesma regra de "um painel de cada vez" que já valia só
  // entre agentes)
  const [mensagensAbertas, setMensagensAbertas] = useState(false)
  // configurações (relógio/orçamento/dry_run/eventos do mundo) — mesma
  // regra de exclusividade que mensagens, só que abre pela ESQUERDA
  // (decisão do chefe: as duas em lados opostos, pra não parecerem "a
  // mesma janela reaparecendo")
  const [configuracoesAbertas, setConfiguracoesAbertas] = useState(false)
  // dry_run é um MODO, não uma ação — liga/desliga e persiste (mesmo
  // espírito do rascunho de sala): enquanto ligado, o ícone de avançar
  // só confere, nunca gasta nem grava. Lazy init lê do localStorage uma
  // vez só, na montagem (ver dry-run.ts)
  const [dryRunAtivo, setDryRunAtivoState] = useState(dryRunEstaAtivo)
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoAvancoMundo | null>(() =>
    dryRunEstaAtivo() ? lerPreviewSalva() : null,
  )
  const avancar = useAvancarMundo()
  const contagemNaoLidas = useContagemNaoLidas()

  function aoAlternarDryRun(ativo: boolean) {
    definirDryRunAtivo(ativo)
    setDryRunAtivoState(ativo)
    // desligar é o "volta a como era antes": a prévia local some, e a
    // tela volta a ler o estado real (que dry_run nunca tocou)
    setUltimoResultado(ativo ? lerPreviewSalva() : null)
  }

  function aoClicarAvancar() {
    avancar.mutate(dryRunAtivo, {
      onSuccess: (resultado) => {
        setUltimoResultado(resultado)
        if (dryRunAtivo) salvarPreview(resultado)
      },
    })
  }

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
          setMensagensAbertas(false)
          setConfiguracoesAbertas(false)
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
      if (e.key === 'Escape' && (agenteAberto || mensagensAbertas || configuracoesAbertas)) {
        setAgenteAberto(null)
        setMensagensAbertas(false)
        setConfiguracoesAbertas(false)
        return
      }
      // com um painel de agente, mensagens ou configurações aberto o
      // teclado é dele: sem isso, um "e" digitado fora do campo ligaria
      // o modo de edição por baixo do painel (ou pior, editaria a sala
      // ÀS CEGAS por baixo do painel de configurações, que cobre o
      // mesmo canto esquerdo onde o HUD de edição vive)
      if (mensagensAbertas || configuracoesAbertas) return
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
    // valor atual de `agenteAberto`/`mensagensAbertas`/`configuracoesAbertas`,
    // não o da montagem
  }, [agenteAberto, mensagensAbertas, configuracoesAbertas])

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
          mostrarDica={!agenteAberto && !mensagensAbertas && !configuracoesAbertas}
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
      {/* o menu de salas some com um agente (ou mensagens/configurações)
          aberto: trocar de sala no meio de uma conversa não faz sentido,
          mesma regra que já vale pro modo de edição */}
      {!estado?.ativo && !agenteAberto && !mensagensAbertas && !configuracoesAbertas && <PainelSalas />}
      {!estado?.ativo && <PopupPorta popup={estado?.popupPorta ?? null} />}

      {/* Menu único do módulo de interação — canto inferior direito.
          Sempre visível, em qualquer modo (inclusive edição, inclusive
          com mensagens ou configurações abertas): zIndex 65, ACIMA dos
          próprios painéis (60), não só do backdrop deles (55) — este
          canto fica GEOMETRICAMENTE por baixo do painel de mensagens
          (que se estende até right:0), então bater só o backdrop não
          bastava, o painel em si também cobriria o menu. */}
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 65,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'center',
          background: 'rgba(20, 22, 27, 0.93)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 14,
          padding: 8,
        }}
      >
        <BotaoIcone
          titulo="mensagens"
          ativo={mensagensAbertas}
          badge={contagemNaoLidas > 0}
          onClick={() => {
            setMensagensAbertas((v) => !v)
            setAgenteAberto(null)
            setConfiguracoesAbertas(false)
          }}
        >
          <IconeMensagens />
        </BotaoIcone>

        <BotaoIcone
          titulo="configurações"
          ativo={configuracoesAbertas}
          onClick={() => {
            setConfiguracoesAbertas((v) => !v)
            setAgenteAberto(null)
            setMensagensAbertas(false)
          }}
        >
          <IconeConfiguracoes />
        </BotaoIcone>

        <BotaoIcone
          titulo={dryRunAtivo ? 'conferir 1 tick (modo simulado ligado)' : 'avançar 1 tick'}
          destaque
          carregando={avancar.isPending}
          onClick={aoClicarAvancar}
        >
          <IconeAvancarTick />
        </BotaoIcone>
      </div>

      {agenteAberto && <PainelDoAgente agenteId={agenteAberto} aoFechar={() => setAgenteAberto(null)} />}
      {mensagensAbertas && <PainelMensagens aoFechar={() => setMensagensAbertas(false)} />}
      {configuracoesAbertas && (
        <PainelConfiguracoes
          aoFechar={() => setConfiguracoesAbertas(false)}
          dryRunAtivo={dryRunAtivo}
          aoAlternarDryRun={aoAlternarDryRun}
          ultimoResultado={ultimoResultado}
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

function BotaoIcone({
  children,
  titulo,
  onClick,
  ativo = false,
  destaque = false,
  badge = false,
  carregando = false,
}: {
  children: React.ReactNode
  titulo: string
  onClick: () => void
  ativo?: boolean
  destaque?: boolean
  badge?: boolean
  carregando?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      disabled={carregando}
      style={{
        position: 'relative',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.14)',
        background: ativo
          ? 'rgba(255,255,255,0.16)'
          : destaque
            ? 'rgba(74,222,128,0.16)'
            : 'rgba(255,255,255,0.06)',
        color: destaque ? '#4ade80' : '#e6e1d6',
        cursor: carregando ? 'default' : 'pointer',
        opacity: carregando ? 0.6 : 1,
      }}
    >
      {children}
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#ef4444',
            border: '2px solid rgba(20,22,27,0.93)',
          }}
          aria-label="mensagens não lidas"
        />
      )}
    </button>
  )
}
