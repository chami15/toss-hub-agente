import salaFonte from './salas/escritorio.json'
import type { SalaDados } from './sala-dados'

// ---------------------------------------------------------------
// AS TRÊS CAMADAS
//
//   fonte    — o JSON versionado no git. O layout oficial.
//   rascunho — localStorage. Sobrevive ao reload, só nesta máquina.
//   sessão   — só na memória da Maquete: some ao recarregar.
//
// A regra que importa: o código NUNCA adivinha se uma mudança é
// definitiva. Quem decide é o chefe, apertando um botão — errar pra
// "permanente" é caro demais pra deixar por conta de heurística.
// ---------------------------------------------------------------

const CHAVE_RASCUNHO = 'escritorio:rascunho'

export type Camada = 'fonte' | 'rascunho'

function clonar(sala: SalaDados): SalaDados {
  return JSON.parse(JSON.stringify(sala)) as SalaDados
}

export function salaDaFonte(): SalaDados {
  return clonar(salaFonte as SalaDados)
}

export function lerRascunho(): SalaDados | null {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO)
    if (!bruto) return null
    const sala = JSON.parse(bruto) as SalaDados
    // rascunho corrompido não pode derrubar o app — melhor cair na
    // fonte e seguir do que não abrir
    if (!Array.isArray(sala?.moveis)) return null
    return sala
  } catch {
    return null
  }
}

export function temRascunho(): boolean {
  return lerRascunho() !== null
}

export function salvarRascunho(sala: SalaDados): void {
  localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(sala))
}

export function descartarRascunho(): void {
  localStorage.removeItem(CHAVE_RASCUNHO)
}

// O rascunho tem prioridade: se existe, foi o chefe que pediu pra
// guardar. A camada fica visível no HUD pra nunca haver dúvida sobre
// o que está na tela.
export function carregarSala(): { sala: SalaDados; camada: Camada } {
  const rascunho = lerRascunho()
  if (rascunho) return { sala: rascunho, camada: 'rascunho' }
  return { sala: salaDaFonte(), camada: 'fonte' }
}
