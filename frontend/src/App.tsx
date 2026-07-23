import { useAgentes } from './hooks/useAgentes'

// PROVA DE ENCANAMENTO — não é o design final. Só confirma que
// front -> backend -> Postgres -> volta funciona ponta a ponta.
// O escritório 2D de verdade substitui isto.
function App() {
  const { data: agentes, isLoading, error } = useAgentes()

  if (isLoading) return <p style={{ padding: 24 }}>Carregando agentes...</p>
  if (error) {
    return (
      <p style={{ padding: 24, color: 'crimson' }}>
        Erro ao buscar agentes: {(error as Error).message}. O backend está
        rodando em {import.meta.env.VITE_API_URL}?
      </p>
    )
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Hub de Agentes — encanamento OK</h1>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', gap: 16 }}>
        {agentes?.map((agente) => (
          <li
            key={agente.id}
            style={{
              border: `2px solid ${agente.avatar_config.cor}`,
              borderRadius: 8,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32 }}>{agente.avatar_config.rosto}</div>
            <strong>{agente.nome}</strong>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              mesa {agente.mesa} · {agente.estado}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
