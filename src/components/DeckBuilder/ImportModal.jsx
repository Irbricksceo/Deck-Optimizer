import { useRef, useState } from 'react'
import { useDeckStore } from '../../store/deckStore.js'

/**
 * Parses plain-text deck list. Supports:
 *   "3 Card Name"  or  "Card Name x3"  or  "Card Name"  (assumes 1)
 * Also handles YDK format (#main section, numeric IDs skipped).
 */
function parsePlainText(raw) {
  const cards = []
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('!')) continue
    if (/^\d{8,}$/.test(line)) continue

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

/** Returns parsed JSON deck if the string looks like a saved deck file, otherwise null. */
function tryParseJsonDeck(raw) {
  try {
    const data = JSON.parse(raw)
    if (data.version && Array.isArray(data.cards)) return data
  } catch {
    // not JSON
  }
  return null
}

export default function ImportModal({ onClose }) {
  const [raw, setRaw] = useState('')
  const [fileError, setFileError] = useState(null)
  const fileInputRef = useRef(null)

  const importCards = useDeckStore((s) => s.importCards)
  const loadDeck = useDeckStore((s) => s.loadDeck)
  const existingCards = useDeckStore((s) => s.cards)

  const jsonDeck = raw.trim() ? tryParseJsonDeck(raw) : null
  const textPreview = !jsonDeck && raw.trim() ? parsePlainText(raw) : []

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target.result
      setRaw(content)
    }
    reader.onerror = () => setFileError('Could not read file.')
    reader.readAsText(file)

    // reset so the same file can be re-selected
    e.target.value = ''
  }

  function handleLoadJson() {
    if (!jsonDeck) return
    loadDeck(jsonDeck)
    onClose()
  }

  function handleImportText(replace) {
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

  const totalCopies = jsonDeck
    ? jsonDeck.cards.reduce((s, c) => s + c.count, 0)
    : textPreview.reduce((s, c) => s + c.count, 0)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl flex flex-col gap-4 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Import Deck</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* File browse */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-white"
          >
            Browse file…
          </button>
          <span className="text-xs text-gray-500">
            .json (saved deck) or .txt / .ydk (plain text)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.txt,.ydk,.dec"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="flex-1 h-px bg-gray-700" />
          <span>or paste below</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <textarea
          className="w-full h-40 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm text-gray-100 font-mono resize-none focus:outline-none focus:border-indigo-500"
          placeholder={"3 Ash Blossom\n2 Nibiru\n1 Pot of Prosperity"}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setFileError(null) }}
        />

        {fileError && (
          <p className="text-sm text-red-400">{fileError}</p>
        )}

        {/* Preview / detection result */}
        {jsonDeck && (
          <div className="rounded-lg bg-emerald-900/30 border border-emerald-700/50 px-4 py-2.5 text-sm text-emerald-300">
            Saved deck detected — <span className="font-medium">{jsonDeck.cards.length} cards</span> ({totalCopies} copies)
            {jsonDeck.customCategories?.length > 0 && (
              <span>, custom categories: {jsonDeck.customCategories.join(', ')}</span>
            )}.
            Categories and conditionals will be fully restored.
          </div>
        )}
        {textPreview.length > 0 && (
          <div className="text-sm text-gray-400">
            Parsed <span className="text-white font-medium">{textPreview.length} cards</span> ({totalCopies} copies).
            Categories will default to <span className="text-yellow-400">Non-Engine</span>.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            Cancel
          </button>

          {jsonDeck ? (
            <button
              onClick={handleLoadJson}
              className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Load deck
            </button>
          ) : (
            <>
              {existingCards.length > 0 && (
                <button
                  onClick={() => handleImportText(false)}
                  disabled={!textPreview.length}
                  className="px-4 py-2 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-40"
                >
                  Add to existing
                </button>
              )}
              <button
                onClick={() => handleImportText(true)}
                disabled={!textPreview.length}
                className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
              >
                {existingCards.length > 0 ? 'Replace deck' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
