import { readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import type { Plugin } from 'vite'
import {
  conferirConjuntoDeSalas,
  conferirSala,
  type SalaConferivel,
  type SalaConferivelComNome,
} from './src/features/escritorio/sala-conferir.ts'
import { AGENTES } from './src/features/escritorio/agentes.ts'

// ---------------------------------------------------------------
// GRAVAR A SALA NA FONTE (só em desenvolvimento)
//
// O navegador não escreve em disco — mas o servidor de dev do Vite
// escreve. Este plugin abre uma rota local que recebe o JSON da sala
// montada no modo de edição e grava em src/features/escritorio/salas/.
// É o que fecha o ciclo: o chefe mobilia, aperta "gravar", e o arquivo
// versionado muda. Sem copiar e colar, sem passar por mim.
//
// `apply: 'serve'` faz o plugin existir SÓ no `npm run dev`. No build
// de produção ele não é incluído, então não há como um site publicado
// escrever arquivo nenhum — a fronteira é estrutural, não uma checagem
// que dá pra esquecer.
// ---------------------------------------------------------------

const ROTA = '/__salas/'
const PASTA = 'src/features/escritorio/salas'

// nome de sala é usado pra montar caminho de arquivo: sem barra, sem
// ponto, sem nada que escape da pasta
const NOME_VALIDO = /^[a-z0-9-]{1,40}$/

function lerCorpo(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((ok, erro) => {
    const partes: Buffer[] = []
    let total = 0
    req.on('data', (parte: Buffer) => {
      total += parte.length
      // uma sala é da ordem de alguns KB; teto pra não engolir um
      // corpo gigante por acidente
      if (total > 2_000_000) {
        erro(new Error('corpo grande demais'))
        return
      }
      partes.push(parte)
    })
    req.on('end', () => ok(Buffer.concat(partes).toString('utf8')))
    req.on('error', erro)
  })
}

interface SalaRecebida {
  nome?: unknown
  colunas?: unknown
  linhas?: unknown
  moveis?: unknown
}

// Lê todo arquivo de salas/ menos o que está sendo gravado/excluído
// agora (esse entra na conferência com o payload NOVO, não o velho
// que ainda está em disco). Usado tanto pra recusar um conflito entre
// salas quanto pra limpar porta pendurada depois de uma exclusão.
async function lerOutrasSalas(
  pastaSalas: string,
  exceto: string,
): Promise<Record<string, SalaConferivelComNome>> {
  const arquivos = await readdir(pastaSalas).catch(() => [])
  const outras: Record<string, SalaConferivelComNome> = {}
  for (const arquivo of arquivos) {
    if (!arquivo.endsWith('.json')) continue
    const id = arquivo.replace(/\.json$/, '')
    if (id === exceto) continue
    const conteudo = await readFile(resolve(pastaSalas, arquivo), 'utf8').catch(() => null)
    if (conteudo === null) continue
    try {
      outras[id] = JSON.parse(conteudo) as SalaConferivelComNome
    } catch {
      // arquivo ilegível não entra na conferência — não é problema
      // que esta rota resolve, e travar a gravação/exclusão de OUTRA
      // sala por causa disso seria pior que o defeito original
    }
  }
  return outras
}

// Valida o suficiente pra não gravar lixo por cima de um arquivo bom.
// Não é validação de esquema completa — é a barreira contra o caso
// real: um POST malformado destruir a sala versionada.
function pareceSala(dado: SalaRecebida): boolean {
  return (
    typeof dado === 'object' &&
    dado !== null &&
    typeof dado.nome === 'string' &&
    typeof dado.colunas === 'number' &&
    typeof dado.linhas === 'number' &&
    Array.isArray(dado.moveis) &&
    dado.moveis.every(
      (m: unknown) =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as { id?: unknown }).id === 'string' &&
        typeof (m as { peca?: unknown }).peca === 'string' &&
        typeof (m as { coluna?: unknown }).coluna === 'number' &&
        typeof (m as { linha?: unknown }).linha === 'number',
    )
  )
}

export function pluginSalas(): Plugin {
  return {
    name: 'salas-gravar-na-fonte',
    apply: 'serve',

    configureServer(server) {
      const pastaSalas = resolve(server.config.root, PASTA)

      server.middlewares.use(ROTA, async (req, res, next) => {
        if (req.method !== 'POST' && req.method !== 'DELETE') return next()

        const responder = (status: number, corpo: Record<string, unknown>) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(corpo))
        }

        // req.url aqui já vem sem o prefixo da rota
        const nome = (req.url ?? '').replace(/^\//, '').split('?')[0]
        if (!NOME_VALIDO.test(nome)) {
          responder(400, { erro: 'nome de sala inválido' })
          return
        }

        const destino = resolve(pastaSalas, `${nome}.json`)
        // cinto e suspensório: mesmo com o nome validado, confere que o
        // caminho final não escapou da pasta
        if (!destino.startsWith(pastaSalas + sep)) {
          responder(400, { erro: 'caminho fora da pasta de salas' })
          return
        }

        if (req.method === 'DELETE') {
          try {
            const existente = await readFile(destino, 'utf8').catch(() => null)
            if (existente === null) {
              responder(404, { erro: 'sala não existe' })
              return
            }

            // não pode ficar sem nenhuma sala — sem isso o app não
            // teria mais o que carregar
            const arquivos = (await readdir(pastaSalas)).filter((f) => f.endsWith('.json'))
            if (arquivos.length <= 1) {
              responder(409, { erro: 'não dá pra excluir a última sala' })
              return
            }

            // guarda básica: não apaga sala com agente dentro.
            const sala = JSON.parse(existente) as { moveis?: Array<{ agente?: unknown }> }
            const ocupada = (sala.moveis ?? []).some((m) => typeof m.agente === 'string')
            if (ocupada) {
              responder(409, { erro: 'sala tem agente dentro — desvincule antes de excluir' })
              return
            }

            await unlink(destino)

            // limpa porta pendurada: qualquer OUTRA sala que tinha
            // peça levando pra esta perde só o campo `leva` — a peça
            // continua ali, vira decoração comum, deixa de ser botão
            const outras = await lerOutrasSalas(pastaSalas, nome)
            for (const [id, outraSala] of Object.entries(outras)) {
              const moveis = Array.isArray(outraSala.moveis) ? outraSala.moveis : []
              let mudou = false
              const moveisLimpos = moveis.map((m) => {
                if (m.leva === nome) {
                  mudou = true
                  const { leva: _descartado, ...resto } = m
                  return resto
                }
                return m
              })
              if (mudou) {
                const atualizada = { ...outraSala, moveis: moveisLimpos }
                await writeFile(
                  resolve(pastaSalas, `${id}.json`),
                  JSON.stringify(atualizada, null, 2) + '\n',
                  'utf8',
                )
                server.config.logger.info(`  porta pendurada limpa: ${PASTA}/${id}.json`, {
                  timestamp: true,
                })
              }
            }

            server.config.logger.info(`  sala excluída: ${PASTA}/${nome}.json`, {
              timestamp: true,
            })
            responder(200, { ok: true })
          } catch (e) {
            responder(500, { erro: e instanceof Error ? e.message : 'falha ao excluir' })
          }
          return
        }

        try {
          const bruto = await lerCorpo(req)
          const sala = JSON.parse(bruto) as SalaRecebida
          if (!pareceSala(sala)) {
            responder(400, { erro: 'isso não parece uma sala' })
            return
          }

          // A barreira que interessa: os defeitos que não quebram nada
          // na hora — id repetido, `sobre` apontando pra peça que não
          // existe, agente desconhecido — não podem entrar no arquivo
          // versionado. Uma vez gravados, viram problema de outro dia,
          // sem ninguém lembrar de onde vieram.
          const defeitos = conferirSala(
            sala as unknown as SalaConferivel,
            AGENTES.map((a) => a.id),
          )
          if (defeitos.length > 0) {
            server.config.logger.warn(
              `  gravação recusada (${nome}): ${defeitos.join(' | ')}`,
              { timestamp: true },
            )
            responder(422, { erro: `sala inconsistente — ${defeitos.join('; ')}` })
            return
          }

          // A sala sozinha está ok — falta conferir contra as OUTRAS:
          // nome duplicado, agente já usado alhures, porta levando pra
          // sala que não existe. Sem isso, editar a Sala A e gravar
          // poderia introduzir um agente que já está na Sala B sem
          // ninguém perceber até abrir a B.
          const outras = await lerOutrasSalas(pastaSalas, nome)
          const conjunto = { ...outras, [nome]: sala as SalaConferivelComNome }
          const defeitosConjunto = conferirConjuntoDeSalas(conjunto)
          if (defeitosConjunto.length > 0) {
            server.config.logger.warn(
              `  gravação recusada (${nome}): ${defeitosConjunto.join(' | ')}`,
              { timestamp: true },
            )
            responder(422, { erro: `conflito com outra sala — ${defeitosConjunto.join('; ')}` })
            return
          }

          // só grava se mudou — evita disparar HMR à toa quando o
          // chefe aperta "gravar" duas vezes
          const novo = JSON.stringify(sala, null, 2) + '\n'
          const atual = await readFile(destino, 'utf8').catch(() => null)
          if (atual === novo) {
            responder(200, { ok: true, mudou: false })
            return
          }

          await writeFile(destino, novo, 'utf8')
          server.config.logger.info(
            `  sala gravada: ${PASTA}/${nome}.json (${(sala.moveis as unknown[]).length} móveis)`,
            { timestamp: true },
          )
          responder(200, { ok: true, mudou: true })
        } catch (e) {
          responder(500, { erro: e instanceof Error ? e.message : 'falha ao gravar' })
        }
      })
    },
  }
}
