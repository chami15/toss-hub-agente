# Frontend — Hub de Agentes

Escritório isométrico 2D (PixiJS) onde cada um dos quatro agentes
(Cifra/financeiro, Agenda, Vita/saúde, Norte/projetos) tem uma mesa e
um painel próprio, mais os controles do motor de tick (relógio
simulado, mensagens, configurações) no HUD. Consome só a API do
`backend/` — nenhuma regra de negócio mora aqui.

Identidade visual: redesenho "Console" — superfícies opacas (`--deck`),
cantos retos, tipografia própria, avatares que animam o próprio estado
no crachá. Ver `docs/frontend-design.md` (decisões de UX) e
`docs/guia-tecnico-frontend.md` (arquitetura técnica, geometria
isométrica, o redesenho visual) na raiz do repositório.

## Como subir

Precisa do backend rodando (`../backend/README.md`) antes — o frontend
não funciona sozinho.

```bash
npm install
cp .env.example .env   # aponta VITE_API_URL pro backend; ajuste se a porta for outra
npm run dev            # abre em http://localhost:5173
```

## Comandos

```bash
npm run dev       # servidor de desenvolvimento (Vite + HMR)
npm run build     # typecheck (tsc -b) + build de produção
npm run preview   # serve o build de produção localmente
npm test          # suíte Vitest (dado/matemática — sala, iso, catálogo)
npm run lint      # oxlint
```

## Estrutura

Ver `docs/guia-tecnico-frontend.md` Parte 2 pra estrutura de pastas
comentada e as regras de arquitetura (componente nunca fala direto com
o backend, sala é dado nunca código, etc.). Resumo rápido:

```
src/
  api/          → porta única pro backend, um arquivo por domínio
  types/        → contratos TS espelhando os schemas do backend
  hooks/        → TanStack Query por domínio (= resolvers/ do backend)
  features/
    escritorio/ → o canvas Pixi, HUD, modo de edição, salas
    agentes/    → moldura compartilhada dos painéis, componentes de barra
    financeiro/ → painel do Cifra
    agenda/     → painel da Agenda
    saude/      → painel da Vita
    norte/      → painel do Norte
```

## Modo de edição (tecla `E`)

Arrasta/gira/empilha móveis na cena direto no navegador — nunca edite
`salas/*.json` à mão. Detalhe completo (as três camadas de
persistência, o que cada tecla faz) em `docs/guia-tecnico-frontend.md`
Parte 7.

## Testes

`npm test` roda a suíte Vitest — cobre dado e matemática (coerência das
salas versionadas, ida-e-volta tela↔tabuleiro do arraste, catálogo), não
pixel. Antes de dar qualquer mudança visual por pronta, teste também no
navegador de verdade (Playwright ou manual) e confira o console —
"compilou" não é "testado".
