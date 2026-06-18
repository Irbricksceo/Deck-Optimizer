const COLORS = {
  Starter: 'bg-emerald-600 text-emerald-50',
  Extender: 'bg-blue-600 text-blue-50',
  'Non-Engine': 'bg-gray-600 text-gray-100',
  Brick: 'bg-red-700 text-red-50',
}

export function categoryColor(category) {
  return COLORS[category] ?? 'bg-purple-600 text-purple-50'
}

export default function CategoryBadge({ category }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColor(category)}`}>
      {category}
    </span>
  )
}
