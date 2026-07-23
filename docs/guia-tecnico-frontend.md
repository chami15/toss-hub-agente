# Guia técnico do frontend (documento vivo)

Equivalente ao `guia-criacao-de-agentes.md`, só que pro frontend:
registra as decisões técnicas de stack, arquitetura e as regras que
valem pra qualquer módulo novo — atualizado a cada decisão nova desse
tipo, não só quando a fundação foi criada.

Processo de trabalho: o chefe cuida do visual/UX (layout, cores,
estilo, o que a tela deve transmitir); a IA cuida da parte técnica
(arquitetura, performance, como o visual vira código) e explica o
porquê de cada escolha. Mesmo modelo de debate-antes-de-codar do
módulo de agentes.

---

## Stack escolhida (e por quê)

| Peça | Escolha | Por quê |
|---|---|---|
| Linguagem | **TypeScript** | Contratos de dado explícitos (equivalente aos schemas Pydantic do backend) — erro de campo errado aparece no editor, não em produção. |
| Build/dev server | **Vite** | Hot reload rápido, é o "uvicorn do front". O CORS do backend já está configurado pra porta padrão dele (5173). |
| UI | **React** | Componentes = funções que descrevem a tela dado um estado. Composição de componentes = composição de funções, mesma lógica que o backend já usa. |
| Estilo | **Tailwind CSS v4** (plugin do Vite) | Classes utilitárias direto no componente, iteração visual rápida. |
| Estado do servidor | **TanStack Query** | Cuida de cache/loading/erro/refetch dos dados vindos da API sozinho — evita reinventar isso na mão. |
| Chamadas HTTP | **axios** | Usado só dentro do `api client`, nunca direto nos componentes. |
| Posicionamento do escritório 2D | **CSS Grid** (DOM+CSS+SVG, sem engine de jogo) | O escritório é uma matriz (linhas × colunas) com zonas fixas — Grid resolve isso nativamente. Canvas/Phaser foi descartado (ver `avaliacao-mvp.md`): sorvedouro de tempo, sem ganho real pra 5-20 mesas fixas. |
| Testes | **Vitest** (unitário/componente) + **Playwright** (E2E, já disponível no ambiente) | Testa comportamento, não pixel — front muda de visual demais pra testar aparência. |

## Estrutura de pastas (camadas, espelhando o backend)

```
frontend/src/
  api/          → porta única pro backend (equivalente a utils/query_executor.py)
  types/        → contratos TS espelhando os schemas do backend (equivalente ao Pydantic)
  hooks/        → lógica reutilizável, nunca o componente falando direto com a API (equivalente a resolvers/)
  components/   → peças de UI GENÉRICAS, usadas em MAIS DE UM módulo (botão, modal, spinner)
  features/     → cada domínio agrupado (escritorio/, financeiro/, agenda/, saude/, norte/, interacao/)
    escritorio/
      components/  → peças específicas do escritório (Mesa, BoxDeMesas, Janela...)
      assets/      → SVGs/imagens do escritório
      layout.ts    → mapeamento mesa -> posição na grade (dado só visual, não vem do banco)
      Escritorio.tsx
```

Regra: componente nunca fala direto com o backend — sempre componente → hook → api client. Mesma disciplina do router → resolver → query_executor.

Regra: `agente.mesa` (campo que já existe no backend, em `GET /agentes`)
é o DADO de qual mesa cada agente ocupa. A posição daquela mesa NA TELA
é um mapeamento que só existe no frontend (`layout.ts`) — dado de
negócio e apresentação visual nunca se misturam.

---

## Regras de performance (anti-lag, anti-bug — valem desde o primeiro componente)

O escritório 2D parece uma cena de jogo, mas tecnicamente continua
sendo uma página web comum: sem loop de física, sem redesenho
constante. As regras abaixo garantem que continue assim conforme o
número de agentes/mesas crescer:

1. **Nunca animar `top`/`left`/`width`/`height`.** Só `transform` e
   `opacity` — são acelerados pela GPU; as outras propriedades forçam
   o navegador a recalcular o layout da página inteira a cada frame.
2. **Isolamento de re-render por componente.** Quando o estado de 1
   agente muda, só a `Mesa` daquele agente redesenha — as outras não
   percebem. Nunca um estado global que force a árvore inteira a
   re-renderizar por causa de 1 mudança pontual.
3. **Zero polling/loop escondido.** Toda atualização de tela nasce de
   uma ação explícita do chefe (via TanStack Query) — nada rodando
   sozinho em segundo plano, nada de `setInterval` disfarçado.
4. **Sempre testar no navegador de verdade antes de considerar
   pronto** (Playwright + olhar console de erro) — nunca "compilou,
   deve estar ok", mesma disciplina de teste real do backend.
5. **Assets otimizados** — imagem/SVG com tamanho de arquivo razoável,
   importados pelo pipeline do Vite (não redimensionados na marra pelo
   navegador).

## Estratégia de assets visuais (escritório 2D)

Decisão: **SVG (vetor) em vez de CSS puro** pra desenhar mesa, cadeira,
monitor, janela — CSS puro (divs com borda/sombra) não chega perto do
nível de detalhe desejado sem parecer "quadradinho".

Ponto de atenção real: geradores de imagem por IA (Gemini, etc.)
majoritariamente produzem **raster** (PNG), não SVG de verdade — ou
seja, pixels, não vetor editável. Isso importa porque:
- Não dá pra recolorir dinamicamente por código (a cor de identidade
  de cada agente teria que vir por CIMA, via CSS — um anel/brilho
  colorido atrás do elemento — nunca dentro da imagem em si).
- Vetor de verdade escala sem perder nitidez; raster pode pixelar se
  ampliado além do tamanho gerado.

Caminhos possíveis pra conseguir SVG de verdade (não só raster),
do mais direto ao mais trabalhoso:
1. **A IA (Claude) escreve o SVG diretamente em código** — geometria
   simples (retângulos, formas), controle total de cor via prop,
   iteração rápida com feedback visual do chefe. Menos "bonito" de
   cara, mas zero gambiarra técnica.
2. **Ferramenta de geração de imagem com saída vetorial de verdade**
   (ex: Recraft.ai, que tem modo explícito de ilustração/ícone em
   SVG) — mais fiel ao estilo desejado, ainda assim vetor real.
3. **Bancos de ícones SVG prontos e licenciados** (ex: downloads SVG
   do Flaticon/Freepik, respeitando a licença de atribuição ou paga).
4. **Vetorizar depois** — gerar o raster no Gemini (bom controle de
   estilo) e passar por um vetorizador (ex: vectorizer.ai) pra virar
   SVG de verdade, com limpeza manual do código gerado.

**Status:** em decisão — ver conversa em andamento pra escolha final.

---

*(Este arquivo cresce conforme novas decisões técnicas do frontend
forem tomadas — não é reescrito do zero a cada atualização.)*
