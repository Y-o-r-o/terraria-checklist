import React, { ReactNode, useState } from 'react'
import { hasDetails, wikiLink } from '../helper/gear'
import { GearData, GearDrop, GearNode } from '../type/gear'

const DROPS_PREVIEW_COUNT = 6

interface ItemIconProps {
  img?: string
}

export const ItemIcon = ({ img }: ItemIconProps): JSX.Element => (
  <span className="gear-icon">
    {img && <img src={`image/item/${img}`} alt="" loading="lazy" />}
  </span>
)

const WikiLink = ({ name }: { name: string }): JSX.Element => (
  <a href={wikiLink(name)} target="_blank" rel="noopener noreferrer">
    {name}
  </a>
)

// Highest percentage found in a rate such as "1/50 (2%)" or "5–16.67%"
const ratePercent = (drop: GearDrop): number =>
  Math.max(0, ...(drop.rate.match(/[\d.]+(?=%)/g) ?? []).map(Number))

interface DropTableProps {
  drops: GearDrop[]
  sources: Record<string, string>
}

const DropTable = ({ drops, sources }: DropTableProps): JSX.Element => {
  const [showAll, setShowAll] = useState<boolean>(false)
  const sorted = [...drops].sort((a, b) => ratePercent(b) - ratePercent(a))
  const visible = showAll ? sorted : sorted.slice(0, DROPS_PREVIEW_COUNT)

  return (
    <div className="gear-block">
      <h4>💀 Dropped by / found in</h4>
      <div className="gear-table">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Chance</th>
              <th>Where to find it</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((drop, index) => (
              <tr key={index}>
                <td>
                  <WikiLink name={drop.from} />
                  {drop.quantity && <span className="gear-muted"> ×{drop.quantity}</span>}
                </td>
                <td>
                  {drop.rate}
                  {drop.expert && <div className="gear-muted">Expert: {drop.expert}</div>}
                  {drop.note && <div className="gear-muted">{drop.note}</div>}
                </td>
                <td>{sources[drop.from] ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {drops.length > DROPS_PREVIEW_COUNT && (
        <button className="gear-more" type="button" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show less' : `Show all ${drops.length} sources`}
        </button>
      )}
    </div>
  )
}

interface TreeProps {
  data: GearData
  ancestors: string[]
}

interface IngredientNodeProps extends TreeProps {
  name: string
  quantity?: number
  label?: string
  suffix?: string
  children?: ReactNode
}

// An item of a tree, which can be expanded to show how to obtain it
export const IngredientNode = ({
  name,
  quantity,
  label,
  suffix,
  data,
  ancestors,
  children,
}: IngredientNodeProps): JSX.Element => {
  const [open, setOpen] = useState<boolean>(false)
  const node = data.items[name]
  const isLoop = ancestors.includes(name)
  const expandable = hasDetails(node) && !isLoop

  const content = (
    <>
      <ItemIcon img={node?.img} />
      <span>
        {label && <span className="gear-muted">{label} </span>}
        {quantity && quantity > 1 ? `${quantity} × ` : ''}
        {name}
        {suffix && <span className="gear-muted">{suffix}</span>}
      </span>
    </>
  )

  return (
    <li>
      {expandable ? (
        <button
          className="gear-node expandable"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {content}
        </button>
      ) : (
        <div className="gear-node">
          {content}
          {isLoop && <span className="gear-muted">(see above)</span>}
        </div>
      )}
      {open && node && (
        <div className="gear-node-details">
          <NodeDetails name={name} node={node} data={data} ancestors={[...ancestors, name]} />
        </div>
      )}
      {children}
    </li>
  )
}

interface NodeDetailsProps extends TreeProps {
  name: string
  node: GearNode
}

// How to obtain an item: wiki intro, recipes, shimmer and drops
export const NodeDetails = ({ name, node, data, ancestors }: NodeDetailsProps): JSX.Element => (
  <>
    <p className="gear-info">
      {node.info}{' '}
      <a href={wikiLink(name)} target="_blank" rel="noopener noreferrer">
        Wiki&nbsp;↗
      </a>
    </p>
    {node.anyOf && (
      <div className="gear-block">
        <h4>🔀 Any of these</h4>
        <ul className="gear-tree">
          {node.anyOf.map((option) => (
            <IngredientNode key={option} name={option} data={data} ancestors={ancestors} />
          ))}
        </ul>
      </div>
    )}
    {node.recipes?.map((recipe, index) => (
      <div className="gear-block" key={index}>
        <h4>
          🔨 Crafting{node.recipes && node.recipes.length > 1 ? ` (option ${index + 1})` : ''}
          {recipe.amount ? ` · makes ${recipe.amount}` : ''}
        </h4>
        <ul className="gear-tree">
          {recipe.station !== 'By hand' &&
            recipe.station.split(' + ').map((station) => {
              const [stationName, ...alternatives] = station.split(' / ')
              return (
                <IngredientNode
                  key={station}
                  name={stationName}
                  label="Station:"
                  suffix={alternatives.map((alternative) => ` / ${alternative}`).join('')}
                  data={data}
                  ancestors={ancestors}
                />
              )
            })}
          {recipe.ingredients.map(([ingredient, quantity]) => (
            <IngredientNode
              key={ingredient}
              name={ingredient}
              quantity={quantity}
              data={data}
              ancestors={ancestors}
            />
          ))}
        </ul>
      </div>
    ))}
    {node.shimmer && (
      <div className="gear-block">
        <h4>✨ Shimmer</h4>
        <p className="gear-muted">Throw one of these items into Shimmer to transform it:</p>
        <ul className="gear-tree">
          {node.shimmer.map((source) => (
            <IngredientNode key={source} name={source} data={data} ancestors={ancestors} />
          ))}
        </ul>
      </div>
    )}
    {node.drops && <DropTable drops={node.drops} sources={data.sources} />}
  </>
)

interface UpgradeTreeProps extends TreeProps {
  names: string[]
}

// Every weapon or accessory crafted from the item, down to the final upgrade
export const UpgradeTree = ({ names, data, ancestors }: UpgradeTreeProps): JSX.Element => (
  <ul className="gear-tree upgrades">
    {names.map((name) => {
      const next = (data.items[name]?.usedIn ?? []).filter((item) => !ancestors.includes(item))
      return (
        <IngredientNode key={name} name={name} data={data} ancestors={ancestors}>
          {next.length > 0 ? (
            <UpgradeTree names={next} data={data} ancestors={[...ancestors, name]} />
          ) : (
            <span className="gear-final">🏁 final upgrade</span>
          )}
        </IngredientNode>
      )
    })}
  </ul>
)
