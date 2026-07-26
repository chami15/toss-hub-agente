import { PASTA_SPRITES, type Direcao } from './sala'

// ---------------------------------------------------------------
// O CATÁLOGO
//
// As 140 peças do pack, agrupadas pra dar pra achar coisa. O
// agrupamento sai do próprio nome do arquivo (kitchen*, lounge*,
// table*, ...), que é como o pack já vem organizado — por isso é
// derivado, e não uma lista escrita na mão que sairia do ar assim que
// o pack mudasse.
// ---------------------------------------------------------------

export interface Categoria {
  id: string
  nome: string
  // prefixos do nome do arquivo que caem nesta categoria
  prefixos: string[]
}

// A ordem aqui é a ordem das abas. A primeira que casar leva a peça,
// então as mais específicas vêm antes das genéricas.
export const CATEGORIAS: Categoria[] = [
  { id: 'trabalho', nome: 'Trabalho', prefixos: ['desk', 'computer', 'laptop', 'chairDesk', 'books', 'cardboard'] },
  { id: 'assentos', nome: 'Assentos', prefixos: ['chair', 'lounge', 'stool', 'bench', 'pillow'] },
  { id: 'mesas', nome: 'Mesas', prefixos: ['table', 'sideTable'] },
  { id: 'guardar', nome: 'Guardar', prefixos: ['bookcase', 'cabinet', 'coatRack'] },
  { id: 'luz', nome: 'Luz', prefixos: ['lamp', 'ceilingFan'] },
  { id: 'verde', nome: 'Plantas', prefixos: ['plant', 'pottedPlant'] },
  { id: 'chao', nome: 'Chão', prefixos: ['rug', 'floor'] },
  { id: 'parede', nome: 'Paredes', prefixos: ['wall', 'doorway', 'paneling', 'stairs'] },
  { id: 'eletro', nome: 'Eletrônicos', prefixos: ['television', 'speaker', 'radio'] },
  { id: 'cozinha', nome: 'Cozinha', prefixos: ['kitchen', 'hood', 'toaster'] },
  { id: 'banho', nome: 'Banheiro', prefixos: ['bathroom', 'bath', 'shower', 'toilet', 'washer', 'dryer'] },
  { id: 'quarto', nome: 'Quarto', prefixos: ['bed'] },
  { id: 'outros', nome: 'Outros', prefixos: [] },
]

// Toda peça do pack. Gerada por scripts/medir-ancoras.py como efeito
// colateral (ancoras.ts tem uma entrada por peça×direção), então aqui
// só listamos os nomes — a fonte da verdade continua sendo a pasta.
export const PECAS: string[] = [
  'bathroomCabinet', 'bathroomCabinetDrawer', 'bathroomMirror', 'bathroomSink',
  'bathroomSinkSquare', 'bathtub', 'bear', 'bedBunk', 'bedDouble', 'bedSingle',
  'bench', 'benchCushion', 'benchCushionLow', 'bookcaseClosed', 'bookcaseClosedDoors',
  'bookcaseClosedWide', 'bookcaseOpen', 'bookcaseOpenLow', 'books', 'cabinetBed',
  'cabinetBedDrawer', 'cabinetBedDrawerTable', 'cabinetTelevision', 'cabinetTelevisionDoors',
  'cardboardBoxClosed', 'cardboardBoxOpen', 'ceilingFan', 'chair', 'chairCushion',
  'chairDesk', 'chairModernCushion', 'chairModernFrameCushion', 'chairRounded',
  'coatRack', 'coatRackStanding', 'computerKeyboard', 'computerMouse', 'computerScreen',
  'desk', 'deskCorner', 'doorway', 'doorwayFront', 'doorwayOpen', 'dryer',
  'floorCorner', 'floorCornerRound', 'floorFull', 'floorHalf', 'hoodLarge', 'hoodModern',
  'kitchenBar', 'kitchenBarEnd', 'kitchenBlender', 'kitchenCabinet',
  'kitchenCabinetCornerInner', 'kitchenCabinetCornerRound', 'kitchenCabinetDrawer',
  'kitchenCabinetUpper', 'kitchenCabinetUpperCorner', 'kitchenCabinetUpperDouble',
  'kitchenCabinetUpperLow', 'kitchenCoffeeMachine', 'kitchenFridge', 'kitchenFridgeBuiltIn',
  'kitchenFridgeLarge', 'kitchenFridgeSmall', 'kitchenMicrowave', 'kitchenSink',
  'kitchenStove', 'kitchenStoveElectric', 'lampRoundFloor', 'lampRoundTable',
  'lampSquareCeiling', 'lampSquareFloor', 'lampSquareTable', 'lampWall', 'laptop',
  'loungeChair', 'loungeChairRelax', 'loungeDesignChair', 'loungeDesignSofa',
  'loungeDesignSofaCorner', 'loungeSofa', 'loungeSofaCorner', 'loungeSofaLong',
  'loungeSofaOttoman', 'paneling', 'pillow', 'pillowBlue', 'pillowBlueLong', 'pillowLong',
  'plantSmall1', 'plantSmall2', 'plantSmall3', 'pottedPlant', 'radio', 'rugDoormat',
  'rugRectangle', 'rugRound', 'rugRounded', 'rugSquare', 'shower', 'showerRound',
  'sideTable', 'sideTableDrawers', 'speaker', 'speakerSmall', 'stairs', 'stairsCorner',
  'stairsOpen', 'stairsOpenSingle', 'stoolBar', 'stoolBarSquare', 'table', 'tableCloth',
  'tableCoffee', 'tableCoffeeGlass', 'tableCoffeeGlassSquare', 'tableCoffeeSquare',
  'tableCross', 'tableCrossCloth', 'tableGlass', 'tableRound', 'televisionAntenna',
  'televisionModern', 'televisionVintage', 'toaster', 'toilet', 'toiletSquare', 'trashcan',
  'wall', 'wallCorner', 'wallCornerRond', 'wallDoorway', 'wallDoorwayWide', 'wallHalf',
  'wallWindow', 'wallWindowSlide', 'washer', 'washerDryerStacked',
]

export function categoriaDe(peca: string): string {
  for (const c of CATEGORIAS) {
    if (c.prefixos.some((p) => peca.startsWith(p))) return c.id
  }
  return 'outros'
}

export function pecasDaCategoria(id: string): string[] {
  return PECAS.filter((p) => categoriaDe(p) === id)
}

// Só as categorias que têm peça — evita aba vazia na interface.
export function categoriasComPecas(): Categoria[] {
  return CATEGORIAS.filter((c) => pecasDaCategoria(c.id).length > 0)
}

// Nome legível: quebra o camelCase do arquivo. `kitchenFridgeLarge`
// vira "kitchen fridge large" — não é tradução, mas é o suficiente
// pra bater o olho e achar, e não exige manter 140 rótulos na mão.
export function rotuloDe(peca: string): string {
  return peca.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase()
}

// A miniatura do catálogo é o próprio PNG — são pequenos (a maior
// peça tem ~140px), então não vale gerar spritesheet nem thumbnail.
export function miniatura(peca: string, direcao: Direcao = 'NE'): string {
  return `${PASTA_SPRITES}/${peca}_${direcao}.png`
}
