// Room — os dados da sala (dimensões, altura de parede, janelas). É só
// dado (um objeto simples, poderia vir de JSON), não tem nada de
// desenho aqui — quem lê isso é o Renderer.
export interface Janela {
  // posição da janela ao longo da parede de trás (0 = canto esquerdo
  // da parede, RoomConfig.colunas = canto direito), e largura em tiles.
  coluna: number
  largura: number
}

export interface RoomConfig {
  colunas: number
  linhas: number
  alturaParede: number
  janelas: Janela[]
}

export const SALA: RoomConfig = {
  colunas: 9,
  linhas: 9,
  alturaParede: 140,
  janelas: [
    { coluna: 1.5, largura: 1.4 },
    { coluna: 5.5, largura: 1.4 },
  ],
}
