import type { Agente } from '../../../types/agente'

// A identidade visual do agente que fica EM CIMA da cadeira. O emoji
// (rosto) é temporário — depois vira um ícone SVG (Flaticon). A cor de
// identidade (avatar_config.cor) entra como anel por CIMA, nunca dentro
// da ilustração da cadeira (que é neutra) — assim recolorir por agente
// é só CSS, sem duplicar asset.
export function Avatar({ agente }: { agente: Agente }) {
  const cor = agente.avatar_config.cor
  return (
    <div
      title={`${agente.nome} — ${agente.estado}`}
      className="flex items-center justify-center rounded-full bg-white select-none"
      style={{
        width: 40,
        height: 40,
        border: `3px solid ${cor}`,
        boxShadow: `0 0 0 4px ${cor}22`,
        fontSize: 20,
        lineHeight: 1,
      }}
    >
      {agente.avatar_config.rosto}
    </div>
  )
}
