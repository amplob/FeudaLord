# Disseny d'Investment — FeudaLord

## Context

- Substituir `minTurn` per `requiresIncome` — la carta surt quan ja tens prou yield/torn total (inversions + events).
- **No hi ha dependencies de carta**. Les cadenes queden implícites pels requisits d'income.
- **Sense tiers explícits**: una sola llista ordenada per progressió (ROI decreixent).
- **Progressió ROI**: cartes inicials ROI 40 → cartes finals ROI 20.
- Almenys una combinació de cartes garanteix els 4 recursos (💰🌾👥👑) en cada moment del joc.
- Si un event afecta el yield, **el comptem** per al càlcul d'unlock.
- Una vegada desbloquejada, una carta queda desbloquejada (els assets són teus). Però la **visibilitat al moment d'oferir una nova investment** sí es recalcula.
- És correcte tenir múltiples nivells de la mateixa carta (la raresa al deck ja limita l'apilament).

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

- **Or 💰**: materials de construcció, eines, salaris.
- **Menjar 🌾**: només quan és **temàticament justificat** — alimentar treballadors durant la construcció (cost menor, 6-16🌾) o consum directe del projecte (cost major, 30-80🌾: ofrenes, alimentar bestiar, alimentar trainees).
- **Manpower 👥**: només quan el projecte requereix mà d'obra qualificada o especialitzada (mines, construcció pesada, militar, oficis).
- **Favor 👑**: llicències reials, suport eclesiàstic. Reservat per cartes mid-late.

**No tota inversió necessita menjar.** Mines, drassanes, mercats, talaies — el menjar dels treballadors va via salaris (or), no com a cost directe.

**Distribució de costos targeted** (suma total entre les 17 cartes, en g-eq):
- Or: ~33%
- Menjar: ~23%
- Manpower: ~33%
- Favor: ~10% (baix, perquè el favor és l'objectiu del joc)

---

## Llista ordenada de cartes (ROI decreixent)

| # | Carta | Icon | requiresIncome | Yield/torn | Cost | g-eq | ROI |
|---|-------|------|----------------|-----------|------|------|-----|
| 1 | Hire Fishermen | 🎣 | — | +0.5🌾 | 8💰+4🌾 | 10 | 40 |
| 2 | Open a Toll Gate | 🛤️ | — | +0.5💰 | 16💰+8🌾 | 20 | 40 |
| 3 | Erect a Shrine | ⛩️ | — | +0.25👑 | 40🌾 | 20 | 40 |
| 4 | Build a Training Ground | 🏋️ | — | +0.25👥 | 14💰+32🌾 | 30 | 40 |
| 5 | Plant an Orchard | 🍎 | {food: 0.5} | +1🌾 | 2💰+32🌾 | 18 | 36 |
| 6 | Open a Trading Square | 🏛️ | {gold: 0.5} | +0.5💰+0.5🌾 | 12💰+6🌾+3👥 | 24 | 32 |
| 7 | Open a Tavern | 🍺 | {gold: 0.5} | +0.5💰+0.5👑 | 5💰+50🌾+5👥 | 45 | 30 |
| 8 | Build a Watermill | 🏞️ | {food: 1} | +2🌾 | 12💰+8🌾+4👥 | 28 | 28 |
| 9 | Open a Goldmine | ⛏️ | {gold: 1} | +2💰 | 24💰+12🌾+8👥 | 54 | 27 |
| 10 | Open a Market | 🏪 | {gold: 1, favor: 0.5} | +0.5💰+0.5🌾+0.25👥+0.25👑 | 14💰+12🌾+8👥+4👑 | 52 | 26 |
| 11 | Build a Hunting Lodge | 🏹 | {gold: 1, manpower: 0.5} | +1🌾+0.5👥 | 20💰+12🌾+8👥 | 50 | 25 |
| 12 | Raise a Cattle Farm | 🐄 | {food: 1.5} | +3🌾 | 5💰+40🌾+4👥 | 37 | 24.7 |
| 13 | Found a Sanatorium | 🏥 | {gold: 1, favor: 0.5} | +0.5👥+1👑 | 24💰+12🌾+8👥+13👑 | 80 | 22.9 |
| 14 | Build a Watchtower | 🗼 | {gold: 1, manpower: 0.5} | +0.5👥+0.5👑 | 14💰+12🌾+8👥+6👑 | 56 | 22.4 |
| 15 | Build a Dock | ⚓ | {food: 1.5} | +2🌾+1💰+0.5👥 | 30💰+16🌾+8👥+6👑 | 74 | 21.1 |
| 16 | Open a Stone Quarry | ⛰️ | {gold: 2} | +2.5💰 | 24💰+12🌾+7👥 | 51 | 20.4 |
| 17 | Build a Cathedral | ⛪ | {gold: 2, favor: 1} | +1.5👑 | 18💰+12🌾+8👥+6👑 | 60 | 20 |

**Notes per carta:**
- **Training Ground** (#4): yield petit (+0.25👥/t = 1 manpower cada 4 torns) per mantenir ROI 40 a un cost accessible des del torn 1. Permet escalar amb múltiples instàncies.
- **Trading Square** (#6): versió petita del Market (només 💰+🌾).
- **Market** (#10): versió completa que produeix els 4 recursos en quantitats petites.
- **Sanatorium** (#13): fusió de Monastery + Herb Gardens. Tema medicinal — la salut produeix manpower i favor.

---

## Lògica temàtica dels costos

| Recurs al cost | Significat temàtic | Exemples on aplica fortament |
|----------------|--------------------|------------------------------|
| 💰 Or | Materials, eines, salaris | Totes les cartes |
| 🌾 Menjar (gran) | Consum directe del projecte | Shrine (ofrenes), Training Ground (alimentar trainees), Tavern (cuina), Cattle Farm (alimentar bestiar), Orchard (plantons) |
| 🌾 Menjar (petit, 6-16) | Provisions per als constructors | Cartes amb construcció pesada |
| 👥 Manpower | Mà d'obra qualificada/especialitzada | Mines, Quarry, Hunting Lodge, militar, construccions grans |
| 👑 Favor | Llicències reials, suport eclesiàstic | Market, Sanatorium, Watchtower, Dock, Cathedral |

**Cartes SENSE manpower al cost:** #1-5 (totes tier-0 i Orchard) — els primers cards són accessibles sense haver-se construït Training Ground.

---

## Cobertura de tots els recursos en cada moment

| Fase | Combinació mínima per cobrir 💰🌾👥👑 |
|------|---------------------------------------|
| Inicial (sense income) | Toll Gate (💰) + Fishermen (🌾) + Training Ground (👥) + Shrine (👑) |
| Mig | Goldmine (💰) + Watermill (🌾) + Hunting Lodge (👥) + Sanatorium (👑) |
| Tardà | Stone Quarry (💰) + Cattle Farm (🌾) + Watchtower (👥) + Cathedral (👑) |

No hi ha cap carta endgame única que cobreixi els 4 recursos sola — la victòria es manté per acumulació de favor (500 = Duke).

---

## Cartes existents vs noves

| Estat | Cartes |
|-------|--------|
| ✅ Existents (mantenir, recalibrar) | Watermill, Goldmine, Cathedral, Market, Stone Quarry |
| 🆕 Noves | Fishermen, Toll Gate, Shrine, Training Ground, Orchard, Tavern, Trading Square, Hunting Lodge, Cattle Farm, Sanatorium, Watchtower, Dock |
| ❌ Eliminades | Clear Fields, Militia, Pottery Workshop, Salt Mine, Vineyard, Barracks, Trade Caravan, Bards, Court Jesters, Astronomy Tower, Fishing Boats, Granary, Apothecary, Gem Mine, Royal Gardens, Harbour, Naval Fleet, Armory, Royal Mint, Royal Keep, Alchemist's Tower, Grand Citadel, Monastery, Herb Gardens (fusionades a Sanatorium) |

---

## Fitxers a modificar

| Fitxer | Canvi |
|--------|-------|
| `js/data/cards-investment.js` | Reescriure llista; afegir `requiresIncome`; eliminar `minTurn`; eliminar `dependencies` |
| `js/cardSystem.js` | Afegir `meetsIncomeRequirements()`; eliminar check de minTurn; eliminar check de dependencies; recalcular visibilitat a cada nova oferta d'investment |
| `js/ui.js` | Si cal, mostrar el requisit d'income a la targeta |

---

## Lògica d'unlock

```js
function meetsIncomeRequirements(card, passiveIncome) {
    const req = card.requiresIncome ?? {};
    return Object.entries(req).every(
        ([resource, amount]) => (passiveIncome[resource] ?? 0) >= amount
    );
}
// passiveIncome = inversions actives + effectes d'events actius
```

**Important:** la visibilitat es recalcula cada vegada que apareix una nova oportunitat d'investment. Una carta ja construïda continua produint encara que el income baixi per sota del requisit (l'asset és teu).

---

## Distribució de costos verificada

Suma total de cost entre les 17 cartes:

| Recurs | Unitats | g-eq | Quota |
|--------|---------|------|-------|
| 💰 Or | 242 | 242 | **34%** |
| 🌾 Menjar | 320 | 160 | **23%** |
| 👥 Manpower | 79 | 237 | **33%** |
| 👑 Favor | 70 | 70 | **10%** |
| **Total** | | **709** | 100% |

Or i Manpower pràcticament iguals (34/33%); Menjar a 23%; Favor baix (10%) com s'ha decidit (el favor és l'objectiu del joc, no una despesa freqüent).

---

## Verificació

1. ROI sequence monotònicament decreixent: 40, 40, 40, 40, 36, 32, 30, 28, 27, 26, 25, 24.7, 22.9, 22.4, 21.1, 20.4, 20 ✓
2. Cartes #1-4 disponibles des del torn 1 (sense `requiresIncome`) ✓
3. Training Ground accessible aviat (cost 30 g-eq, yield petit però productiu) ✓
4. Cobertura dels 4 recursos garantida en cada fase ✓
5. Or, Menjar i Manpower amb quotes de cost similars (33/23/33%) ✓
6. Favor amb quota baixa (10%) ✓
7. Menjar només present a cartes on és temàticament coherent ✓
8. Fishermen, Toll Gate, Shrine sense cost de manpower (manpower no disponible al torn 1) ✓
