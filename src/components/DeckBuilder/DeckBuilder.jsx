import { useState } from 'react'
import { useDeckStore, BUILT_IN_CATEGORIES } from '../../store/deckStore.js'
import CardRow from './CardRow.jsx'
import ImportModal from './ImportModal.jsx'
import { categoryColor } from './CategoryBadge.jsx'

function AddCardForm({ allCategories }) {
  const addCard = useDeckStore((s) => s.addCard)
  const [name, setName] = useState('')
  const [count, setCount] = useState(1)
  const [category, setCategory] = useState('Non-Engine')

  function submit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addCard(trimmed, count, category)
    setName('')
    setCount(1)
  }

  return (
    <form onSubmit={submit} className="flex gap-2 flex-wrap items-end">
      <div className="flex-1 min-w-40">
        <label className="block text-xs text-gray-400 mb-1">Card Name</label>
        <input
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          placeholder="e.g. Ash Blossom"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="w-20">
        <label className="block text-xs text-gray-400 mb-1">Copies</label>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="w-40">
        <label className="block text-xs text-gray-400 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          {allCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium"
      >
        Add Card
      </button>
    </form>
  )
}

function CategorySummary({ cards, allCategories }) {
  // A card contributes its count to every base category it belongs to
  const totals = {}
  for (const card of cards) {
    for (const cat of card.categories) {
      totals[cat] = (totals[cat] ?? 0) + card.count
    }
  }
  const total = cards.reduce((s, c) => s + c.count, 0)

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {allCategories.filter((c) => totals[c] > 0).map((cat) => (
        <span key={cat} className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColor(cat)}`}>
          {cat}: {totals[cat]}
        </span>
      ))}
      <span className="text-gray-400 text-sm ml-auto">Total: <span className={`font-bold ${total < 40 || total > 60 ? 'text-red-400' : 'text-white'}`}>{total}</span> cards</span>
    </div>
  )
}

export default function DeckBuilder() {
  const cards = useDeckStore((s) => s.cards)
  const customCategories = useDeckStore((s) => s.customCategories)
  const addCustomCategory = useDeckStore((s) => s.addCustomCategory)
  const removeCustomCategory = useDeckStore((s) => s.removeCustomCategory)
  const clearDeck = useDeckStore((s) => s.clearDeck)
  const handSize = useDeckStore((s) => s.handSize)
  const setHandSize = useDeckStore((s) => s.setHandSize)

  const allCategories = [...BUILT_IN_CATEGORIES, ...customCategories]
  const [showImport, setShowImport] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  function addCustomCat() {
    const trimmed = newCatName.trim()
    if (trimmed && !allCategories.includes(trimmed)) {
      addCustomCategory(trimmed)
      setNewCatName('')
    }
  }

  function exportDeck() {
    const lines = cards.map((c) => `${c.count} ${c.name}`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'deck.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-white"
          >
            Import List
          </button>
          {cards.length > 0 && (
            <>
              <button
                onClick={exportDeck}
                className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-white"
              >
                Export
              </button>
              <button
                onClick={clearDeck}
                className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/70 text-sm text-red-300"
              >
                Clear Deck
              </button>
            </>
          )}
        </div>

        {/* Hand size toggle */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Hand size:</span>
          <button
            onClick={() => setHandSize(5)}
            className={`px-2 py-1 rounded text-sm ${handSize === 5 ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            5 (1st)
          </button>
          <button
            onClick={() => setHandSize(6)}
            className={`px-2 py-1 rounded text-sm ${handSize === 6 ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            6 (2nd)
          </button>
        </div>
      </div>

      {/* Custom categories */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-400">Custom categories:</span>
        {customCategories.map((cat) => (
          <span key={cat} className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-700/50 text-purple-200 text-xs">
            {cat}
            <button onClick={() => removeCustomCategory(cat)} className="hover:text-red-300 leading-none">&times;</button>
          </span>
        ))}
        <div className="flex gap-1">
          <input
            className="bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs text-white w-32 focus:outline-none focus:border-purple-500"
            placeholder="New category..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustomCat() }}
          />
          <button
            onClick={addCustomCat}
            className="px-2 py-0.5 rounded bg-purple-700 hover:bg-purple-600 text-xs text-white"
          >+</button>
        </div>
      </div>

      {/* Add card form */}
      <AddCardForm allCategories={allCategories} />

      {/* Category summary */}
      {cards.length > 0 && (
        <CategorySummary cards={cards} allCategories={allCategories} />
      )}

      {/* Card table */}
      {cards.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🃏</p>
          <p>No cards yet. Add cards above or import a deck list.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900">
                <th className="py-2 px-3 text-xs text-gray-400 font-medium">Card Name</th>
                <th className="py-2 px-2 text-xs text-gray-400 font-medium text-center">Copies</th>
                <th className="py-2 px-2 text-xs text-gray-400 font-medium">Categories</th>
                <th className="py-2 px-2 text-xs text-gray-400 font-medium text-center w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <CardRow key={card.id} card={card} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
