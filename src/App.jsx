import { useState } from 'react'
import { useDeckStore } from './store/deckStore.js'
import DeckBuilder from './components/DeckBuilder/DeckBuilder.jsx'
import HandCriteria from './components/HandCriteria/HandCriteria.jsx'
import Simulation from './components/Simulation/Simulation.jsx'
import Optimizer from './components/Optimizer/Optimizer.jsx'

const TABS = [
  { id: 'deck', label: 'Deck', icon: '🃏' },
  { id: 'criteria', label: 'Criteria', icon: '📋' },
  { id: 'simulate', label: 'Simulate', icon: '🎲' },
  { id: 'optimize', label: 'Optimize', icon: '⚡' },
]

function TabBar({ active, onChange, deckSize, criteriaCount }) {
  const warnings = {
    criteria: deckSize === 0,
    simulate: deckSize === 0 || criteriaCount === 0,
    optimize: deckSize === 0 || criteriaCount === 0,
  }

  return (
    <nav className="flex gap-1 bg-gray-900 border-b border-gray-800 px-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            active === tab.id
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
          {warnings[tab.id] && (
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Action needed" />
          )}
        </button>
      ))}
    </nav>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('deck')
  const deckSize = useDeckStore((s) => s.cards.reduce((sum, c) => sum + c.count, 0))
  const criteriaCount = useDeckStore((s) => s.criteria.length)

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🎴</span>
          <div>
            <h1 className="text-base font-bold text-white leading-none">YGO Deck Optimizer</h1>
            <p className="text-xs text-gray-500 mt-0.5">Monte Carlo hand simulation & ratio optimizer</p>
          </div>
          {deckSize > 0 && (
            <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${deckSize >= 40 && deckSize <= 60 ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'}`}>
              {deckSize} cards
            </span>
          )}
        </div>
        <TabBar
          active={activeTab}
          onChange={setActiveTab}
          deckSize={deckSize}
          criteriaCount={criteriaCount}
        />
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {activeTab === 'deck' && <DeckBuilder />}
        {activeTab === 'criteria' && <HandCriteria />}
        {activeTab === 'simulate' && <Simulation />}
        {activeTab === 'optimize' && <Optimizer />}
      </main>
    </div>
  )
}
