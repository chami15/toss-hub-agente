import type { Direcao } from './sala'
import { novoId, type MovelSala, type SalaDados } from './sala-dados'
import { lerRascunho, salaDaFonte, salvarRascunho } from './persistencia'

// ---------------------------------------------------------------
// ESPELHO DA PORTA
//
// Quando o chefe atribui `leva` a uma peça na sala A, a sala B (o
// destino) ganha uma peça correspondente — sem isso, toda porta nova
// deixaria a sala de destino sem volta, a menos que o chefe entrasse
// no modo de edição LÁ e criasse a porta na mão.
//
// O espelhamento tem DUAS partes, e as duas importam:
//   1. os EIXOS trocam (coluna da origem → linha do destino), que é o
//      que faz a porta reaparecer do lado correspondente e não no mesmo
//      lado;
//   2. a posição é PROPORCIONAL ao tamanho de cada sala (fração do
//      caminho no eixo), não uma coordenada copiada — assim funciona
//      não importa o quanto A e B forem diferentes de tamanho, e o
//      chefe continua livre pra arrastar a porta de origem pra
//      qualquer lugar, sem posição fixa nenhuma.
//
// Depois de criado, o espelho é um móvel independente: mexer na porta
// de A não move a de B. As duas só continuam ligadas pelo `leva` de
// cada uma apontando pra sala da outra.
// ---------------------------------------------------------------

// Espelha a direção como se a sala fosse vista de fora: troca só o
// N/S, mantém o L/O (NW → SW, SE → NE, ...).
const INVERTER_DIRECAO: Record<Direcao, Direcao> = {
  NE: 'SE',
  SE: 'NE',
  NW: 'SW',
  SW: 'NW',
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
export function criarPortaEspelhada(
  idOrigem: string,
  salaOrigem: Pick<SalaDados, 'colunas' | 'linhas'>,
  movel: MovelSala,
  idDestino: string,
): void {
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
}
