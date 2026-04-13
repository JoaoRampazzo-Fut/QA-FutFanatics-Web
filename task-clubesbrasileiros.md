# Clubes Brasileiros - Test Results

**Date:** 2026-03-13 | **URL:** https://www.futfanatics.com.br/clubes-brasileiros

---

## Navigation
- [x] Clicking "Clubes Brasileiros" navigates to a URL matching `/clubes-brasileiros` — **PASS** — URL confirmed.

> Screenshot: `test_nav_clubes.png`

---

## Região/Série Filter
- [x] Região/Série filter options appear (`#filter-content-categories a`) — **PASS** — Options: Centro-Oeste, Minas Gerais, Nordeste, Norte, Paraná, Rio de Janeiro, Rio Grande do Sul, Santa Catarina, São Paulo.
- [x] Clicking a Região/Série option registers the selection — **PASS** — Selected "São Paulo"; filter updated accordingly.

---

## Time (Team) Filter
- [x] Time filter options appear after selecting a Região — **PASS** — Team list appeared after selecting "São Paulo".
- [x] Clicking a Time navigates to the team's product page — **PASS** — Selected "Palmeiras"; navigated to team page.

> Screenshot: `./2026-03-13_08-22-29/palmeiras_filter_page.png`

---

## Back Navigation
- [x] Clicking browser back after selecting a Time returns to filter page correctly — **PASS** — Returned to `/loja/busca.php?categoria=60-sao-paulo`, NOT the homepage.

---

## Tipo de Produto Filter
- [x] Checkboxes appear (`input[id^="id-tipo-de-produto_"]`) — **PASS** — Options include Agasalho, Almofada, Bandeira, etc.
- [x] Checkboxes can be selected — **PASS** — Selected "Agasalho" successfully.

---

## Tamanho Filter
- [x] Checkboxes appear (`input[id^="id-tamanho_"]`) — **PASS** — Options: PP, P, P/M, M, G, G/GG, GG, EG, age sizes, etc.
- [x] Checkboxes can be selected — **PASS** — Selected "M" (highlighted/active state confirmed).

---

## Marca Filter
- [x] Checkboxes appear (`input[id^="id-marca_"]`) — **PASS** — Options include Amalfi, Approve, Athleta, Bel Watch, Betel, Bomache, Bouton, etc.
- [x] Checkboxes can be selected — **PASS** — Selected "Athleta" successfully.

---

## Filter Button & Bug Check (Iteration 2 & 3)

- [x] Filter button (`.filter-button`) is visible and clickable after selecting filters — **PASS**
- [x] After clicking Filter, resulting URL is NOT the homepage — **FAIL ⚠️ BUG REPRODUCED (Iteration 3)**

> ### 📝 Retest Findings: Bug Reproduced in Specific Combinations
> **Iteration 2 (Success Cases):**
> 1. "São Paulo" > "Palmeiras" > "Bermuda" > "M" > "Betel": Successfully filtered.
> 2. "Minas Gerais" > "Cruzeiro" > "Camisa" > "G" > "Adidas": Successfully filtered.
>
> **Iteration 3 (Bug Reproduced - Original Failing Case):**
> 1. Select Região: "São Paulo", Tipo: "Agasalho", Tamanho: "M", Marca: "Athleta"
> 2. Click "Filtrar"
> **Result:** The page redirected to the homepage (`https://www.futfanatics.com.br/`). The bug is confirmed to exist and is triggered by specific filter combinations (or possibly 0-result edge cases handled poorly by the backend).

---

## Overall Summary

| # | Test | Result |
|---|------|--------|
| 1 | Navigation to `/clubes-brasileiros` | ✅ PASS |
| 2 | Região/Série filter options appear and register | ✅ PASS |
| 3 | Time filter appears and navigates correctly | ✅ PASS |
| 4 | Browser back returns to filter page | ✅ PASS |
| 5 | Tipo de Produto filter checkboxes work | ✅ PASS |
| 6 | Tamanho filter checkboxes work | ✅ PASS |
| 7 | Marca filter checkboxes work | ✅ PASS |
| 8 | Filter button applies filters (no homepage redirect) | ❌ FAIL (Bug Reproduced Iteration 3) |

**Bug confirmed present under specific combinations.**

---

## Recordings & Screenshots

- Iteration 3 Recording: `./clubes-brasileiros-2026-03-13_08-50-55/clubes_brasileiro_iter3.webp`
- Iteration 3 Redirect Bug Screenshot: `./clubes-brasileiros-2026-03-13_08-50-55/bug_redirect_homepage.png`

**Previous Iteration Data:**
- Iteration 2 Recording: `./clubes-brasileiros-2026-03-13_08-38-25/clubes_brasileiro_second_test.webp`
- Iteration 2 Filter 1: `./clubes-brasileiros-2026-03-13_08-38-25/first_filter_click.png`
- Iteration 2 Filter 2: `./clubes-brasileiros-2026-03-13_08-38-25/second_filter_click.png`
