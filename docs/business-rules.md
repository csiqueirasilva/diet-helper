# Regras de negocio e dados

## Objetivos
- Cozinhar so no **domingo** e na **quarta**.
- Compras 1x por semana, voltadas para aquela semana (domingo→sabado) e pensando no ano inteiro (52 semanas).
- Datas reais, sem plano ficticio: escolha a data de domingo e gere o horizonte desejado (default 60 dias).

## Entidades dos JSONs
- `config.json`: `startDate` (um domingo real), `horizonDays` (ex.: 60), `shoppingFrequencyDays` (7), `shoppingAnchorDate`, `timezone`.
- `meals.json`: refeicoes/componentes com `ingredients` por porcao (quantidades para compra/preparo).
- `meal-plan.json`: plano semanal fixo com marcador `week-protein` e rotacao de proteinas para os domingos.

## Regras principais
1. **Domingo**: prepara proteina da semana (varia), arroz ate quarta almoco, legumes ate quarta almoco, molho de tomate base, macarrao pre-cozido para quarta em diante, mise en place congelado (cebola/alho/pimentao/cheiro-verde/tomate opcional).
2. **Quarta**: prepara frango base (unica proteina da parte facil) e ovos cozidos (8–12). Nao faz legumes apos quarta.
3. **Semana fixa**: mesmo roteiro de refeicoes domingo→sabado; muda apenas a proteina do domingo (rotacao de 4 variacoes). Se passar da 4a semana, roda a lista de novo; fallback simples.
4. **Calendario real**: selecione o domingo inicial no app para mapear semanas reais (use o timezone configurado).
5. **Compras semanais**: soma ingredientes de domingo→sabado da semana atual (resolvida pelo marcador `week-protein`).
6. **Coerencia**: todos os `mealId` usados nos slots precisam existir em `meals.json`. `week-protein` e resolvido para a proteina da semana calculada (rotacao + fallback).

## Dicas de edicao
- Altere `startDate` no `config.json` para o domingo real em que quer iniciar (o app recalcula tudo).
- Ajuste `horizonDays` se quiser ver mais/menos semanas.
- Para mudar quantidades, ajuste `servings` nos slots do `meal-plan.json` ou os ingredientes por porcao em `meals.json`.
- Para trocar a proteina de uma semana, altere a `proteinRotation` ou o `fallbackProteinId` em `meal-plan.json` (e cadastre a proteina em `meals.json`).

## Futuras extensoes
- Alternar semana passada/seguinte para gerar lista de compras dinamica.
- Exportar lista de compras (CSV/print).
- Preferencias em `localStorage` (data escolhida, semana atual).
