import { useState } from 'react'
import { useDeckStore, BUILT_IN_CATEGORIES } from '../../store/deckStore.js'
import { categoryColor } from './CategoryBadge.jsx'
import { nanoid } from '../../utils/nanoid.js'

function CategoryCheckboxes({ selected, allCategories, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {allCategories.map((cat) => {
        const active = selected.includes(cat)
        return (
          <button
            key={cat}
            type="button"
            onClick={() => {
              if (active && selected.length === 1) return // keep at least one
              onChange(active ? selected.filter((c) => c !== cat) : [...selected, cat])
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${
              active
                ? `${categoryColor(cat)} border-transparent`
                : 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400'
            }`}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}

function ConditionalRuleEditor({ rule, allCategories, cards, onChange, onRemove }) {
  const targetOptions =
    rule.conditionType === 'card'
      ? cards.map((c) => ({ value: c.id, label: c.name }))
      : allCategories.map((c) => ({ value: c, label: c }))

  return (
    <div className="bg-gray-800/60 rounded-lg p-3 space-y-3 border border-gray-700">
      {/* Condition row */}
      <div className="flex flex-wrap gap-2 items-center text-sm">
        <span className="text-gray-400 text-xs">If the rest of this hand has</span>
        <div className="flex rounded overflow-hidden text-xs">
          {['category', 'card'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({
                ...rule,
                conditionType: t,
                conditionTarget: t === 'card' ? (cards[0]?.id ?? '') : allCategories[0],
              })}
              className={`px-2 py-1 ${rule.conditionType === t ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={rule.conditionTarget}
          onChange={(e) => onChange({ ...rule, conditionTarget: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 flex-1 min-w-28"
        >
          {targetOptions.map((o) => (
            <option key={o.value} value={o.value} className="bg-gray-800">{o.label}</option>
          ))}
        </select>
        <select
          value={rule.conditionOp}
          onChange={(e) => onChange({ ...rule, conditionOp: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="gte" className="bg-gray-800">≥</option>
          <option value="lte" className="bg-gray-800">≤</option>
        </select>
        <select
          value={rule.conditionValue}
          onChange={(e) => onChange({ ...rule, conditionValue: Number(e.target.value) })}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 w-14"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n} className="bg-gray-800">{n}</option>
          ))}
        </select>
      </div>

      {/* Grant row */}
      <div className="space-y-1.5">
        <span className="text-xs text-gray-400">…then this card also counts as:</span>
        <CategoryCheckboxes
          selected={rule.grantCategories}
          allCategories={allCategories}
          onChange={(cats) => onChange({ ...rule, grantCategories: cats })}
        />
        {rule.grantCategories.length === 0 && (
          <p className="text-xs text-yellow-500">Select at least one category to grant.</p>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-red-400 hover:text-red-300"
      >
        Remove condition
      </button>
    </div>
  )
}

export default function CardConfigModal({ card, onClose }) {
  const cards = useDeckStore((s) => s.cards)
  const customCategories = useDeckStore((s) => s.customCategories)
  const updateCard = useDeckStore((s) => s.updateCard)

  const allCategories = [...BUILT_IN_CATEGORIES, ...customCategories]
  const otherCards = cards.filter((c) => c.id !== card.id)

  const [categories, setCategories] = useState(card.categories)
  const [conditionals, setConditionals] = useState(card.conditionals ?? [])

  function save() {
    updateCard(card.id, { categories, conditionals })
    onClose()
  }

  function addConditional() {
    setConditionals((prev) => [
      ...prev,
      {
        id: nanoid(),
        conditionType: 'category',
        conditionTarget: allCategories[0],
        conditionOp: 'gte',
        conditionValue: 1,
        grantCategories: [allCategories[0]],
      },
    ])
  }

  function updateConditional(id, updated) {
    setConditionals((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }

  function removeConditional(id) {
    setConditionals((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg flex flex-col gap-5 p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-base font-semibold text-white">{card.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Card configuration</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none mt-0.5">&times;</button>
        </div>

        {/* Base categories */}
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-medium text-gray-200">Base Categories</h3>
            <p className="text-xs text-gray-500">Always applied regardless of the hand.</p>
          </div>
          <CategoryCheckboxes
            selected={categories}
            allCategories={allCategories}
            onChange={setCategories}
          />
        </div>

        <hr className="border-gray-700" />

        {/* Conditional rules */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-gray-200">Conditional Categories</h3>
            <p className="text-xs text-gray-500">
              Grant this card extra categories based on what else is in the hand.
            </p>
          </div>

          {conditionals.length === 0 && (
            <p className="text-sm text-gray-500 italic">No conditions set.</p>
          )}

          {conditionals.map((cond) => (
            <ConditionalRuleEditor
              key={cond.id}
              rule={cond}
              allCategories={allCategories}
              cards={otherCards}
              onChange={(updated) => updateConditional(cond.id, updated)}
              onRemove={() => removeConditional(cond.id)}
            />
          ))}

          <button
            type="button"
            onClick={addConditional}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            + Add condition
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
