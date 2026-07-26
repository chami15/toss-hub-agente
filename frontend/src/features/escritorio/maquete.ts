import { Assets, Container, Sprite, type Texture } from 'pixi.js'
import { paraTela, profundidade } from './iso'
import { caminhoSprite, type Direcao } from './sala'
import { ancoraDe } from './ancoras'
import {
  baseNoChao,
  indexarPorAgente,
  indexarPorId,
  nivelDe,
  type MovelSala,
  type SalaDados,
} from './sala-dados'

// ---------------------------------------------------------------
// A MAQUETE
//
// Dona do estado da sala (os dados) E dos sprites, mantendo os dois
// em sincronia. Todo mundo que quer mexer na sala — o modo de edição,
// o catálogo, mais tarde as animações dos agentes — fala com ela, e
// nunca com os sprites direto. É o que permite adicionar e remover
// móvel em tempo de execução sem remontar a cena inteira.
// ---------------------------------------------------------------

export class Maquete {
  readonly camada = new Container()
  private sprites = new Map<string, Sprite>()
  private texturas = new Map<string, Texture>()
  private porId = new Map<string, MovelSala>()
  private dados: SalaDados

  constructor(dados: SalaDados) {
    this.dados = dados
    this.camada.sortableChildren = true
    this.reindexar()
  }

  get moveis(): MovelSala[] {
    return this.dados.moveis
  }

  get sala(): SalaDados {
    return this.dados
  }

  private reindexar() {
    this.porId = indexarPorId(this.dados.moveis)
  }

  // Onde está cada agente. Recalculado na hora porque o editor pode
  // ter movido alguém desde a última chamada.
  agentes(): Map<string, MovelSala> {
    return indexarPorAgente(this.dados.moveis)
  }

  movel(id: string): MovelSala | undefined {
    return this.porId.get(id)
  }

  spriteDe(id: string): Sprite | undefined {
    return this.sprites.get(id)
  }

  // Carrega as texturas de um conjunto de peças. Idempotente — o
  // catálogo chama isso ao adicionar uma peça que ainda não apareceu.
  async carregar(pecas: { peca: string; direcao: Direcao }[]): Promise<void> {
    const faltando = pecas.filter(({ peca, direcao }) => !this.texturas.has(`${peca}_${direcao}`))
    await Promise.all(
      faltando.map(async ({ peca, direcao }) => {
        const chave = `${peca}_${direcao}`
        if (this.texturas.has(chave)) return
        this.texturas.set(chave, await Assets.load(caminhoSprite(peca, direcao)))
      }),
    )
  }

  // Todas as combinações peça×direção que a sala usa hoje.
  pecasEmUso(): { peca: string; direcao: Direcao }[] {
    const vistas = new Set<string>()
    const lista: { peca: string; direcao: Direcao }[] = []
    for (const m of this.dados.moveis) {
      const chave = `${m.peca}_${m.direcao}`
      if (vistas.has(chave)) continue
      vistas.add(chave)
      lista.push({ peca: m.peca, direcao: m.direcao })
    }
    return lista
  }

  async montar(): Promise<void> {
    await this.carregar(this.pecasEmUso())
    for (const m of this.dados.moveis) this.criarSprite(m)
  }

  private criarSprite(m: MovelSala): Sprite {
    const textura = this.texturas.get(`${m.peca}_${m.direcao}`)
    if (!textura) throw new Error(`textura não carregada: ${m.peca}_${m.direcao}`)
    const sprite = new Sprite(textura)
    this.sprites.set(m.id, sprite)
    this.camada.addChild(sprite)
    this.posicionar(m.id)
    return sprite
  }

  // Coloca o sprite no lugar e recalcula a profundidade dele.
  //
  // A profundidade sai da peça que está NO CHÃO (seguindo a cadeia de
  // `sobre`), não da posição própria: um monitor levemente deslocado
  // da mesa tem profundidade menor que ela e desenharia ATRÁS —
  // sumindo. Herdando a do suporte e somando o nível, ele sempre
  // desenha na frente.
  posicionar(id: string): void {
    const m = this.porId.get(id)
    const sprite = this.sprites.get(id)
    if (!m || !sprite) return

    const ancora = ancoraDe(m.peca, m.direcao)
    sprite.anchor.set(ancora.x, ancora.y)
    const { x, y } = paraTela(m.coluna, m.linha, m.altura ?? 0)
    sprite.x = x
    sprite.y = y

    const base = baseNoChao(m, this.porId)
    const nivel = nivelDe(m, this.porId)
    const ordem = this.dados.moveis.indexOf(m)
    sprite.zIndex = profundidade(base.coluna, base.linha) * 1000 + nivel * 100 + ordem
  }

  // Reposiciona tudo — usado quando algo que afeta os outros muda
  // (mover um suporte, remover uma peça no meio do array).
  posicionarTodos(): void {
    for (const m of this.dados.moveis) this.posicionar(m.id)
  }

  async adicionar(m: MovelSala): Promise<void> {
    await this.carregar([{ peca: m.peca, direcao: m.direcao }])
    this.dados.moveis.push(m)
    this.reindexar()
    this.criarSprite(m)
  }

  remover(id: string): void {
    const i = this.dados.moveis.findIndex((m) => m.id === id)
    if (i < 0) return
    // o que estava apoiado nele volta pro chão, senão ficaria órfão
    // apontando pra um id que não existe mais
    for (const outro of this.dados.moveis) {
      if (outro.sobre === id) delete outro.sobre
    }
    this.dados.moveis.splice(i, 1)
    this.sprites.get(id)?.destroy()
    this.sprites.delete(id)
    this.reindexar()
    this.posicionarTodos()
  }

  async girar(id: string, passos = 1): Promise<void> {
    const m = this.porId.get(id)
    const sprite = this.sprites.get(id)
    if (!m || !sprite) return
    const ordem: Direcao[] = ['NE', 'NW', 'SE', 'SW']
    const i = ordem.indexOf(m.direcao)
    m.direcao = ordem[(i + passos + ordem.length) % ordem.length]
    await this.carregar([{ peca: m.peca, direcao: m.direcao }])
    const textura = this.texturas.get(`${m.peca}_${m.direcao}`)
    // girar é só trocar a textura e a âncora (que é por direção — o
    // mesmo móvel tem alturas diferentes em cada rotação)
    if (textura) sprite.texture = textura
    this.posicionar(id)
  }

  // Move a peça e leva junto o que estiver apoiado nela.
  mover(id: string, dColuna: number, dLinha: number): void {
    const m = this.porId.get(id)
    if (!m) return
    m.coluna += dColuna
    m.linha += dLinha
    this.posicionar(id)
    for (const outro of this.dados.moveis) {
      if (outro.sobre === id) {
        outro.coluna += dColuna
        outro.linha += dLinha
        this.posicionar(outro.id)
      }
    }
  }

  mudarAltura(id: string, delta: number): void {
    const m = this.porId.get(id)
    if (!m) return
    m.altura = Math.max(0, Number(((m.altura ?? 0) + delta).toFixed(3)))
    this.posicionar(id)
  }

  // Marca que uma peça está apoiada em outra (ou tira do apoio).
  apoiarEm(id: string, suporteId: string | null): void {
    const m = this.porId.get(id)
    if (!m) return
    if (suporteId && suporteId !== id) m.sobre = suporteId
    else delete m.sobre
    this.posicionar(id)
  }

  // Um agente ocupa no máximo um móvel por sala — atribuir aqui tira
  // ele de onde estava, senão o índice ficaria ambíguo.
  atribuirAgente(id: string, agenteId: string | null): void {
    const m = this.porId.get(id)
    if (!m) return
    if (agenteId) {
      for (const outro of this.dados.moveis) {
        if (outro.agente === agenteId && outro.id !== id) delete outro.agente
      }
      m.agente = agenteId
    } else {
      delete m.agente
    }
  }

  // Cópia limpa do estado, pra salvar em rascunho ou gravar na fonte.
  exportar(): SalaDados {
    return JSON.parse(JSON.stringify(this.dados)) as SalaDados
  }
}
