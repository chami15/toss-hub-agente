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

// A parte de cima da parede vai do topo ABSOLUTO da tela (0%) até o
// rodapé — sem sobrar nenhuma tira de piso por cima. É o "quadro sem
// moldura": a parede encosta direto no acabamento da tela, não tem
// borda/vão em lugar nenhum.
//
// A parede é baixa (bem "pro fundo") — a linha do piso fica bem mais
// pra cima da tela, deixando a sala bem mais espaçosa/aberta do que a
// primeira versão (que tomava quase 70% da tela).
const CLIP_PAREDE_ESQ = 'polygon(0% 0%, 50% 0%, 50% 12%, 0% 52%)'
const CLIP_PAREDE_DIR = 'polygon(50% 0%, 100% 0%, 100% 52%, 50% 12%)'
const CLIP_RODAPE_ESQ = 'polygon(0% 46.4%, 50% 6.4%, 50% 12%, 0% 52%)'
const CLIP_RODAPE_DIR = 'polygon(50% 6.4%, 100% 46.4%, 100% 52%, 50% 12%)'

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
