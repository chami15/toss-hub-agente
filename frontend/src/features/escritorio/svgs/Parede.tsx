// As duas paredes de fundo do escritório, estilo Habbo: formam o "V"
// característico (parede esquerda + parede direita se encontrando no
// fundo), cada uma em duas cores (parte de cima + rodapé creme),
// ocupando a tela inteira — sem nenhum fundo preto atrás. Cada parede é
// um paralelogramo recortado via clip-path (CSS) de um div do tamanho
// da sala inteira; não tem forma própria, só a "janela" de recorte.
//
// Cor de cima: um azul-acinzentado que conversa com o cinza do piso.
// Rodapé: off-white creme, como pedido. O lado direito é sempre um tom
// levemente mais escuro que o esquerdo — sugere a luz vindo da esquerda.
const TOPO_ESQ = '#6b7d82'
const TOPO_DIR = '#5f7075'
const RODAPE_ESQ = '#ece4d3'
const RODAPE_DIR = '#ddd5c1'

const CLIP_PAREDE_ESQ = 'polygon(0% 44.4%, 50% 4.4%, 50% 28.9%, 0% 68.9%)'
const CLIP_PAREDE_DIR = 'polygon(50% 4.4%, 100% 44.4%, 100% 68.9%, 50% 28.9%)'
const CLIP_RODAPE_ESQ = 'polygon(0% 63.3%, 50% 23.3%, 50% 28.9%, 0% 68.9%)'
const CLIP_RODAPE_DIR = 'polygon(50% 23.3%, 100% 63.3%, 100% 68.9%, 50% 28.9%)'

export function Parede() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: TOPO_ESQ, clipPath: CLIP_PAREDE_ESQ }} />
      <div style={{ position: 'absolute', inset: 0, background: TOPO_DIR, clipPath: CLIP_PAREDE_DIR }} />
      <div style={{ position: 'absolute', inset: 0, background: RODAPE_ESQ, clipPath: CLIP_RODAPE_ESQ }} />
      <div style={{ position: 'absolute', inset: 0, background: RODAPE_DIR, clipPath: CLIP_RODAPE_DIR }} />
    </>
  )
}
