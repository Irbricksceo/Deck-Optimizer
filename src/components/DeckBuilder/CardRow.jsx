import { useState } from 'react'
import { useDeckStore } from '../../store/deckStore.js'
import { categoryColor } from './CategoryBadge.jsx'
import CardConfigModal from './CardConfigModal.jsx'

export default function CardRow({ card }) {
  const updateCard = useDeckStore((s) => s.updateCard)
  const removeCard = useDeckStore((s) => s.removeCard)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(card.name)
  const [showConfig, setShowConfig] = useState(false)

  function commitName() {
    const trimmed = nameValue.trim()
    if (trimmed) updateCard(card.id, { name: trimmed })
    else setNameValue(card.name)
    setEditingName(false)
  }

  const hasConditionals = (card.conditionals ?? []).length > 0

  return (
    <>
      <tr className="border-b border-gray-800 hover:bg-gray-800/50 group">
        {/* Name */}
        <td className="py-2 px-3">
          {editingName ? (
            <input
              autoFocus
              className="bg-gray-700 rounded px-2 py-0.5 text-sm text-white w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName()
                if (e.key === 'Escape') { setNameValue(card.name); setEditingName(false) }
              }}
            />
          ) : (
            <span
              className="text-sm text-gray-100 cursor-pointer hover:text-white"
              onClick={() => setEditingName(true)}
              title="Click to edit name"
            >
              {card.name}
            </span>
          )}
        </td>

        {/* Count */}
        <td className="py-2 px-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => updateCard(card.id, { count: Math.max(1, card.count - 1) })}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm leading-none"
            >-</button>
            <span className="w-4 text-center text-sm text-white">{card.count}</span>
            <button
              onClick={() => updateCard(card.id, { count: Math.min(3, card.count + 1) })}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm leading-none"
            >+</button>
          </div>
        </td>

        {/* Categories */}
        <td className="py-2 px-2">
          <div className="flex flex-wrap gap-1 items-center">
            {card.categories.map((cat) => (
              <span key={cat} className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColor(cat)}`}>
                {cat}
              </span>
            ))}
            {hasConditionals && (
              <span
                className="text-xs text-indigo-400 ml-0.5"
                title={`${card.conditionals.length} conditional rule${card.conditionals.length > 1 ? 's' : ''}`}
              >
                ⚡{card.conditionals.length}
              </span>
            )}
          </div>
        </td>

        {/* Config + Remove */}
        <td className="py-2 px-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowConfig(true)}
              className="text-gray-500 hover:text-indigo-400 text-sm transition-colors"
              title="Configure categories & conditionals"
            >
              ⚙
            </button>
            <button
              onClick={() => removeCard(card.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-sm transition-opacity"
              title="Remove card"
            >✕</button>
          </div>
        </td>
      </tr>

      {showConfig && (
        <CardConfigModal card={card} onClose={() => setShowConfig(false)} />
      )}
    </>
  )
}
