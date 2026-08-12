// Balão que aparece ao passar o mouse numa porta válida, fora do modo
// de edição. x/y já vêm em coordenada de tela (edicao.ts calcula via
// sprite.getGlobalPosition()) — aqui só posiciona por cima do sprite.

const MONO = 'var(--fonte-display), ui-monospace, SFMono-Regular, Menlo, monospace'

interface Props {
  popup: { texto: string; x: number; y: number } | null
}

export function PopupPorta({ popup }: Props) {
  if (!popup) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: popup.x,
        top: popup.y,
        transform: 'translate(-50%, -140%)',
        fontFamily: MONO,
        fontSize: 11.5,
        color: '#0d1117',
        background: '#e6e1d6',
        borderRadius: 5,
        padding: '5px 10px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        zIndex: 40,
      }}
    >
      {popup.texto}
    </div>
  )
}
