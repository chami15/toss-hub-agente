// As duas paredes de fundo do escritório, estilo Habbo: formam o "V"
// característico (parede esquerda + parede direita se encontrando no
// fundo), cada uma em duas cores (parte de cima + rodapé creme),
// ocupando a tela inteira — sem nenhum fundo preto atrás. Cada parede é
// um paralelogramo recortado via clip-path (CSS) de um div do tamanho
// da sala inteira; não tem forma própria, só a "janela" de recorte.
//
// Paleta inspirada no lobby clássico do Habbo: parede creme/amanteigada
// com uma faixa fina bordô perto do chão (rodapé), em vez do azul frio
// da versão anterior. Lado direito sempre um tom mais escuro — sugere
// luz vindo da esquerda.
const TOPO_ESQ = '#e6d6a3'
const TOPO_DIR = '#dbc890'
const RODAPE_ESQ = '#6b2020'
const RODAPE_DIR = '#5c1a1a'

// A parte de cima da parede vai do topo ABSOLUTO da tela (0%) até o
// rodapé — sem sobrar nenhuma tira de piso por cima. É o "quadro sem
// moldura": a parede encosta direto no acabamento da tela, não tem
// borda/vão em lugar nenhum.
//
// A parede é baixa (bem "pro fundo") — a linha do piso fica bem mais
// pra cima da tela, deixando a sala bem mais espaçosa/aberta do que a
// primeira versão (que tomava quase 70% da tela).
// Rodapé bem mais fino agora — uma faixa/trim, não uma banda grande
// (igual à referência: o bordô é só um risco perto do chão).
const CLIP_PAREDE_ESQ = 'polygon(0% 0%, 50% 0%, 50% 10%, 0% 50%)'
const CLIP_PAREDE_DIR = 'polygon(50% 0%, 100% 0%, 100% 50%, 50% 10%)'
const CLIP_RODAPE_ESQ = 'polygon(0% 50%, 50% 10%, 50% 12%, 0% 52%)'
const CLIP_RODAPE_DIR = 'polygon(50% 10%, 100% 50%, 100% 52%, 50% 12%)'

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
