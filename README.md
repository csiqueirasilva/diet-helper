# Diet Helper (frontend)

Planejador de dieta 100% frontend em React 19 + Vite. Carrega dados em JSON (public/data) para gerar calendario real, blocos de preparo de 3 dias e lista de compras semanal.

## Rodando
- Instalar deps: `pnpm install`
- Desenvolvimento: `pnpm dev`
- Build: `pnpm build`
- Preview do build: `pnpm preview`

## Dados editaveis
- `public/data/config.json`: datas ancora, frequencias, horizonte.
- `public/data/meal-plan.json`: dias do ciclo e refeicoes por horario.
- `public/data/meals.json`: ingredientes e passos de cada refeicao.

Para publicar no GitHub Pages, ajuste `base` no `vite.config.js` com o nome do repo e suba a pasta `dist/`.
