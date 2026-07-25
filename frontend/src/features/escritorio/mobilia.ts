// Móveis: o que existe no ambiente e onde. Só dado — nenhum desenho
// aqui. Quem transforma isso em sprite na tela é cena.ts.

// As 4 rotações em que cada peça do pack isométrico vem. O nome do
// arquivo segue `<peca>_<direcao>.png` (ex.: `desk_NE.png`).
export type Direcao = 'NE' | 'NW' | 'SE' | 'SW'

export interface Movel {
  // nome base do arquivo, sem a direção nem a extensão
  peca: string
  direcao: Direcao
  // canto do móvel na grade (o tile que ele ocupa; se ocupar mais de
  // um, este é o tile de referência, o mais ao fundo)
  coluna: number
  linha: number
  // quantos tiles a peça ocupa — usado pro z-ordering e, depois, pra
  // saber onde não pode passar/encaixar outra coisa
  largura?: number
  profundidade?: number
  // empilhamento: 0 = no chão, 1 = em cima de um móvel de 1 andar
  altura?: number
}

// Caminho do PNG de uma peça. Os arquivos ficam em `public/figures/`,
// servidos por caminho direto (convenção do Vite pra asset estático
// que não passa pelo bundler).
export function caminhoDoSprite(movel: Movel): string {
  return `/figures/${movel.peca}_${movel.direcao}.png`
}

// Onde a peça deve ser ancorada dentro do próprio PNG. Os renders
// isométricos do Kenney têm o objeto centralizado na horizontal e
// apoiado perto da base — então (0.5, 1) põe o "pé" do móvel no ponto
// do tile. Calibrado depois de ver os arquivos de verdade.
export const ANCORA_SPRITE = { x: 0.5, y: 1 }

// Deslocamento fino em pixels, aplicado depois da âncora. Serve pra
// acertar peça a peça sem mexer na âncora global.
export const AJUSTE_SPRITE = { x: 0, y: 0 }

// Por enquanto vazio: as peças entram aqui assim que o pack estiver
// no repo e eu souber os nomes reais dos arquivos.
export const MOVEIS: Movel[] = []
