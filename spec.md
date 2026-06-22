# Deck Optimizer — Spec

## Overview
A browser-based web application for optimizing Yu-Gi-Oh! deck ratios through Monte Carlo hand simulation. Users define a deck list, categorize cards, set hand-quality criteria, and run simulations to find the optimal card ratios.

## Tech Stack
- **React + Vite** (browser app, no server needed)
- **Tailwind CSS** (styling)
- **Recharts** (charts for simulation results)
- **Zustand** (global state for deck, criteria, results)

## Core Concepts

### Card Categories
Each card has one or more categories. The built-in categories are:
- **Starter** — cards that begin your combo (e.g., search cards, openers)
- **Extender** — cards that extend an established combo
- **Non-Engine** — hand traps, counters, non-combo utility
- **Brick** — cards that clog the hand and hurt consistency
- **Custom** — user-defined category (multiple allowed; user provides a name)

A card may belong to multiple categories simultaneously (e.g., a card that is both a Starter and an Extender). All base categories are always active.

### Conditional Categorization
A card's effective category set can expand based on the composition of the hand it appears in. Each card may have any number of conditional rules of the form:

> "If the rest of this hand contains [≥/≤ N] [cards of category X / copies of card Y], then this card also counts as [category Z]."

Rules:
- Conditions are evaluated against **other cards in the hand** (a card never satisfies its own condition).
- Other cards are evaluated using their **base categories only** — conditional grants are not chained.
- Multiple conditions on a single card are independent; each fires or not on its own.
- Granted categories stack on top of base categories to form the card's **effective categories** for that hand.

Example: *Noble Knight Medraut* has base category Brick, with a conditional rule "if hand has ≥1 Starter → also count as Starter." In hands containing another Starter, Medraut's effective categories are {Brick, Starter}; in other hands, only {Brick}.

### Deck Constraints
- Total deck size: user-defined, typically 40–60 cards
- Cards have a name, copy count (1–3), one or more base categories, and zero or more conditional rules
- Going-first hand = 5 cards; going-second hand = 6 cards (configurable per simulation run)

## Features

### 1. Deck Builder
- **Manual entry**: type card name, set count (1–3), assign an initial category
- **Import**: click "Import List" to open the import modal, which supports:
  - **Browse file**: pick a `.json` saved deck or a `.txt`/`.ydk` plain-text file from disk
  - **Paste**: paste a deck list directly into the textarea
  - Plain-text format: `3 Card Name` per line; imported cards default to Non-Engine
  - JSON deck files: full fidelity restore (see Save/Load below)
  - When adding a plain-text import to an existing deck, choose "Add to existing" or "Replace deck"
- Card list displayed as a table; each row shows all base-category chips inline
- **⚙ Card config modal**: click the gear icon on any card to:
  - Toggle base categories on/off (at least one must remain)
  - Add, edit, or remove conditional rules
- Cards with active conditionals show a ⚡N badge indicating the number of rules
- Running total of copies per base category (a card with multiple base categories contributes to each) and overall deck size

#### Save / Load
- **Save Deck** — downloads `deck.json` containing the full deck state: card names, counts, all base categories, all conditional rules, and custom category names. Card session-IDs are stripped; the format is human-readable JSON.
- **Load** — loading a `.json` file in the import modal auto-detects it as a saved deck, shows a confirmation preview, and replaces the current deck atomically (cards + custom categories).
- **Export .txt** — downloads a plain-text list (`3 Card Name` per line) for use with other tools (EDOPro, etc.). Does not preserve categories or conditionals.

#### Save file format
```json
{
  "version": 1,
  "customCategories": ["Noble Knight"],
  "cards": [
    {
      "name": "Noble Knight Medraut",
      "count": 3,
      "categories": ["Brick"],
      "conditionals": [
        {
          "id": "...",
          "conditionType": "category",
          "conditionTarget": "Starter",
          "conditionOp": "gte",
          "conditionValue": 1,
          "grantCategories": ["Starter"]
        }
      ]
    }
  ]
}
```

### 2. Hand Criteria
- Define what counts as a "good hand" using simple count-based rules
- Rule types:
  - A specific **card** appears at least / at most N times in hand
  - A specific **category** appears at least / at most N times in hand — evaluated against each card's **effective categories** (base + any conditionals that fired)
- Rules combined with AND / OR logic per criteria set
- Multiple named criteria sets can be defined (e.g., "Combo Hand", "Brick Hand")
  - Each runs independently; all are tracked per simulation
- Designed to support more complex pattern matching in future iterations

### 3. Simulation
- Draw N = **10,000** random 5-card (or 6-card) hands from the deck
- For each hand, effective categories are computed per card before any criterion is evaluated
- Reports per criterion:
  - % of hands that match
  - Wilson score confidence interval (95%, ±)
- Additional stats:
  - Average copies of each **effective** category per hand (reflects conditional upgrades)
  - Per-card frequency in opening hands
- Results shown as bar charts and a summary table

### 4. Ratio Optimizer
- User marks which cards are **variable** (can change count) and sets their min/max range (e.g., 1–3)
- Optimizer exhaustively tests all valid combinations that keep total deck size fixed
- For each combination, runs a full simulation (10,000 hands)
- Ranks combinations by score on the selected criterion (e.g., maximize "Combo Hand" %)
- Shows top 10 combinations in a ranked table with deltas vs current deck
- Option to **apply** a suggested combination to the Deck Builder

## UI Layout
Four tabs (linear workflow but freely navigable):

1. **Deck** — Deck Builder (import + card list + category assignment)
2. **Criteria** — Hand Criteria rule builder
3. **Simulate** — Run simulation, view results and charts
4. **Optimize** — Mark variable cards, run optimizer, view ranked results

## Out of Scope (v1)
- Card database / autocomplete (card names are free text)
- Ruling logic or card effect simulation (purely statistical hand drawing)
- Multi-hand combo sequencing
- Online saving / user accounts
