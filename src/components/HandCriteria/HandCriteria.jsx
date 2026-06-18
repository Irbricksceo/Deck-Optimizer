import { useState } from 'react'
import { useDeckStore, BUILT_IN_CATEGORIES } from '../../store/deckStore.js'

function RuleRow({ rule, criteriaId, cards, allCategories }) {
  const updateRule = useDeckStore((s) => s.updateRule)
  const removeRule = useDeckStore((s) => s.removeRule)

  const targetOptions =
    rule.type === 'card'
      ? cards.map((c) => ({ value: c.id, label: c.name }))
      : allCategories.map((cat) => ({ value: cat, label: cat }))

  // If current target is invalid for this type, reset it
  const validTarget = targetOptions.find((o) => o.value === rule.target)
  if (!validTarget && targetOptions.length > 0) {
    updateRule(criteriaId, rule.id, { target: targetOptions[0].value })
  }

  return (
    <div className="flex flex-wrap gap-2 items-center bg-gray-800/60 rounded-lg p-2">
      {/* Type toggle */}
      <div className="flex rounded overflow-hidden text-xs">
        {['card', 'category'].map((t) => (
          <button
            key={t}
            onClick={() => updateRule(criteriaId, rule.id, { type: t, target: t === 'card' ? cards[0]?.id : allCategories[0] })}
            className={`px-2 py-1 ${rule.type === t ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Target select */}
      <select
        value={rule.target}
        onChange={(e) => updateRule(criteriaId, rule.id, { target: e.target.value })}
        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 flex-1 min-w-28"
      >
        {targetOptions.map((o) => (
          <option key={o.value} value={o.value} className="bg-gray-800">{o.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={rule.op}
        onChange={(e) => updateRule(criteriaId, rule.id, { op: e.target.value })}
        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
      >
        <option value="gte" className="bg-gray-800">at least</option>
        <option value="lte" className="bg-gray-800">at most</option>
      </select>

      {/* Value */}
      <select
        value={rule.value}
        onChange={(e) => updateRule(criteriaId, rule.id, { value: Number(e.target.value) })}
        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500 w-14"
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <option key={n} value={n} className="bg-gray-800">{n}</option>
        ))}
      </select>

      <span className="text-gray-400 text-sm">in hand</span>

      <button
        onClick={() => removeRule(criteriaId, rule.id)}
        className="ml-auto text-gray-500 hover:text-red-400 text-sm px-1"
        title="Remove rule"
      >✕</button>
    </div>
  )
}

function CriteriaCard({ criterion }) {
  const cards = useDeckStore((s) => s.cards)
  const customCategories = useDeckStore((s) => s.customCategories)
  const updateCriteria = useDeckStore((s) => s.updateCriteria)
  const removeCriteria = useDeckStore((s) => s.removeCriteria)
  const addRule = useDeckStore((s) => s.addRule)

  const allCategories = [...BUILT_IN_CATEGORIES, ...customCategories]
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(criterion.name)

  function commitName() {
    const trimmed = nameVal.trim()
    if (trimmed) updateCriteria(criterion.id, { name: trimmed })
    else setNameVal(criterion.name)
    setEditingName(false)
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        {editingName ? (
          <input
            autoFocus
            className="bg-gray-700 rounded px-2 py-0.5 text-sm text-white flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameVal(criterion.name); setEditingName(false) } }}
          />
        ) : (
          <h3
            className="font-medium text-white cursor-pointer hover:text-indigo-300 flex-1"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {criterion.name}
          </h3>
        )}

        {/* Logic toggle */}
        <div className="flex rounded overflow-hidden text-xs">
          {['AND', 'OR'].map((l) => (
            <button
              key={l}
              onClick={() => updateCriteria(criterion.id, { logic: l })}
              className={`px-2 py-1 ${criterion.logic === l ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {l}
            </button>
          ))}
        </div>

        <button
          onClick={() => removeCriteria(criterion.id)}
          className="text-gray-500 hover:text-red-400 text-sm"
          title="Delete criteria set"
        >🗑</button>
      </div>

      {criterion.logic === 'AND'
        ? <p className="text-xs text-gray-500">Hand must satisfy ALL rules below</p>
        : <p className="text-xs text-gray-500">Hand must satisfy ANY rule below</p>
      }

      {/* Rules */}
      <div className="space-y-2">
        {criterion.rules.length === 0 && (
          <p className="text-sm text-gray-500 italic">No rules yet. Add a rule to define this hand type.</p>
        )}
        {criterion.rules.map((rule) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            criteriaId={criterion.id}
            cards={cards}
            allCategories={allCategories}
          />
        ))}
      </div>

      <button
        onClick={() => addRule(criterion.id)}
        disabled={cards.length === 0}
        className="text-sm text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:cursor-not-allowed"
      >
        + Add rule
      </button>
    </div>
  )
}

export default function HandCriteria() {
  const criteria = useDeckStore((s) => s.criteria)
  const addCriteria = useDeckStore((s) => s.addCriteria)
  const cards = useDeckStore((s) => s.cards)
  const [newName, setNewName] = useState('')

  function handleAdd() {
    const name = newName.trim() || `Hand Type ${criteria.length + 1}`
    addCriteria(name)
    setNewName('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Hand Criteria</h2>
        <p className="text-sm text-gray-400">
          Define what makes a "good" hand. Each criteria set is evaluated independently during simulation.
        </p>
      </div>

      {cards.length === 0 && (
        <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-4 py-3 text-sm text-yellow-300">
          Add cards to your deck first before defining hand criteria.
        </div>
      )}

      {/* Add new criteria */}
      <div className="flex gap-2">
        <input
          className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white flex-1 focus:outline-none focus:border-indigo-500"
          placeholder="e.g. Combo Hand, Brick Hand..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium"
        >
          Add Criteria Set
        </button>
      </div>

      {/* Criteria list */}
      {criteria.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-3xl mb-3">📋</p>
          <p>No criteria defined yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {criteria.map((c) => (
            <CriteriaCard key={c.id} criterion={c} />
          ))}
        </div>
      )}
    </div>
  )
}
