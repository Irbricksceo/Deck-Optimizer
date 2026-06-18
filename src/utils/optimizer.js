import { simulate } from './simulation.js'

/**
 * Generates all combinations of variable card counts that keep total deck size fixed.
 * variables: [{ id, name, category, min, max, current }]
 * fixedTotal: target deck size
 * fixedSum: sum of counts for non-variable cards
 *
 * Returns array of arrays: each inner array is [{ id, count }, ...] for the variable cards.
 */
function generateCombinations(variables, targetVariableSum) {
  const results = []

  function recurse(index, remaining, current) {
    if (index === variables.length - 1) {
      const v = variables[index]
      if (remaining >= v.min && remaining <= v.max) {
        results.push([...current, { id: v.id, count: remaining }])
      }
      return
    }

    const v = variables[index]
    const lo = v.min
    const hi = Math.min(v.max, remaining - variables.slice(index + 1).reduce((s, x) => s + x.min, 0))

    for (let c = lo; c <= hi; c++) {
      recurse(index + 1, remaining - c, [...current, { id: v.id, count: c }])
    }
  }

  recurse(0, targetVariableSum, [])
  return results
}

/**
 * Runs the optimizer.
 * @param {object[]} allCards - full deck card list
 * @param {object[]} variables - cards marked as variable: [{ id, min, max }]
 * @param {object[]} criteria - criterion definitions
 * @param {string} targetCriteriaId - which criterion to maximize
 * @param {number} handSize
 * @param {number} iterations
 * @param {function} onProgress - called with (done, total)
 * @returns { best: [...], rankings: [...] }
 */
export function optimize({
  allCards,
  variables,
  criteria,
  targetCriteriaId,
  handSize,
  iterations = 10000,
  onProgress,
}) {
  const fixedCards = allCards.filter((c) => !variables.find((v) => v.id === c.id))
  const fixedSum = fixedCards.reduce((s, c) => s + c.count, 0)
  const targetTotal = allCards.reduce((s, c) => s + c.count, 0)
  const targetVariableSum = targetTotal - fixedSum

  const variableDefs = variables.map((v) => {
    const card = allCards.find((c) => c.id === v.id)
    return { ...card, min: v.min, max: v.max }
  })

  const combinations = generateCombinations(variableDefs, targetVariableSum)
  const total = combinations.length
  const rankings = []

  combinations.forEach((combo, i) => {
    // Build the full card list for this combination
    const cards = allCards.map((c) => {
      const variation = combo.find((v) => v.id === c.id)
      return variation ? { ...c, count: variation.count } : c
    }).filter((c) => c.count > 0)

    const result = simulate(cards, criteria, handSize, iterations)
    const score = result.perCriterion[targetCriteriaId]?.pct ?? 0

    // Build delta vs original counts
    const delta = combo.map((v) => {
      const original = allCards.find((c) => c.id === v.id)
      return { id: v.id, name: original.name, original: original.count, optimized: v.count }
    })

    rankings.push({ combo, score, delta, result })

    if (onProgress) onProgress(i + 1, total)
  })

  rankings.sort((a, b) => b.score - a.score)

  return { rankings: rankings.slice(0, 10), total }
}
