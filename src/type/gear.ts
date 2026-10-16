export type GearRecipe = {
  station: string
  ingredients: [string, number][]
  amount?: number
}

export type GearDrop = {
  from: string
  rate: string
  expert?: string
  quantity?: string
  note?: string
}

export type GearNode = {
  img?: string
  meta?: string
  info?: string
  anyOf?: string[]
  recipes?: GearRecipe[]
  shimmer?: string[]
  drops?: GearDrop[]
  usedIn?: string[]
}

export type GearData = {
  items: Record<string, GearNode>
  sources: Record<string, string>
}
