// Estilos compartilhados pelos painéis de agente. Existem num arquivo só
// porque já são vários formulários em dois domínios: repetir o objeto de
// estilo em cada um garantiria que uma hora ficassem sutilmente
// diferentes entre si (RNF05 pede consistência visual entre os painéis).
//
// O que NÃO mora aqui é a cor de acento — ela é de cada agente (a mesma
// do anel do crachá), e vem por `botaoPrincipal(cor)`.

export const CAMPO: React.CSSProperties = {
  width: '100%',
  background: '#20232a',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 6,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 12,
  padding: '7px 9px',
  boxSizing: 'border-box',
  // sem isto a lista de um <select> abre com fundo branco do sistema,
  // ilegível com texto claro
  colorScheme: 'dark',
}

export const OPCAO: React.CSSProperties = {
  background: '#20232a',
  color: '#e6e1d6',
}

export const ROTULO: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  color: '#8d8779',
  marginBottom: 4,
}

export const BOTAO: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 6,
  color: '#e6e1d6',
  font: 'inherit',
  fontSize: 12,
  padding: '8px 12px',
  cursor: 'pointer',
}

// O botão de ação principal usa a cor do agente dono do painel — é o
// que faz o painel se ler como continuação do crachá que foi clicado.
//
// `border` inteiro de novo (não só `borderColor` por cima do `border`
// de BOTAO): misturar a forma curta com a longa pro mesmo valor é
// exatamente o que o React avisa pra não fazer (falso positivo de
// "removendo borderColor" a cada re-render, porque as duas properties
// batem pela ordem de declaração do objeto, não pela intenção).
export function botaoPrincipal(cor: string): React.CSSProperties {
  return { ...BOTAO, background: `${cor}2e`, border: `1px solid ${cor}80` }
}

export const CARTAO: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 8,
  padding: 12,
}

export const AVISO_ERRO: React.CSSProperties = {
  background: '#f0b7ab',
  color: '#3b1512',
  borderRadius: 6,
  padding: '9px 11px',
  fontSize: 11.5,
  lineHeight: 1.5,
}

export const AVISO_OK: React.CSSProperties = {
  background: 'rgba(74,222,128,0.15)',
  border: '1px solid rgba(74,222,128,0.4)',
  color: '#bbf7d0',
  borderRadius: 6,
  padding: '9px 11px',
  fontSize: 11.5,
  lineHeight: 1.5,
}

export const CORPO: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}
