import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useDeckStore } from '../../store/deckStore.js'
import { simulate } from '../../utils/simulation.js'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function CriteriaResultCard({ name, result, color }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="font-medium text-white text-sm">{name}</span>
      </div>
      <div className="text-3xl font-bold text-white">
        {result.pct}%
        <span className="text-sm text-gray-400 font-normal ml-1">± {result.ci}%</span>
      </div>
      <div className="text-xs text-gray-500">
        {result.matches.toLocaleString()} / {(10000).toLocaleString()} hands
      </div>
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${result.pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function CategoryChart({ categoryStats }) {
  const data = Object.entries(categoryStats).map(([cat, avg]) => ({ cat, avg }))
  if (!data.length) return null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3">Avg copies per hand by category</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
          <XAxis dataKey="cat" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#fff' }}
            formatter={(v) => [v.toFixed(3), 'avg']}
          />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CardFrequencyTable({ cardStats }) {
  const entries = Object.values(cardStats).sort((a, b) => b.pct - a.pct)
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-medium text-gray-300">Card frequency in opening hand</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Card</th>
            <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Seen in hand</th>
            <th className="px-4 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ name, pct }) => (
            <tr key={name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="px-4 py-1.5 text-gray-200">{name}</td>
              <td className="px-4 py-1.5 text-right text-white font-medium">{pct}%</td>
              <td className="px-4 py-1.5">
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Simulation() {
  const cards = useDeckStore((s) => s.cards)
  const criteria = useDeckStore((s) => s.criteria)
  const handSize = useDeckStore((s) => s.handSize)
  const simResults = useDeckStore((s) => s.simResults)
  const setSimResults = useDeckStore((s) => s.setSimResults)

  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const deckSize = cards.reduce((s, c) => s + c.count, 0)
  const canRun = cards.length > 0 && criteria.length > 0 && deckSize >= handSize

  function runSimulation() {
    setError(null)
    setRunning(true)
    // Use setTimeout so React can render the "running" state first
    setTimeout(() => {
      try {
        const results = simulate(cards, criteria, handSize, 10000)
        setSimResults(results)
      } catch (e) {
        setError(e.message)
      } finally {
        setRunning(false)
      }
    }, 10)
  }

  const activeCriteria = criteria.filter((c) => simResults?.perCriterion?.[c.id])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Simulation</h2>
        <p className="text-sm text-gray-400">
          Draws 10,000 random {handSize}-card hands and evaluates each against your criteria.
        </p>
      </div>

      {/* Validation warnings */}
      {cards.length === 0 && (
        <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-4 py-3 text-sm text-yellow-300">
          Add cards to your deck before running a simulation.
        </div>
      )}
      {criteria.length === 0 && cards.length > 0 && (
        <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-4 py-3 text-sm text-yellow-300">
          Define at least one hand criteria set before simulating.
        </div>
      )}
      {deckSize > 0 && deckSize < handSize && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-300">
          Deck has {deckSize} cards but hand size is {handSize}. Add more cards.
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={runSimulation}
          disabled={!canRun || running}
          className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm"
        >
          {running ? 'Simulating…' : 'Run Simulation'}
        </button>
        {simResults && (
          <span className="text-sm text-gray-500">
            {simResults.handsDrawn.toLocaleString()} hands drawn · {handSize} cards · {deckSize}-card deck
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {simResults && (
        <div className="space-y-6">
          {/* Criteria results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {criteria.map((c, i) => {
              const result = simResults.perCriterion[c.id]
              if (!result) return null
              return (
                <CriteriaResultCard
                  key={c.id}
                  name={c.name}
                  result={result}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                />
              )
            })}
          </div>

          {/* Category chart */}
          <CategoryChart categoryStats={simResults.categoryStats} />

          {/* Card frequency table */}
          <CardFrequencyTable cardStats={simResults.cardStats} />
        </div>
      )}
    </div>
  )
}
