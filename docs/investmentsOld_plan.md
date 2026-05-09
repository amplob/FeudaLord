# Disseny d'Investment — FeudaLord

## Context

- Substituir `minTurn` per `requiresIncome` — la carta surt quan ja tens prou yield/torn total (inversions + events).
- **No hi ha dependencies de carta**. Les cadenes queden implícites pels requisits d'income (si una carta requereix +0.5🌾/torn, en pràctica necessites haver construït primer una carta de menjar).
- **Sense tiers**: una sola llista ordenada de cartes per progressió.
- **Progressió ROI**: cartes inicials ROI ~40 → cartes finals ROI 18-20 (les inversions són més eficients com més avancem).
- Almenys una combinació de cartes garanteix els 4 recursos (💰🌾👥👑) en cada moment del joc. Una sola carta endgame pot donar els 4 recursos sola.
- Noms de cartes poden canviar. Totes les cartes existents migren al nou sistema.
- Si un event afecta el yield, **el comptem** per al càlcul d'unlock.

---

## Mecànica de desbloqueig (única condició)

```js
requiresIncome: { gold?, food?, manpower?, favor? }
// La carta surt quan el income passiu (inversions + events) >= tots els valors
// Camp buit = disponible des del primer torn
```

---

## Valors de referència (g-eq)

| Recurs | g-eq | 
|--------|------|
| 💰 Or | 1 |
| 🌾 Menjar | 0.5 |
| 👥 Manpower | 3 |
| 👑 Favor | 2 |

ROI = cost en g-eq ÷ yield en g-eq/torn

---

## Filosofia de costos

- **Early** (sense requisit o gold/food baix): cost en 💰+🌾 — recursos disponibles des del inici.
- **Mid** (gold≥1 o food≥1): s'afegeix 👥 com a cost (treball qualificat, soldats).
- **Late** (gold≥2+): s'afegeix 👑 com a cost (patronatge reial, llicències, capital polític).
- **Endgame**: els 4 recursos al cost.
- Cada carta: **mínim 2 recursos** al cost, sempre temàticament coherents.

---

## Llista ordenada de cartes (early → late)

| # | Carta | Icon | requiresIncome | Yield/torn | Cost | g-eq | g-eq/t | ROI |
|---|-------|------|----------------|-----------|------|------|--------|-----|
| 1 | Hire Fishermen | 🎣 | — | +0.5🌾 | 6💰+8🌾 | 10 | 0.25 | 40 |
| 2 | Open a Toll Gate | 🛤️ | — | +0.5💰 | 16💰+8🌾 | 20 | 0.5 | 40 |
| 3 | Erect a Shrine | ⛩️ | — | +0.25👑 | 12💰+16🌾 | 20 | 0.5 | 40 |
| 4 | Build a Training Ground | 🏋️ | {gold: 0.5} | +1👥 | 80💰+60🌾 | 110 | 3 | 37 |
| 5 | Raise a Cattle Farm | 🐄 | {food: 0.5} | +1🌾 | 10💰+16🌾 | 18 | 0.5 | 36 |
| 6 | Open a Tavern | 🍺 | {gold: 0.5} | +0.5💰+0.5👑 | 32💰+36🌾 | 50 | 1.5 | 33 |
| 7 | Commission Fishing Boats | 🚣 | {food: 0.5} | +1.5🌾 | 14💰+16🌾 | 22 | 0.75 | 29 |
| 8 | Build a Granary | 🌾🏚️ | {food: 0.5} | +1.5🌾 | 12💰+16🌾+1👑 | 22 | 0.75 | 29 |
| 9 | Build a Watermill | 🏞️ | {food: 1} | +2🌾 | 20💰+20🌾 | 30 | 1 | 30 |
| 10 | Cultivate Herb Gardens | 🌿 | {food: 1} | +1🌾+0.5👑 | 24💰+24🌾+2👑 | 40 | 1.5 | 27 |
| 11 | Open a Goldmine | ⛏️ | {gold: 1} | +2💰 | 20💰+20🌾+4👥 | 52 | 2 | 26 |
| 12 | Open a Market | 🏪 | {gold: 1, food: 0.5} | +1💰+1🌾 | 26💰+10🌾+4👑 | 39 | 1.5 | 26 |
| 13 | Establish an Apothecary | 🧪 | {gold: 1, food: 0.5} | +0.5👥+0.5👑 | 35💰+20🌾+2👑 | 49 | 2.5 | 20 |
| 14 | Build a Hunting Lodge | 🏹 | {gold: 1, manpower: 0.5} | +1🌾+0.5👥 | 30💰+20🌾+2👥 | 46 | 2 | 23 |
| 15 | Establish a Monastery | 📿 | {gold: 1, favor: 0.25} | +1👑 | 30💰+20🌾+1👥+3👑 | 49 | 2 | 24.5 |
| 16 | Plant an Orchard | 🍎 | {food: 2} | +3🌾 | 30💰+25🌾+2👥 | 48.5 | 1.5 | 32 |
| 17 | Build a Watchtower | 🗼 | {gold: 1, manpower: 0.5} | +0.5👥+0.5👑 | 32💰+18🌾+3👥+2👑 | 54 | 2.5 | 21.6 |
| 18 | Build a Dock | ⚓ | {food: 1.5} | +2🌾+1💰+0.5👥 | 40💰+25🌾+2👥+3👑 | 64.5 | 3.5 | 18.4 |
| 19 | Open a Stone Quarry | ⛰️ | {gold: 2} | +2.5💰 | 30💰+20🌾+4👥 | 52 | 2.5 | 20.8 |
| 20 | Open a Gem Mine | 💎 | {gold: 2} | +2.5💰 | 25💰+10🌾+4👥+4👑 | 50 | 2.5 | 20 |
| 21 | Plant Royal Gardens | 🌺 | {favor: 1} | +1👑+0.5🌾 | 22💰+18🌾+2👥+4👑 | 45 | 2.25 | 20 |
| 22 | Build an Armory | 🗡️ | {gold: 2, manpower: 1} | +1👥+0.5💰 | 40💰+20🌾+3👥+4👑 | 67 | 3.5 | 19.1 |
| 23 | Build a Cathedral | ⛪ | {gold: 2, favor: 1} | +1.5👑 | 35💰+20🌾+3👥+5👑 | 64 | 3 | 21.3 |
| 24 | Commission Naval Fleet | ⛵ | {gold: 3, manpower: 1.5} | +1👥+1💰 | 50💰+20🌾+3👥+3👑 | 75 | 4 | 18.75 |
| 25 | Build a Harbour | 🌊⚓ | {gold: 2, food: 2, manpower: 0.5} | +1.5💰+1.5🌾+1👥 | 65💰+25🌾+3👥+3👑 | 92.5 | 5.25 | 17.6 |
| 26 | Build Alchemist's Tower | ⚗️ | {gold: 3, favor: 1.5} | +1.5👑+1💰 | 50💰+15🌾+3👥+5👑 | 76.5 | 4 | 19.1 |
| 27 | Open a Royal Mint | 🪙 | {gold: 4, manpower: 1} | +3💰 | 35💰+10🌾+4👥+5👑 | 62 | 3 | 20.7 |
| 28 | Raise a Royal Keep 🔒 | 🏯 | {gold: 4, food: 4, favor: 1} | +1👥+1👑 | 60💰+25🌾+4👥+5👑 | 94.5 | 5 | 18.9 |
| 29 | The Grand Citadel 🔒 | 🏰 | {gold: 5, food: 5, manpower: 1.5, favor: 1.5} | +2💰+2🌾+1👥+1👑 | 90💰+35🌾+6👥+5👑 | 135.5 | 8 | 16.9 |

🔒 = unique (maxInstances: 1)

---

## Lògica temàtica dels costos (guia de disseny)

| Recurs al cost | Significat temàtic |
|---------------|-------------------|
| 💰 Or | Materials de construcció, salaris, equipament |
| 🌾 Menjar | Sustent dels treballadors, provisions, ofrenes, bestiar |
| 👥 Manpower | Mà d'obra qualificada, soldats, artesans |
| 👑 Favor | Llicències reials, suport eclesiàstic, xarxes comercials |

---

## Cobertura de tots els recursos en cada moment

| Fase | Cartes disponibles | Combinació que cobreix els 4 recursos |
|------|-------------------|--------------------------------------|
| Inicial (sense income) | #1–3 + Training Ground | Toll Gate(💰) + Fishermen(🌾) + Training Ground(👥) + Shrine(👑) |
| Mig | #9–15 | Watermill(🌾) + Goldmine(💰) + Training Ground(👥) + Monastery(👑) |
| Alt | #16–23 | Orchard(🌾) + Stone Quarry(💰) + Armory(👥) + Cathedral(👑) |
| Endgame (1 carta) | #29 | **Grand Citadel sol** → +2💰+2🌾+1👥+1👑/torn ✅ |

---

## Resum: cartes existents vs noves

| Estat | Cartes |
|-------|--------|
| ✅ Existents (mantenir, recalibrar) | Watermill, Goldmine, Cathedral, Market, Stone Quarry, Royal Keep, Fishing Boats |
| 🆕 Noves | Fishermen, Toll Gate, Shrine, Training Ground, Cattle Farm, Tavern, Granary, Herb Gardens, Hunting Lodge, Monastery, Orchard, Watchtower, Dock, Gem Mine, Royal Gardens, Armory, Naval Fleet, Harbour, Alchemist's Tower, Royal Mint, Grand Citadel, **Apothecary** |
| ❌ Eliminades | Clear Fields, Militia, Pottery Workshop, Salt Mine, Vineyard, Barracks, Trade Caravan, Bards, Court Jesters, Astronomy Tower |

---

## Fitxers a modificar

| Fitxer | Canvi |
|--------|-------|
| `js/data/cards-investment.js` | Reescriure llista; afegir `requiresIncome`; eliminar `minTurn`; eliminar `dependencies` |
| `js/cardSystem.js` | Afegir `meetsIncomeRequirements()`; eliminar check de minTurn; eliminar check de dependencies |
| `js/ui.js` | Si cal, mostrar el requisit d'income a la targeta |

---

## Lògica d'unlock (única condició a part de cost/maxInstances/blockedBy)

```js
function meetsIncomeRequirements(card, passiveIncome) {
    const req = card.requiresIncome ?? {};
    return Object.entries(req).every(
        ([resource, amount]) => (passiveIncome[resource] ?? 0) >= amount
    );
}
// passiveIncome = inversions actives + effectes d'events actius
```

---

## Verificació

1. ROI #1 (Fishermen) = 40, ROI #29 (Grand Citadel) = 17 — progressió correcta
2. Cartes #1–3 disponibles des del torn 1 (sense requisit d'income)
3. Construir Toll Gate + Fishermen + Training Ground + Shrine → els 4 recursos garantits
4. Verificar que Fishing Boats (#7) no surt fins que tens +0.5🌾/torn (Fishermen activa)
5. Verificar que Grand Citadel (#29) requereix income alt en els 4 recursos
6. Events que afecten income compten per al desbloqueig
7. Granary (#8) requereix 1👑 al cost → incentiva construir Shrine aviat (subtext estratègic)
