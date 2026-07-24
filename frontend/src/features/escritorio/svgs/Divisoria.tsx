// Divisória solta no meio do piso — não vai de ponta a ponta da sala,
// deixando corredores abertos dos dois lados e piso visível na frente
// e atrás dela. É o que dá a sensação de "segundo ambiente lá atrás"
// (igual à referência, que tem uma parede/corredor entre a recepção e
// o salão principal) sem precisar desenhar uma sala em L de verdade.
// Mesma técnica da Parede: clip-path sobre um div do tamanho da sala.
const COR_ESQ = '#7c8e93'
const COR_DIR = '#6f8186'
const RODAPE_ESQ = '#ece4d3'
const RODAPE_DIR = '#ddd5c1'

const CLIP_ESQ = 'polygon(25% 44%, 50% 24%, 50% 32%, 25% 52%)'
const CLIP_DIR = 'polygon(50% 24%, 75% 44%, 75% 52%, 50% 32%)'
const CLIP_RODAPE_ESQ = 'polygon(25% 52%, 50% 32%, 50% 34%, 25% 54%)'
const CLIP_RODAPE_DIR = 'polygon(50% 32%, 75% 52%, 75% 54%, 50% 34%)'

export function Divisoria() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: COR_ESQ, clipPath: CLIP_ESQ }} />
      <div style={{ position: 'absolute', inset: 0, background: COR_DIR, clipPath: CLIP_DIR }} />
      <div style={{ position: 'absolute', inset: 0, background: RODAPE_ESQ, clipPath: CLIP_RODAPE_ESQ }} />
      <div style={{ position: 'absolute', inset: 0, background: RODAPE_DIR, clipPath: CLIP_RODAPE_DIR }} />
    </>
  )
}
