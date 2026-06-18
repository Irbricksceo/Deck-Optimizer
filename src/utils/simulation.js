/**
 * Expands a deck card list into a flat array of card objects (one entry per copy).
 * cards: [{ id, name, count, categories, conditionals }]
 */
export function expandDeck(cards) {
  const deck = []
  for (const card of cards) {
    for (let i = 0; i < card.count; i++) {
      deck.push({
        id: card.id,
        name: card.name,
        categories: card.categories,
        conditionals: card.conditionals ?? [],
      })
    }
  }
  return deck
}

/** Fisher-Yates shuffle (in-place) */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Given a drawn hand, computes effective categories for each card.
 * Conditionals are evaluated against the OTHER cards in the hand (base categories only),
 * so a card never triggers its own condition.
 */
export function computeEffectiveCategories(hand) {
  return hand.map((card, idx) => {
    const effective = new Set(card.categories)
    const others = hand.filter((_, i) => i !== idx)

    for (const cond of card.conditionals) {
      const count =
        cond.conditionType === 'card'
          ? others.filter((c) => c.id === cond.conditionTarget).length
          : others.filter((c) => c.categories.includes(cond.conditionTarget)).length

      const met =
        cond.conditionOp === 'gte'
          ? count >= cond.conditionValue
          : count <= cond.conditionValue

      if (met) {
        for (const cat of cond.grantCategories) effective.add(cat)
      }
    }

    return { ...card, effectiveCategories: [...effective] }
  })
}

/**
 * Evaluates a single hand against a single criterion.
 * Expects hand cards to have effectiveCategories set (from computeEffectiveCategories).
 * criterion: { rules: [{ type, target, op, value }], logic: 'AND'|'OR' }
 */
export function evaluateHand(hand, criterion) {
  if (!criterion.rules.length) return false

  const results = criterion.rules.map((rule) => {
    const count =
      rule.type === 'card'
        ? hand.filter((c) => c.id === rule.target).length
        : hand.filter((c) => (c.effectiveCategories ?? c.categories).includes(rule.target)).length

    return rule.op === 'gte' ? count >= rule.value : count <= rule.value
  })

  return criterion.logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
}

/**
 * Runs a Monte Carlo simulation.
 * @param {object[]} cards - deck card definitions
 * @param {object[]} criteria - array of criterion objects
 * @param {number} handSize - cards drawn per hand (5 or 6)
 * @param {number} iterations - number of hands to simulate
 * @returns simulation result object
 */
export function simulate(cards, criteria, handSize, iterations = 10000) {
  const deck = expandDeck(cards)
  const deckSize = deck.length

  if (deckSize < handSize) {
    throw new Error(`Deck (${deckSize}) is smaller than hand size (${handSize}).`)
  }

  // Collect all possible categories (base + granted) for stats tracking
  const allCats = new Set()
  for (const card of cards) {
    for (const cat of card.categories) allCats.add(cat)
    for (const cond of card.conditionals ?? []) {
      for (const cat of cond.grantCategories) allCats.add(cat)
    }
  }

  const criteriaMatches = {}
  criteria.forEach((c) => { criteriaMatches[c.id] = 0 })

  const categoryCounts = {}
  allCats.forEach((cat) => { categoryCounts[cat] = 0 })

  const cardCounts = {}
  cards.forEach((c) => { cardCounts[c.id] = 0 })

  // Simulation loop
  const workingDeck = [...deck]
  for (let i = 0; i < iterations; i++) {
    shuffle(workingDeck)
    const rawHand = workingDeck.slice(0, handSize)
    const hand = computeEffectiveCategories(rawHand)

    for (const crit of criteria) {
      if (evaluateHand(hand, crit)) criteriaMatches[crit.id]++
    }

    for (const card of hand) {
      for (const cat of card.effectiveCategories) {
        categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
      }
      cardCounts[card.id] = (cardCounts[card.id] ?? 0) + 1
    }
  }

  // Per-criterion results with Wilson CI
  const perCriterion = {}
  for (const crit of criteria) {
    const matches = criteriaMatches[crit.id]
    const pct = matches / iterations
    const z = 1.96
    const n = iterations
    const ci = (z * Math.sqrt((pct * (1 - pct)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n)
    perCriterion[crit.id] = {
      matches,
      pct: +(pct * 100).toFixed(2),
      ci: +(ci * 100).toFixed(2),
    }
  }

  // Average effective-category count per hand
  const categoryStats = {}
  for (const [cat, total] of Object.entries(categoryCounts)) {
    categoryStats[cat] = +(total / iterations).toFixed(3)
  }

  // % of hands containing at least one copy of each card
  const cardStats = {}
  for (const card of cards) {
    cardStats[card.id] = {
      name: card.name,
      pct: +((cardCounts[card.id] / iterations) * 100).toFixed(2),
    }
  }

  return { handsDrawn: iterations, perCriterion, categoryStats, cardStats }
}
