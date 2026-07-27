// Defeitos do JSON da sala que NÃO impedem o app de rodar, e por isso
// mesmo são perigosos: a sala carrega parecendo certa e só está
// sutilmente errada. Aviso no console não serve — console se ignora.
// Isto fica na tela até o chefe fechar.
//
// Não corrige nada: adivinhar a intenção de um dado torto é como se
// cria um problema pior que o original.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

interface Props {
  problemas: string[]
  aoFechar: () => void
}

export function PainelProblemas({ problemas, aoFechar }: Props) {
  if (problemas.length === 0) return null

  return (
    <div
      role="alert"
      style={{
        position: 'absolute',
        left: '50%',
        top: 16,
        transform: 'translateX(-50%)',
        maxWidth: 620,
        fontFamily: MONO,
        fontSize: 12,
        color: '#3b1512',
        background: '#f0b7ab',
        border: '1px solid #b0492f',
        borderRadius: 8,
        padding: '12px 14px',
        boxShadow: '0 8px 26px rgba(0,0,0,0.4)',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <strong style={{ letterSpacing: '0.04em' }}>
          {problemas.length === 1
            ? 'a sala tem 1 problema'
            : `a sala tem ${problemas.length} problemas`}
        </strong>
        <button
          onClick={aoFechar}
          aria-label="fechar aviso"
          style={{
            background: 'none',
            border: 'none',
            color: '#7a2d1e',
            font: 'inherit',
            fontSize: 15,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <ul style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
        {problemas.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <p style={{ margin: '10px 0 0', fontSize: 11, opacity: 0.85 }}>
        A sala continua funcionando, mas alguma coisa vai estar no lugar errado.
        Isso só acontece editando o JSON à mão — o modo de edição não produz
        nenhum desses.
      </p>
    </div>
  )
}
