import { useState } from 'react'
import { useDeckStore } from '../../store/deckStore.js'
import { optimize } from '../../utils/optimizer.js'

function VariableCardRow({ card, variable, onChange }) {
  const enabled = !!variable

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${enabled ? 'border-indigo-600 bg-indigo-950/30' : 'border-gray-700 bg-gray-800/30'}`}>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(card.id, e.target.checked ? { id: card.id, min: 0, max: 3 } : null)}
        className="w-4 h-4 accent-indigo-600"
      />
      <span className="flex-1 text-sm text-gray-200">{card.name}</span>
      <span className="text-xs text-gray-500">currently {card.count}x</span>

      {enabled && (
        <>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>min</span>
            <select
              value={variable.min}
              onChange={(e) => onChange(card.id, { ...variable, min: Number(e.target.value) })}
              className="bg-gray-700 rounded px-1 py-0.5 text-white text-xs"
            >
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>max</span>
            <select
              value={variable.max}
              onChange={(e) => onChange(card.id, { ...variable, max: Number(e.target.value) })}
              className="bg-gray-700 rounded px-1 py-0.5 text-white text-xs"
            >
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  )
}

function RankingTable({ rankings, cards, onApply }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">Top {rankings.length} combinations</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium w-8">#</th>
            <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Changes</th>
            <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Score</th>
            <th className="px-4 py-2 text-xs text-gray-400 font-medium w-24"></th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r, i) => (
            <>
              <tr
                key={i}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2 text-gray-200">
                  {r.delta.map((d) => (
                    <span key={d.id} className="mr-3">
                      {d.name}:&nbsp;
                      <span className={d.optimized > d.original ? 'text-emerald-400' : d.optimized < d.original ? 'text-red-400' : 'text-gray-400'}>
                        {d.original}→{d.optimized}
                      </span>
                    </span>
                  ))}
                </td>
                <td className="px-4 py-2 text-right font-bold text-white">{r.score}%</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onApply(r.combo) }}
                    className="px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-xs text-white"
                  >
                    Apply
                  </button>
                </td>
              </tr>
              {expanded === i && (
                <tr key={`${i}-detail`} className="border-b border-gray-800/50">
                  <td colSpan={4} className="px-4 py-3 bg-gray-800/20">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-400">
                      {Object.values(r.result.cardStats).map(({ name, pct }) => (
                        <span key={name}>{name}: <span className="text-gray-200">{pct}%</span></span>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Optimizer() {
  const cards = useDeckStore((s) => s.cards)
  const criteria = useDeckStore((s) => s.criteria)
  const handSize = useDeckStore((s) => s.handSize)
  const optimizerResults = useDeckStore((s) => s.optimizerResults)
  const setOptimizerResults = useDeckStore((s) => s.setOptimizerResults)
  const applyOptimizerVariant = useDeckStore((s) => s.applyOptimizerVariant)

  const [variables, setVariables] = useState({}) // { cardId: { id, min, max } | null }
  const [targetId, setTargetId] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState(null)
  const [appliedMsg, setAppliedMsg] = useState(null)

  const variableList = Object.values(variables).filter(Boolean)
  const selectedTarget = targetId || criteria[0]?.id
  const deckSize = cards.reduce((s, c) => s + c.count, 0)
  const canRun = variableList.length > 0 && criteria.length > 0 && deckSize >= handSize

  function handleVariableChange(cardId, value) {
    setVariables((prev) => ({ ...prev, [cardId]: value }))
  }

  function estimateCombinations() {
    if (!variableList.length) return 0
    const varDefs = variableList.map((v) => {
      const card = cards.find((c) => c.id === v.id)
      return { ...card, min: v.min, max: v.max }
    })
    const fixedSum = cards.filter((c) => !variableList.find((v) => v.id === c.id)).reduce((s, c) => s + c.count, 0)
    const target = deckSize - fixedSum
    // rough estimate: product of ranges clipped to target
    let estimate = 1
    for (const v of varDefs) estimate *= (v.max - v.min + 1)
    return estimate
  }

  function runOptimizer() {
    setError(null)
    setRunning(true)
    setProgress({ done: 0, total: 0 })
    setTimeout(() => {
      try {
        const result = optimize({
          allCards: cards,
          variables: variableList,
          criteria,
          targetCriteriaId: selectedTarget,
          handSize,
          iterations: 10000,
          onProgress: (done, total) => setProgress({ done, total }),
        })
        setOptimizerResults(result)
      } catch (e) {
        setError(e.message)
      } finally {
        setRunning(false)
      }
    }, 10)
  }

  function handleApply(combo) {
    applyOptimizerVariant(combo)
    setAppliedMsg('Deck updated! Re-run the simulation to see new results.')
    setTimeout(() => setAppliedMsg(null), 4000)
  }

  const estimate = estimateCombinations()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Ratio Optimizer</h2>
        <p className="text-sm text-gray-400">
          Mark cards whose copy count can vary, set their range, and the optimizer will find the combination that maximizes your target criteria.
        </p>
      </div>

      {cards.length === 0 && (
        <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-4 py-3 text-sm text-yellow-300">
          Build your deck first.
        </div>
      )}
      {criteria.length === 0 && cards.length > 0 && (
        <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-4 py-3 text-sm text-yellow-300">
          Define hand criteria before optimizing.
        </div>
      )}

      {/* Target criterion */}
      {criteria.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Optimize for:</span>
          <select
            value={selectedTarget}
            onChange={(e) => setTargetId(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {criteria.map((c) => (
              <option key={c.id} value={c.id} className="bg-gray-800">{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Variable card selection */}
      {cards.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Select which cards can vary:</p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {cards.map((card) => (
              <VariableCardRow
                key={card.id}
                card={card}
                variable={variables[card.id] ?? null}
                onChange={handleVariableChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Estimate */}
      {variableList.length > 0 && (
        <p className="text-xs text-gray-500">
          Estimated combinations: ~{estimate.toLocaleString()} · Each runs 10,000 simulated hands.
          {estimate > 500 && <span className="text-yellow-400"> This may take a moment.</span>}
        </p>
      )}

      {/* Run button */}
      <div className="flex items-center gap-4">
        <button
          onClick={runOptimizer}
          disabled={!canRun || running}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm"
        >
          {running ? 'Optimizing…' : 'Run Optimizer'}
        </button>
        {running && progress.total > 0 && (
          <span className="text-sm text-gray-400">
            {progress.done} / {progress.total} combinations
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {appliedMsg && (
        <div className="rounded-lg bg-emerald-900/30 border border-emerald-700/50 px-4 py-3 text-sm text-emerald-300">
          {appliedMsg}
        </div>
      )}

      {optimizerResults && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Tested {optimizerResults.total.toLocaleString()} combinations · showing top {optimizerResults.rankings.length}
          </p>
          <RankingTable
            rankings={optimizerResults.rankings}
            cards={cards}
            onApply={handleApply}
          />
        </div>
      )}
    </div>
  )
}
