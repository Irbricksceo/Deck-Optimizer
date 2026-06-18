import { create } from 'zustand'
import { nanoid } from '../utils/nanoid.js'

export const BUILT_IN_CATEGORIES = ['Starter', 'Extender', 'Non-Engine', 'Brick']

const defaultState = {
  // Array of { id, name, count, categories: string[], conditionals: ConditionalRule[] }
  // ConditionalRule: { id, conditionType:'category'|'card', conditionTarget, conditionOp:'gte'|'lte', conditionValue, grantCategories: string[] }
  cards: [],
  // Array of user-defined category name strings (beyond the built-ins)
  customCategories: [],
  // Hand size: 5 (going first) or 6 (going second)
  handSize: 5,
  // Array of { id, name, rules: [{ id, type:'card'|'category', target, op:'gte'|'lte', value }], logic:'AND'|'OR' }
  criteria: [],
  // Simulation results: { handsDrawn, perCriterion: { criteriaId: { matches, pct, ci } }, categoryStats, cardStats }
  simResults: null,
  // Optimizer results: array of { cards, score, delta }
  optimizerResults: null,
}

export const useDeckStore = create((set, get) => ({
  ...defaultState,

  // ── Deck management ──────────────────────────────────────────────────────────
  addCard: (name, count, categories) => {
    const cats = Array.isArray(categories) ? categories : [categories]
    set((s) => ({ cards: [...s.cards, { id: nanoid(), name, count, categories: cats, conditionals: [] }] }))
  },

  updateCard: (id, patch) =>
    set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  removeCard: (id) =>
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

  importCards: (cards) =>
    set({
      cards: cards.map((c) => ({
        ...c,
        id: nanoid(),
        categories: c.categories ?? (c.category ? [c.category] : ['Non-Engine']),
        conditionals: c.conditionals ?? [],
      })),
    }),

  clearDeck: () => set({ cards: [], simResults: null, optimizerResults: null }),

  setHandSize: (size) => set({ handSize: size }),

  // ── Custom categories ─────────────────────────────────────────────────────────
  addCustomCategory: (name) =>
    set((s) => ({
      customCategories: s.customCategories.includes(name)
        ? s.customCategories
        : [...s.customCategories, name],
    })),

  removeCustomCategory: (name) =>
    set((s) => ({
      customCategories: s.customCategories.filter((c) => c !== name),
      cards: s.cards.map((c) => {
        const newCats = c.categories.filter((cat) => cat !== name)
        return {
          ...c,
          categories: newCats.length > 0 ? newCats : ['Non-Engine'],
          conditionals: c.conditionals
            .map((cond) => ({
              ...cond,
              grantCategories: cond.grantCategories.filter((cat) => cat !== name),
            }))
            .filter((cond) => cond.grantCategories.length > 0),
        }
      }),
    })),

  allCategories: () => [...BUILT_IN_CATEGORIES, ...get().customCategories],

  // ── Criteria management ───────────────────────────────────────────────────────
  addCriteria: (name) =>
    set((s) => ({
      criteria: [
        ...s.criteria,
        { id: nanoid(), name, rules: [], logic: 'AND' },
      ],
    })),

  updateCriteria: (id, patch) =>
    set((s) => ({
      criteria: s.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeCriteria: (id) =>
    set((s) => ({ criteria: s.criteria.filter((c) => c.id !== id) })),

  addRule: (criteriaId) =>
    set((s) => ({
      criteria: s.criteria.map((c) =>
        c.id === criteriaId
          ? {
              ...c,
              rules: [
                ...c.rules,
                { id: nanoid(), type: 'category', target: 'Starter', op: 'gte', value: 1 },
              ],
            }
          : c,
      ),
    })),

  updateRule: (criteriaId, ruleId, patch) =>
    set((s) => ({
      criteria: s.criteria.map((c) =>
        c.id === criteriaId
          ? { ...c, rules: c.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)) }
          : c,
      ),
    })),

  removeRule: (criteriaId, ruleId) =>
    set((s) => ({
      criteria: s.criteria.map((c) =>
        c.id === criteriaId
          ? { ...c, rules: c.rules.filter((r) => r.id !== ruleId) }
          : c,
      ),
    })),

  // ── Results ───────────────────────────────────────────────────────────────────
  setSimResults: (results) => set({ simResults: results }),
  setOptimizerResults: (results) => set({ optimizerResults: results }),

  // ── Deck helpers ──────────────────────────────────────────────────────────────
  deckSize: () => get().cards.reduce((sum, c) => sum + c.count, 0),

  applyOptimizerVariant: (variantCards) =>
    set((s) => ({
      cards: s.cards.map((c) => {
        const updated = variantCards.find((v) => v.id === c.id)
        return updated ? { ...c, count: updated.count } : c
      }),
      simResults: null,
      optimizerResults: null,
    })),
}))
