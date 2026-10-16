import React, { useEffect, useState } from 'react'
import { useDrawer } from '../context/DrawerContext'
import { GearData } from '../type/gear'
import { ItemIcon, NodeDetails, UpgradeTree } from './GearDetails'

interface GearItemProps {
  item: { id: number; name: string }
  collectionId: number
  data: GearData | null
}

const GearItem = ({ item, collectionId, data }: GearItemProps): JSX.Element => {
  const [isChecked, setIsChecked] = useState<boolean>(false)
  const [open, setOpen] = useState<boolean>(false)
  const { setCheckedItem } = useDrawer()
  const localStorageKey = `collection-${collectionId}-item-${item.id}`
  const node = data?.items[item.name]

  const handleCheckboxClick = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const state = event.currentTarget.checked
    localStorage.setItem(localStorageKey, state.toString())
    setIsChecked(state)
    setCheckedItem({ pageType: 'collection', pageId: collectionId, itemId: item.id, state })
  }

  useEffect(() => {
    setIsChecked(localStorage.getItem(localStorageKey) === 'true')
  }, [collectionId, item.id])

  return (
    <div className={`gear-item ${isChecked ? 'done' : ''} ${open ? 'open' : ''}`}>
      <div className="gear-row">
        <input
          type="checkbox"
          onChange={handleCheckboxClick}
          checked={isChecked}
          aria-label={`${item.name} - ${isChecked ? 'collected' : 'not collected'}`}
        />
        <button
          className="gear-toggle"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <ItemIcon img={node?.img} />
          <span className="gear-name">{item.name}</span>
          {node?.meta && <span className="gear-meta">{node.meta}</span>}
        </button>
      </div>

      {open && (
        <div className="gear-details">
          {!data && <p className="gear-muted">Loading…</p>}
          {data && node && (
            <>
              <NodeDetails name={item.name} node={node} data={data} ancestors={[item.name]} />
              {node.usedIn && (
                <div className="gear-block">
                  <h4>⬆️ Upgrade path</h4>
                  <UpgradeTree names={node.usedIn} data={data} ancestors={[item.name]} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default GearItem
