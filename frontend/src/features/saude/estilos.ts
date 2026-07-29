// Estilos compartilhados pelas telas do painel da Vita. Existem num
// arquivo só porque são SEIS formulários: repetir o objeto de estilo em
// cada um garantiria que uma hora eles ficassem sutilmente diferentes
// entre si (RNF05 pede consistência visual entre os painéis).

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

export const BOTAO_PRINCIPAL: React.CSSProperties = {
  ...BOTAO,
  background: 'rgba(249,115,22,0.18)',
  borderColor: 'rgba(249,115,22,0.5)',
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

export function campoNumero(valor: number | '', aoMudar: (v: number | '') => void) {
  return {
    value: valor,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const bruto = e.target.value
      aoMudar(bruto === '' ? '' : Number(bruto))
    },
  }
}
