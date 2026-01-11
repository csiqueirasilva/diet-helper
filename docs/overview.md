# Diet Helper - Visao geral da implementacao

Aplicativo 100% frontend feito com Vite + React 19 para planejar refeicoes, lista de compras semanal e preparos fixos (domingo e quarta). Dados vivem em JSONs no diretorio `public/data`, facilitando edicoes futuras.

## Stack e estrutura
- Vite + React 19 + JSX (sem backend).
- Dados carregados em runtime via fetch dos arquivos em `public/data` (`config.json`, `meal-plan.json`, `meals.json`).
- Logica de calendario: datas reais calculadas a partir de `startDate` do config (um domingo) e entradas do usuario (respeitando timezone do config).
- Construcao visual: CSS proprio em `src/index.css` e `src/App.css`.

## Fluxo de dados
1. `config.json` define data do domingo inicial, horizonte (ex.: 60 dias) e compras semanais.
2. `meals.json` lista componentes/refeicoes com ingredientes por porcao.
3. `meal-plan.json` traz o roteiro fixo domingo→sabado com marcador `week-protein` e rotacao de proteinas para os domingos.
4. A tela converte o plano em datas reais, mostra preparos (domingo/quarta), calendario semanal/30+ dias e lista de compras da semana atual.

## Comandos principais (pnpm)
- `pnpm install` (ja executado na base).
- `pnpm dev` para desenvolver.
- `pnpm build` para gerar `dist/`.
- `pnpm preview` para conferir o build local.

## Dicas para GitHub Pages
- Ajuste `base` em `vite.config.js` com o nome do repositorio (ex.: `base: '/diet-helper/'`).
- Rode `pnpm build` e publique o conteudo de `dist/` no Pages (branch `gh-pages` ou `/docs`).
- Como os dados estao em `public/data`, basta editar esses JSONs e rebuildar para refletir alteracoes.

## Pastas relevantes
- `src/App.jsx`: tela principal, calendario semanal/30+ dias, compras semanais e preparos.
- `src/App.css` e `src/index.css`: tema e layout.
- `public/data/*.json`: fonte da verdade das refeicoes e planos.
- `docs/`: regras de negocio e instrucoes (este arquivo e `business-rules.md`).
