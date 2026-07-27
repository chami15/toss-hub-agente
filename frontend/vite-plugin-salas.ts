import { readFile, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import type { Plugin } from 'vite'
import { conferirSala, type SalaConferivel } from './src/features/escritorio/sala-conferir.ts'
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
        if (req.method !== 'POST') return next()

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
