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

// --- Gravar na fonte ---------------------------------------------
//
// O navegador não escreve em disco, mas o servidor de dev do Vite
// escreve (ver vite-plugin-salas.ts). Só existe em `npm run dev`: num
// site publicado a rota não existe, então o botão some.

const NOME_SALA = 'escritorio'
const AVISO_POS_RELOAD = 'escritorio:gravou'

export function podeGravarNaFonte(): boolean {
  return import.meta.env.DEV
}

export async function gravarNaFonte(sala: SalaDados): Promise<void> {
  const resposta = await fetch(`/__salas/${NOME_SALA}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sala),
  })
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null
    throw new Error(corpo?.erro ?? `servidor respondeu ${resposta.status}`)
  }
  // gravou na fonte = o rascunho virou oficial, não há mais o que
  // guardar à parte. Sem isso o rascunho continuaria tendo prioridade
  // no carregamento e esconderia a fonte que acabou de ser escrita.
  descartarRascunho()
}

// Gravar altera um arquivo dentro de src/, então o Vite recarrega a
// página sozinho (HMR) — e o toast morreria junto. Deixamos o recado
// na sessão pra ele reaparecer do outro lado do reload.
export function marcarQueGravou(): void {
  sessionStorage.setItem(AVISO_POS_RELOAD, '1')
}

export function consumirAvisoDeGravacao(): boolean {
  const tem = sessionStorage.getItem(AVISO_POS_RELOAD) === '1'
  if (tem) sessionStorage.removeItem(AVISO_POS_RELOAD)
  return tem
}
