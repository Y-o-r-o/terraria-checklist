import React, { useMemo, useState } from 'react'
import { useGearData } from '../helper/gear'
import { Collection } from '../type/collection'
import './Gear.scss'
import GearItem from './GearItem'

type GearSection = {
  title: string
  items: { id: number; name: string }[]
}

interface GearPageProps {
  page: Collection
}

const GearPage = ({ page }: GearPageProps): JSX.Element => {
  const { data, failed } = useGearData()
  const [search, setSearch] = useState<string>('')
  const query = search.trim().toLowerCase()

  const sections = useMemo(() => {
    const list: GearSection[] = []
    page.items.forEach((item) => {
      if (typeof item === 'string') list.push({ title: item, items: [] })
      else list[list.length - 1]?.items.push(item)
    })
    return list
  }, [page])

  const filtered = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.name.toLowerCase().includes(query)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="page">
      <div className="cover" style={{ background: page.background }}>
        <h1>{page.label}</h1>
      </div>

      <div className="content gear">
        <p className="gear-hint">
          Tick what you own. Click an item to see how to get it: its crafting tree down to the raw
          materials, who drops it (with drop chances and where to find them), and what it upgrades
          into.
        </p>
        <input
          className="gear-search"
          type="search"
          placeholder={`Search ${page.label.toLowerCase()}…`}
          aria-label={`Search ${page.label.toLowerCase()}`}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        {failed && <p className="gear-muted">Could not load the item details.</p>}
        {filtered.map((section) => (
          <section key={section.title} className="gear-section">
            <h3>{section.title}</h3>
            {section.items.map((item) => (
              <GearItem key={item.id} item={item} collectionId={page.id} data={data} />
            ))}
          </section>
        ))}
        {filtered.length === 0 && <p className="gear-muted">No results for “{search}”.</p>}
      </div>
    </div>
  )
}

export default GearPage
