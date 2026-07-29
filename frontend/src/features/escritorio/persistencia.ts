import type { SalaDados } from './sala-dados'

// ---------------------------------------------------------------
// DESCOBERTA AUTOMÁTICA DAS SALAS
//
// import.meta.glob é recurso do Vite: lê a pasta em BUILD TIME e gera
// os imports de cada arquivo que casar o padrão. Arquivo novo em
// salas/ aparece sozinho — não existe uma lista pra manter em dia em
// lugar nenhum (e "esqueci de registrar a sala nova" nem chega a ser
// um jeito de errar).
//
// O "id" de uma sala é o nome do arquivo sem `.json` — é o mesmo nome
// que o formulário de criação usa pra escrever o arquivo, e o mesmo
// que a rota /__salas/<id> do plugin do Vite espera.
// ---------------------------------------------------------------

const MODULOS_SALAS = import.meta.glob('./salas/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, SalaDados>

function idDoCaminho(caminho: string): string {
  return (caminho.split('/').pop() ?? caminho).replace(/\.json$/, '')
}

const SALAS_DA_FONTE: Record<string, SalaDados> = Object.fromEntries(
  Object.entries(MODULOS_SALAS).map(([caminho, dados]) => [idDoCaminho(caminho), dados]),
)

function clonar(sala: SalaDados): SalaDados {
  return JSON.parse(JSON.stringify(sala)) as SalaDados
}

// Todos os ids descobertos, em ordem alfabética (pro menu entre salas
// não pular de posição toda vez que alguém adiciona um arquivo).
export function idsDasSalas(): string[] {
  return Object.keys(SALAS_DA_FONTE).sort()
}

export function existeSala(id: string): boolean {
  return id in SALAS_DA_FONTE
}

export function salaDaFonte(id: string): SalaDados {
  const dados = SALAS_DA_FONTE[id]
  if (!dados) throw new Error(`sala "${id}" não existe em salas/`)
  return clonar(dados)
}

// Todas de uma vez, pra conferência entre salas (agente único no
// conjunto inteiro, porta apontando pra sala que existe) — vem depois.
export function todasAsSalasDaFonte(): Record<string, SalaDados> {
  return Object.fromEntries(Object.entries(SALAS_DA_FONTE).map(([id, s]) => [id, clonar(s)]))
}

// ---------------------------------------------------------------
// AS TRÊS CAMADAS (por sala)
//
//   fonte    — o JSON versionado no git. O layout oficial.
//   rascunho — localStorage. Sobrevive ao reload, só nesta máquina.
//   sessão   — só na memória da Maquete: some ao recarregar.
//
// Cada sala tem seu PRÓPRIO rascunho. Sem isso, editar a cozinha e
// recarregar traria o rascunho da cozinha pra dentro do escritório —
// as duas competindo pela mesma chave.
//
// A regra que importa continua a mesma: o código NUNCA adivinha se
// uma mudança é definitiva. Quem decide é o chefe, apertando um botão.
// ---------------------------------------------------------------

// A versão entra na CHAVE, não no conteúdo: um rascunho de formato
// antigo simplesmente não é encontrado, em vez de lido e interpretado
// errado. Suba este número sempre que SalaDados mudar de forma
// incompatível — aqui já subiu uma vez, quando a paleta passou a ser
// obrigatória (passo 1) e o formato ganhou multi-sala (este passo).
const VERSAO_RASCUNHO = 'v2'

function chaveRascunho(idSala: string): string {
  return `escritorio:rascunho:${VERSAO_RASCUNHO}:${idSala}`
}

export type Camada = 'fonte' | 'rascunho'

export function lerRascunho(idSala: string): SalaDados | null {
  try {
    const bruto = localStorage.getItem(chaveRascunho(idSala))
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

export function temRascunho(idSala: string): boolean {
  return lerRascunho(idSala) !== null
}

export function salvarRascunho(idSala: string, sala: SalaDados): void {
  localStorage.setItem(chaveRascunho(idSala), JSON.stringify(sala))
}

export function descartarRascunho(idSala: string): void {
  localStorage.removeItem(chaveRascunho(idSala))
}

// Como todasAsSalasDaFonte, mas cada sala usa o PRÓPRIO rascunho (se
// houver um, neste navegador) em vez da fonte — a visão mais atual
// disponível sem precisar abrir a sala. É o que permite saber se um
// agente já está em outro lugar (pra não deixar duplicar) sem exigir
// que o chefe tenha ido lá conferir na mão.
export function todasAsSalasComRascunho(): Record<string, SalaDados> {
  const todas = todasAsSalasDaFonte()
  for (const id of Object.keys(todas)) {
    const rascunho = lerRascunho(id)
    if (rascunho) todas[id] = rascunho
  }
  return todas
}

// ---------------------------------------------------------------
// QUAL SALA ESTÁ ABERTA
//
// Persistido pra sobreviver ao reload — sem isso, gravar na fonte
// (que recarrega a página) sempre voltaria pra primeira sala.
// ---------------------------------------------------------------

const CHAVE_SALA_ATUAL = 'escritorio:sala-atual'

export function idSalaAtual(): string {
  const ids = idsDasSalas()
  const salvo = localStorage.getItem(CHAVE_SALA_ATUAL)
  if (salvo && ids.includes(salvo)) return salvo
  // sala default: "escritorio" se existir (é a original), senão a
  // primeira em ordem alfabética
  return ids.includes('escritorio') ? 'escritorio' : ids[0]
}

export function definirSalaAtual(id: string): void {
  localStorage.setItem(CHAVE_SALA_ATUAL, id)
}

// --- Sair da página: nosso ou do chefe? ------------------------------
//
// Trocar de sala, gravar na fonte e descartar rascunho TODOS recarregam
// a página. Sem distinguir isso de um fechar-a-aba, o aviso de "você tem
// alterações" apareceria a cada troca de sala — e um aviso que aparece
// à toa é um aviso que se aprende a ignorar.
//
// Quem recarrega de propósito passa por aqui e marca a intenção antes.

let intencional = false

export function saidaEhIntencional(): boolean {
  return intencional
}

export function recarregarDeProposito(): void {
  intencional = true
  window.location.reload()
}

// O rascunho tem prioridade: se existe, foi o chefe que pediu pra
// guardar. A camada fica visível no HUD pra nunca haver dúvida sobre
// o que está na tela.
export function carregarSala(): { sala: SalaDados; camada: Camada; idSala: string } {
  const idSala = idSalaAtual()
  const rascunho = lerRascunho(idSala)
  if (rascunho) return { sala: rascunho, camada: 'rascunho', idSala }
  return { sala: salaDaFonte(idSala), camada: 'fonte', idSala }
}

// --- Gravar na fonte ---------------------------------------------
//
// O navegador não escreve em disco, mas o servidor de dev do Vite
// escreve (ver vite-plugin-salas.ts). Só existe em `npm run dev`: num
// site publicado a rota não existe, então o botão some.

const AVISO_POS_RELOAD = 'escritorio:gravou'

export function podeGravarNaFonte(): boolean {
  return import.meta.env.DEV
}

export async function gravarNaFonte(idSala: string, sala: SalaDados): Promise<void> {
  const resposta = await fetch(`/__salas/${idSala}`, {
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
  descartarRascunho(idSala)
}

// Exclui o arquivo da sala. O servidor recusa (409) se for a última
// sala restante ou se ela tiver algum agente dentro. Se der certo, o
// servidor já limpa a porta pendurada na FONTE de qualquer outra sala
// que levava pra esta (vite-plugin-salas.ts) — mas um RASCUNHO local
// (só existe neste navegador) o servidor não enxerga, então essa
// limpeza é feita aqui, senão um "gravar" futuro naquele rascunho
// ressuscitaria a porta que devia ter sumido.
export async function excluirSalaNaFonte(idSala: string): Promise<void> {
  const resposta = await fetch(`/__salas/${idSala}`, { method: 'DELETE' })
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null
    throw new Error(corpo?.erro ?? `servidor respondeu ${resposta.status}`)
  }
  descartarRascunho(idSala)

  for (const outroId of idsDasSalas()) {
    if (outroId === idSala) continue
    const rascunho = lerRascunho(outroId)
    if (!rascunho) continue
    let mudou = false
    const moveis = rascunho.moveis.map((m) => {
      if (m.leva !== idSala) return m
      mudou = true
      const { leva: _descartado, ...resto } = m
      return resto
    })
    if (mudou) salvarRascunho(outroId, { ...rascunho, moveis })
  }
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
