import type { Direcao } from './sala'
import { novoId, type MovelSala, type SalaDados } from './sala-dados'
import { descartarRascunho, existeSala, lerRascunho, salaDaFonte, salvarRascunho } from './persistencia'

// ---------------------------------------------------------------
// ESPELHO DA PORTA
//
// Quando o chefe atribui `leva` a uma peça na sala A, a sala B (o
// destino) ganha uma peça correspondente — sem isso, toda porta nova
// deixaria a sala de destino sem volta, a menos que o chefe entrasse
// no modo de edição LÁ e criasse a porta na mão.
//
// O espelhamento tem TRÊS partes, e as três importam:
//   1. os EIXOS trocam (coluna da origem → linha do destino), que é o
//      que faz a porta reaparecer do lado correspondente e não no mesmo
//      lado;
//   2. a posição é PROPORCIONAL ao tamanho de cada sala (fração do
//      caminho no eixo), não uma coordenada copiada — assim funciona
//      não importa o quanto A e B forem diferentes de tamanho, e o
//      chefe continua livre pra arrastar a porta de origem pra
//      qualquer lugar, sem posição fixa nenhuma;
//   3. a DIREÇÃO acompanha a troca de eixos — ver abaixo.
//
// Depois de criado, o espelho é um móvel independente: mexer na porta
// de A não move a de B. As duas só continuam ligadas pelo `leva` de
// cada uma apontando pra sala da outra.
// ---------------------------------------------------------------

// Trocar coluna↔linha é, na tela, um espelho HORIZONTAL puro:
//   paraTela(l, c).x = (l − c)·W/2 = −x     (inverte)
//   paraTela(l, c).y = (l + c)·H/2 = +y     (não mexe)
// Ou seja: esquerda vira direita, cima continua cima. A direção da peça
// tem que sofrer a MESMA reflexão, senão a peça vai parar na parede
// certa virada errada — foi exatamente o que se viu em teste.
//
// Qual par reflete em qual não foi deduzido do nome (o rótulo "NE" é do
// pack da Kenney, não um eixo da nossa grade): foi medido. Espelhando a
// silhueta de cada sprite e comparando com as outras três direções, o
// resultado bate em 0,95–0,99 de sobreposição, igual pra toda peça com
// frente definida (chairDesk, desk, computerScreen):
//
//   espelho(NE) = NW      espelho(SE) = SW
//
// (Antes daqui a tabela fazia NE↔SE / NW↔SW. Isso não é reflexão
// nenhuma — é um giro de 180°, que deixa a peça no MESMO plano de
// parede em vez de passar pro plano perpendicular. Daí a "direção
// esquisita".)
const INVERTER_DIRECAO: Record<Direcao, Direcao> = {
  NE: 'NW',
  NW: 'NE',
  SE: 'SW',
  SW: 'SE',
}

function paraFracao(valor: number, total: number): number {
  return valor / Math.max(total - 1, 1)
}

function daFracao(fracao: number, total: number): number {
  return Number((fracao * Math.max(total - 1, 1)).toFixed(3))
}

// Cria o espelho como RASCUNHO da sala de destino — o chefe ainda
// decide quando gravar aquela sala na fonte, do mesmo jeito que
// qualquer outra edição. Não sobrescreve nada que já esteja lá.
//
// Devolve o id da peça criada, pra quem chamou poder desfazer isso
// depois (é o que "descartar e voltar à fonte" usa).
export function criarPortaEspelhada(
  idOrigem: string,
  salaOrigem: Pick<SalaDados, 'colunas' | 'linhas'>,
  movel: MovelSala,
  idDestino: string,
): string {
  const destino = lerRascunho(idDestino) ?? salaDaFonte(idDestino)
  const existentes = new Set(destino.moveis.map((m) => m.id))

  const espelho: MovelSala = {
    id: novoId(`${movel.peca}-espelho`, existentes),
    peca: movel.peca,
    direcao: INVERTER_DIRECAO[movel.direcao],
    // OS EIXOS TROCAM: a fração no eixo das COLUNAS da origem vira a
    // fração no eixo das LINHAS do destino, e vice-versa. É o que faz o
    // espelho ser um espelho de verdade — uma porta na penúltima coluna
    // de uma sala reaparece na penúltima LINHA da outra.
    //
    // A proporção continua entrando por cima da troca, pra funcionar
    // entre salas de tamanhos diferentes: o que se espelha é "quão longe
    // no eixo", não a coordenada crua.
    coluna: daFracao(paraFracao(movel.linha, salaOrigem.linhas), destino.colunas),
    linha: daFracao(paraFracao(movel.coluna, salaOrigem.colunas), destino.linhas),
    leva: idOrigem,
  }

  salvarRascunho(idDestino, { ...destino, moveis: [...destino.moveis, espelho] })
  return espelho.id
}

// ---------------------------------------------------------------
// DESFAZER O VÍNCULO DOS DOIS LADOS
//
// Tirar o `leva` só de um lado deixava a outra porta apontando pra cá
// pra sempre — uma passagem de mão única que ninguém pediu.
//
// Como o par NÃO é gravado em lugar nenhum (as duas peças são
// independentes desde que o espelho nasce, por decisão de projeto), a
// contrapartida é encontrada pela própria relação: é a peça da sala B
// que leva de volta pra A. Isso é exato enquanto houver UMA — e quando
// houver mais de uma, o certo é não escolher no chute. Nesse caso a
// função não mexe em nada e devolve 'ambiguo', pro editor dizer ao
// chefe qual é a situação em vez de desvincular a porta errada.
// ---------------------------------------------------------------

export type ResultadoDesvinculo = 'desfeito' | 'nenhum' | 'ambiguo'

export function desvincularDoOutroLado(idOrigem: string, idDestino: string): ResultadoDesvinculo {
  const destino = lerRascunho(idDestino) ?? salaDaFonte(idDestino)
  const voltam = destino.moveis.filter((m) => m.leva === idOrigem)
  if (voltam.length === 0) return 'nenhum'
  if (voltam.length > 1) return 'ambiguo'

  const alvo = voltam[0].id
  const moveis = destino.moveis.map((m) => {
    if (m.id !== alvo) return m
    const { leva: _desfeito, ...resto } = m
    return resto
  })
  gravarOuLimpar(idDestino, { ...destino, moveis })
  return 'desfeito'
}

// Apaga espelhos criados NESTA sessão em outras salas. É o que faz
// "descartar e voltar à fonte" desfazer a porta inteira, e não só a
// metade que estava na sala aberta.
export function removerEspelhos(criados: { sala: string; id: string }[]): void {
  const porSala = new Map<string, Set<string>>()
  for (const { sala, id } of criados) {
    const ids = porSala.get(sala) ?? new Set<string>()
    ids.add(id)
    porSala.set(sala, ids)
  }

  for (const [idSala, ids] of porSala) {
    const rascunho = lerRascunho(idSala)
    // sem rascunho não há nada nosso pra desfazer: o espelho ou nunca
    // chegou a existir, ou o chefe já gravou aquela sala na fonte — e
    // aí a peça é decisão dele, não lixo da nossa sessão
    if (!rascunho) continue
    const moveis = rascunho.moveis.filter((m) => !ids.has(m.id))
    if (moveis.length === rascunho.moveis.length) continue
    gravarOuLimpar(idSala, { ...rascunho, moveis })
  }
}

// Guarda o rascunho — a menos que ele tenha voltado a ser idêntico à
// fonte, caso em que o certo é não deixar rascunho nenhum. Um rascunho
// igual à fonte não é inofensivo: ele acende "rascunho" no HUD e
// sugere trabalho pendente que não existe.
function gravarOuLimpar(idSala: string, sala: SalaDados): void {
  if (existeSala(idSala) && JSON.stringify(sala) === JSON.stringify(salaDaFonte(idSala))) {
    descartarRascunho(idSala)
    return
  }
  salvarRascunho(idSala, sala)
}
