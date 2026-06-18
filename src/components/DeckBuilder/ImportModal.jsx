import { useState } from 'react'
import { useDeckStore, BUILT_IN_CATEGORIES } from '../../store/deckStore.js'

/**
 * Parses plain-text deck list. Supports:
 *   "3 Card Name"  or  "Card Name x3"  or  "Card Name"  (assumes 1)
 * Also supports YDK format (#main section, numeric IDs skipped — names only in plain text).
 */
function parsePlainText(raw) {
  const cards = []
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('!')) continue // YDK headers
    if (/^\d{8,}$/.test(line)) continue // YDK numeric IDs — skip

    let count = 1
    let name = line

    const prefixMatch = line.match(/^(\d+)[x\s]+(.+)$/i)
    const suffixMatch = line.match(/^(.+?)\s+x(\d+)$/i)

    if (prefixMatch) {
      count = Math.min(3, Math.max(1, parseInt(prefixMatch[1], 10)))
      name = prefixMatch[2].trim()
    } else if (suffixMatch) {
      name = suffixMatch[1].trim()
      count = Math.min(3, Math.max(1, parseInt(suffixMatch[2], 10)))
    }

    if (name) cards.push({ name, count, categories: ['Non-Engine'], conditionals: [] })
  }

  return cards
}

export default function ImportModal({ onClose }) {
  const [raw, setRaw] = useState('')
  const importCards = useDeckStore((s) => s.importCards)
  const cards = useDeckStore((s) => s.cards)

  const preview = raw.trim() ? parsePlainText(raw) : []

  function handleImport(replace) {
    const parsed = parsePlainText(raw)
    if (!parsed.length) return

    if (replace) {
      importCards(parsed)
    } else {
      const existing = useDeckStore.getState().cards
      importCards([...existing.map(({ id, ...rest }) => rest), ...parsed])
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col gap-4 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Import Deck List</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-gray-400">
          Paste a deck list below. Supported formats:<br />
          <code className="text-gray-300">3 Card Name</code> &nbsp;·&nbsp;
          <code className="text-gray-300">Card Name x3</code> &nbsp;·&nbsp;
          YDK (card names, not numeric IDs)
        </p>

        <textarea
          className="w-full h-48 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-gray-100 font-mono resize-none focus:outline-none focus:border-indigo-500"
          placeholder={"3 Ash Blossom\n2 Nibiru\n1 Pot of Prosperity"}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        {preview.length > 0 && (
          <div className="text-sm text-gray-400">
            Parsed <span className="text-white font-medium">{preview.length}</span> cards
            ({preview.reduce((s, c) => s + c.count, 0)} total copies).
            Categories will default to <span className="text-yellow-400">Non-Engine</span> — reassign in the deck list.
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            Cancel
          </button>
          {cards.length > 0 && (
            <button
              onClick={() => handleImport(false)}
              disabled={!preview.length}
              className="px-4 py-2 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-40"
            >
              Add to existing deck
            </button>
          )}
          <button
            onClick={() => handleImport(true)}
            disabled={!preview.length}
            className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
          >
            {cards.length > 0 ? 'Replace deck' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
