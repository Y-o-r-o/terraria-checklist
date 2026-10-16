// Generates the Weapons and Accessories collections from the Terraria wiki (terraria.wiki.gg).
//
//   node scripts/generate-gear.mjs
//
// Outputs:
//   - database.json         collections #5 (Weapons) and #6 (Accessories), used for the checklist
//   - src/data/gear.json    obtain info, recipes, drops, NPC locations and upgrade paths
//   - src/image/item/*.png  icons of every weapon, accessory, ingredient and crafting station
//
// Wiki API responses are cached in node_modules/.cache/gear, delete it to refetch everything.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/gear')
const IMAGE_DIR = path.join(ROOT, 'src/image/item')
const GEAR_FILE = path.join(ROOT, 'src/data/gear.json')
const DATABASE_FILE = path.join(ROOT, 'database.json')
const API = 'https://terraria.wiki.gg/api.php'
const USER_AGENT = 'terraria-checklist-builder/1.0 (https://github.com/ewauq/terraria-checklist)'

const WEAPONS_COLLECTION = { id: 5, label: 'Weapons', slug: 'weapons', background: '#8c3b2e' }
const ACCESSORIES_COLLECTION = {
  id: 6,
  label: 'Accessories',
  slug: 'accessories',
  background: '#2e6e8c',
}

// Recipe ingredients that accept several items
const INGREDIENT_GROUPS = {
  'Any Iron Bar': ['Iron Bar', 'Lead Bar'],
  'Any Silver Bar': ['Silver Bar', 'Tungsten Bar'],
  'Any Gold Bar': ['Gold Bar', 'Platinum Bar'],
  'Any Cobalt Bar': ['Cobalt Bar', 'Palladium Bar'],
  'Any Mythril Bar': ['Mythril Bar', 'Orichalcum Bar'],
  'Any Adamantite Bar': ['Adamantite Bar', 'Titanium Bar'],
  'Any Wood': [
    'Wood',
    'Boreal Wood',
    'Rich Mahogany',
    'Palm Wood',
    'Ebonwood',
    'Shadewood',
    'Pearlwood',
    'Ash Wood',
  ],
  'Any Sand Block': ['Sand Block', 'Ebonsand Block', 'Crimsand Block', 'Pearlsand Block'],
  'Any Stone Block': ['Stone Block', 'Ebonstone Block', 'Crimstone Block', 'Pearlstone Block'],
  'Any Magic Mirror': ['Magic Mirror', 'Ice Mirror'],
  'Any Balloon': ['Shiny Red Balloon', 'Blizzard in a Balloon', 'Cloud in a Balloon'],
}

// Crafting stations that have an equivalent alternative
const STATION_ALTERNATIVES = {
  'Iron Anvil': 'Lead Anvil',
  'Mythril Anvil': 'Orichalcum Anvil',
  'Adamantite Forge': 'Titanium Forge',
  'Demon Altar': 'Crimson Altar',
}

const WEAPON_CLASSES = [
  { damageType: 'melee', title: '⚔️ Melee' },
  { damageType: 'ranged', title: '🏹 Ranged' },
  { damageType: 'magic', title: '🔮 Magic' },
  { damageType: 'summon', title: '🐉 Summon' },
  { damageType: '', title: '💣 Explosives & other' },
]

// Accessory categories, the first matching category wins
const ACCESSORY_CATEGORIES = [
  {
    title: '🪽 Wings',
    match: (item) =>
      /Wings|Lightwings|Jetpack|Hoverboard|Starboard|Vortex Booster|Nebula Mantle|Prehensile Cloak|Runic Pixie Cloak/.test(
        item.name,
      ),
  },
  {
    title: 'ℹ️ Informational',
    flags: [
      'accWatch',
      'accDepthMeter',
      'accCompass',
      'accFishFinder',
      'accWeatherRadio',
      'accCalendar',
      'accThirdEye',
      'accJarOfSouls',
      'accCritterGuide',
      'accStopwatch',
      'accDreamCatcher',
      'accOreFinder',
    ],
  },
  {
    title: '🎣 Fishing',
    flags: ['fishingSkill', 'accFishingLine', 'accTackleBox', 'accLavaFishing', 'accFishingBobber'],
  },
  {
    title: '🔨 Building & mining',
    flags: [
      'blockRange',
      'tileRangeX',
      'pickSpeed',
      'autoPaint',
      'autoActuator',
      'equippedAnyTileRangeAcc',
      'equippedAnyTileSpeedAcc',
      'equippedAnyWallSpeedAcc',
      'rulerGrid',
      'rulerLine',
      'InfoAccMechShowWires',
      'chiselSpeed',
      'treasureMagnet',
    ],
  },
  {
    title: '👟 Movement',
    flags: [
      'accRunSpeed',
      'rocketBoots',
      'hasJumpOption Cloud',
      'hasJumpOption Blizzard',
      'hasJumpOption Sandstorm',
      'hasJumpOption Fart',
      'hasJumpOption Sail',
      'dashType',
      'jumpBoost',
      'jumpSpeedBoost',
      'waterWalk',
      'waterWalk2',
      'noFallDmg',
      'iceSkate',
      'carpet',
      'slowFall',
      'moveSpeed',
      'autoJump',
      'accFlipper',
      'spikedBoots',
      'desertBoots',
      'gravControl2',
      'hasDeadCellsDownDash',
      'canFloatInWater',
    ],
  },
  {
    title: '🛡️ Defense & survival',
    names: ['Shackle', 'Band of Regeneration'],
    flags: [
      'cciceBarrier',
      'lavaRose',
      'blackBelt',
      'buffImmune',
      'noKnockback',
      'lifeRegen',
      'endurance',
      'longInvince',
      'panic',
      'lavaMax',
      'fireWalk',
      'hasPaladinShield',
      'starCloakItem',
      'honeyCombItem',
      'brainOfConfusionItem',
      'pStone',
      'shinyStone',
      'accDivingHelm',
      'arcticDivingGear',
      'accMerman',
    ],
  },
  {
    title: '💥 Combat',
    flags: [
      'meleeDamage',
      'rangedDamage',
      'magicDamage',
      'minionDamage',
      'meleeCrit',
      'rangedCrit',
      'magicCrit',
      'meleeSpeed',
      'maxMinions',
      'maxTurrets',
      'minionKB',
      'manaCost',
      'magicCuffs',
      'manaFlower',
      'manaMagnet',
      'statManaMax2',
      'manaRegenBonus',
      'kbGlove',
      'magmaStone',
      'yoyoGlove',
      'yoyoString',
      'magicQuiver',
      'hasMoltenQuiver',
      'ammoCost75',
      'ammoCost80',
      'armorPenetration',
      'scope',
      'aggro',
      'skyStoneEffects',
      'autoReuseGlove',
      'meleeScaleGlove',
      'whipRangeMultiplier',
      'tagEffectDuration',
      'empressBrooch',
      'boneGloveItem',
      'volatileGelatin',
      'accPoisonBarb',
      'accSharpBarb',
      'accHoneyedBarb',
      'accSnakeBand',
      'strongBees',
      'sporeSac',
      'stressBall',
      'dd2Accessory',
      'accSentryBackpack',
      'accGolemSentryBackpack',
    ],
  },
  { title: '✨ Miscellaneous', match: () => true },
]

// Accessories that are not gameplay items
const EXCLUDED_ACCESSORY = /Music Box|Monolith|Golf Ball|Film Projector/

// ---------------------------------------------------------------------------
// Wiki API
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchCached(url, binary = false) {
  const key = crypto.createHash('sha1').update(url).digest('hex')
  const file = path.join(CACHE_DIR, key)
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file)
    return binary ? data : JSON.parse(data.toString())
  }

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = binary ? Buffer.from(await response.arrayBuffer()) : await response.json()
      if (!binary && data.error) throw new Error(JSON.stringify(data.error))
      fs.writeFileSync(file, binary ? data : JSON.stringify(data))
      await sleep(150)
      return data
    } catch (error) {
      if (attempt >= 5) throw new Error(`${url}: ${error.message}`)
      await sleep(2000 * attempt)
    }
  }
}

const api = (params) => fetchCached(`${API}?${new URLSearchParams({ format: 'json', ...params })}`)

async function cargo(table, fields) {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const data = await api({ action: 'cargoquery', tables: table, fields, limit: '500', offset })
    rows.push(...data.cargoquery.map((row) => row.title))
    if (data.cargoquery.length < 500) return rows
  }
}

// Resolves page titles in batches, following redirects, and returns { requestedTitle: page }
async function queryPages(titles, params, batchSize) {
  const pages = {}
  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize)
    const data = await api({ action: 'query', redirects: '1', titles: batch.join('|'), ...params })
    const aliases = {}
    for (const { from, to } of [
      ...(data.query.normalized ?? []),
      ...(data.query.redirects ?? []),
    ]) {
      aliases[from] = to
    }
    const byTitle = Object.fromEntries(
      Object.values(data.query.pages).map((page) => [page.title, page]),
    )
    for (const title of batch) {
      let resolved = title
      for (let hops = 0; aliases[resolved] && hops < 5; hops++) resolved = aliases[resolved]
      if (byTitle[resolved]) pages[title] = byTitle[resolved]
    }
  }
  return pages
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function wikiToText(value) {
  return (value ?? '')
    .replace(/\[\[File:[^\]]*\]\]/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<span class="eico[\s\S]*?<\/span><\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#32;/g, ' ')
    .replace(/&nbsp;|&thinsp;|&hairsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}

function parseRate(rate) {
  const modes = rate.match(
    /<span class="m-normal[^"]*">([\s\S]*?)<\/span><span class="m-expert-master">([\s\S]*)<\/span><\/span>/,
  )
  if (!modes) return { rate: wikiToText(rate) }
  const normal = wikiToText(modes[1])
  const expert = wikiToText(modes[2])
  return expert && expert !== normal ? { rate: normal, expert } : { rate: normal }
}

function dropNote(drop) {
  const notes = [
    ...(drop.custom ?? '').matchAll(/class="note(?:-text)?\s*">([\s\S]*?)<\/(?:span|div)>/g),
  ]
    .map((match) => wikiToText(match[1]))
    .filter(Boolean)
  if (drop.normal !== '1' && drop.expert === '1') notes.push('(Expert & Master Mode only)')
  else if (drop.normal !== '1' && drop.expert !== '1' && drop.master === '1') {
    notes.push('(Master Mode only)')
  }
  return notes.join(' ') || undefined
}

function formatEnvironment(environment) {
  return environment
    .split('/')
    .map((part) => part.split('+').join(' + '))
    .join(', ')
}

// Keeps the first paragraph of a wiki page intro, up to a few sentences
function summarize(extract, maxLength = 520) {
  const paragraph = (extract ?? '').trim().split('\n')[0].trim()
  const sentences = paragraph.match(/[^.!?:]+(?:[.!?:]+(?=\s|$)|$)/g) ?? [paragraph]
  let text = ''
  for (const sentence of sentences) {
    // A sentence ending with a colon introduces a list that is not part of the intro
    if (sentence.trim().endsWith(':')) break
    if (text && (text + sentence).length > maxLength) break
    text += sentence
  }
  return (
    text.trim() ||
    paragraph
      .replace(
        /,?\s+(?:that|and|which)?\s*(?:grants?|gives?|provides?|has)\s+the following[^:]*:$/,
        '.',
      )
      .replace(/:$/, '.')
  )
}

// Drop sources that are not NPCs nor wiki pages
function describeSource(source, environmentsByNpc) {
  const bonusDrop = source.match(/^(.+) \(bonus drop\)$/)
  if (bonusDrop && environmentsByNpc.has(bonusDrop[1])) {
    return formatEnvironment([...environmentsByNpc.get(bonusDrop[1])].join('/'))
  }
  const shaking = source.match(/^Shaking (.+)$/)
  if (shaking) return `Hit a ${shaking[1]} with an axe, shaking it sometimes drops items`
  if (source === 'Gold Chest (Dungeon)')
    return 'Locked Gold Chests in the Dungeon (open with a Golden Key)'
  if (source === 'Gold Chest (Pyramid)') return 'Gold Chests inside Pyramids in the Desert'
  return undefined
}

const firstSentence = (text) => (text.match(/^.*?[.!?](?=\s|$)/) ?? [text])[0]

const imageFileName = (name, url) =>
  `${name.replace(/[^\w-]+/g, '_')}${path.extname(new URL(url).pathname).toLowerCase() || '.png'}`

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.mkdirSync(IMAGE_DIR, { recursive: true })
  fs.mkdirSync(path.dirname(GEAR_FILE), { recursive: true })

  console.log('Fetching wiki tables...')
  const items = await cargo(
    'Items',
    'itemid,name,type,damage,damagetype,rare,hardmode,unobtainable,imagefile',
  )
  const recipes = await cargo('Recipes', 'result,amount,version,station,ings,legacy')
  const drops = await cargo(
    'Drops',
    'nameraw,item,quantity,rate,custom,isfromnpc,normal,expert,master',
  )
  const npcs = await cargo('NPCs', 'nameraw,environment')
  const equipFields = Object.keys(
    (await api({ action: 'cargofields', table: 'Equipinfo' })).cargofields,
  )
  const equipInfo = await cargo('Equipinfo', equipFields.join(','))

  // Index tables
  const itemsByName = new Map()
  for (const item of items) {
    const known = itemsByName.get(item.name)
    if (!known || (known.unobtainable === '1' && item.unobtainable !== '1')) {
      itemsByName.set(item.name, item)
    }
  }

  const isCurrentRecipe = (recipe) =>
    recipe.legacy !== '1' && (recipe.version === '' || recipe.version.includes('desktop'))
  const recipesByResult = new Map()
  const shimmerByResult = new Map()
  for (const recipe of recipes.filter(isCurrentRecipe)) {
    const ingredients = recipe.ings
      .split('^')
      .filter(Boolean)
      .map((ingredient) => {
        const [, name, amount] = ingredient.split('¦')
        return [name, Number(amount) || 1]
      })
    if (recipe.station === 'Shimmer') {
      const sources = shimmerByResult.get(recipe.result) ?? []
      shimmerByResult.set(recipe.result, [...sources, ingredients[0][0]])
      continue
    }
    const list = recipesByResult.get(recipe.result) ?? []
    const signature = JSON.stringify([recipe.station, ingredients])
    if (list.some((known) => JSON.stringify([known.station, known.ingredients]) === signature)) {
      continue
    }
    list.push({ station: recipe.station, ingredients, amount: Number(recipe.amount) || 1 })
    recipesByResult.set(recipe.result, list)
  }

  // Ignore conversions and reverse recipes (e.g. Iron Fence -> Iron Bar, Wood Wall -> Wood)
  for (const [result, list] of recipesByResult) {
    const isConversion = (recipe) =>
      recipe.station === 'Chlorophyte Extractinator' ||
      recipe.ingredients.some(
        ([ingredient]) =>
          /(Platform|Fence|Shelf)$/.test(ingredient) ||
          (itemsByName.get(ingredient)?.type ?? '').split('^').includes('wall'),
      ) ||
      recipe.ingredients.some(([ingredient]) =>
        (recipesByResult.get(ingredient) ?? []).some((other) =>
          other.ingredients.some(([name]) => name === result),
        ),
      )
    const kept = list.filter((recipe) => !isConversion(recipe))
    if (kept.length > 0) recipesByResult.set(result, kept)
    else recipesByResult.delete(result)
  }

  const dropsByItem = new Map()
  for (const drop of drops) {
    const list = dropsByItem.get(drop.item) ?? []
    list.push(drop)
    dropsByItem.set(drop.item, list)
  }

  const environmentsByNpc = new Map()
  for (const npc of npcs) {
    if (!npc.environment) continue
    const set = environmentsByNpc.get(npc.nameraw) ?? new Set()
    npc.environment.split('/').forEach((part) => set.add(part))
    environmentsByNpc.set(npc.nameraw, set)
  }

  const equipByItemId = new Map(equipInfo.map((row) => [row.itemid, row]))

  // Select weapons and accessories
  const types = (item) => (item.type ?? '').split('^')
  const isObtainable = (item) =>
    item.unobtainable !== '1' && !types(item).includes('vanity') && !/\(mobile\)/.test(item.name)
  const weapons = [...itemsByName.values()].filter(
    (item) => isObtainable(item) && types(item).includes('weapon'),
  )
  const accessories = [...itemsByName.values()].filter(
    (item) =>
      isObtainable(item) &&
      types(item).includes('accessory') &&
      !types(item).includes('weapon') &&
      !EXCLUDED_ACCESSORY.test(item.name),
  )
  const gearNames = new Set([...weapons, ...accessories].map((item) => item.name))
  console.log(`${weapons.length} weapons, ${accessories.length} accessories`)

  // Walk the recipe trees down to raw materials, collecting every node
  const nodes = new Map()
  const queue = [...gearNames]
  const enqueue = (name) => {
    if (!nodes.has(name) && !queue.includes(name)) queue.push(name)
  }

  while (queue.length > 0) {
    const name = queue.shift()
    if (nodes.has(name)) continue
    const node = {}
    nodes.set(name, node)

    if (INGREDIENT_GROUPS[name]) {
      node.anyOf = INGREDIENT_GROUPS[name]
      node.anyOf.forEach(enqueue)
      continue
    }

    const itemRecipes = recipesByResult.get(name)
    if (itemRecipes) {
      node.recipes = itemRecipes.map(({ station, ingredients, amount }) => {
        const stations = station === 'By Hand' ? [] : station.split(' and ')
        stations.filter((part) => itemsByName.has(part)).forEach(enqueue)
        ingredients.forEach(([ingredient]) => enqueue(ingredient))
        const recipe = { station: stations.map((part) => withAlternative(part)).join(' + ') }
        if (!recipe.station) recipe.station = 'By hand'
        recipe.ingredients = ingredients
        if (amount > 1) recipe.amount = amount
        return recipe
      })
    }

    if (shimmerByResult.has(name)) {
      node.shimmer = [...new Set(shimmerByResult.get(name))]
      node.shimmer.forEach(enqueue)
    }

    const itemDrops = dropsByItem.get(name)
    if (itemDrops) node.drops = itemDrops
  }

  function withAlternative(station) {
    return STATION_ALTERNATIVES[station] ? `${station} / ${STATION_ALTERNATIVES[station]}` : station
  }

  // Upgrade paths: which weapons/accessories use this weapon/accessory as an ingredient
  for (const [name, node] of nodes) {
    if (!gearNames.has(name) || !node.recipes) continue
    const ingredientNames = new Set(
      node.recipes.flatMap((recipe) =>
        recipe.ingredients.flatMap(([ingredient]) => INGREDIENT_GROUPS[ingredient] ?? [ingredient]),
      ),
    )
    for (const ingredient of ingredientNames) {
      if (!gearNames.has(ingredient) || ingredient === name) continue
      const ingredientNode = nodes.get(ingredient)
      ingredientNode.usedIn = [...new Set([...(ingredientNode.usedIn ?? []), name])].sort()
    }
  }

  // Wiki intros: how to obtain each item, and where drop containers are found
  const dropSources = new Set(
    [...nodes.values()].flatMap((node) => (node.drops ?? []).map((drop) => drop.nameraw)),
  )
  const containerSources = [...dropSources].filter((source) => !environmentsByNpc.has(source))
  console.log(`Fetching intros of ${nodes.size} items and ${containerSources.length} containers...`)
  const extracts = await queryPages(
    [...new Set([...nodes.keys(), ...containerSources])],
    { prop: 'extracts', exintro: '1', explaintext: '1', exlimit: 'max' },
    20,
  )

  const sources = {}
  for (const source of dropSources) {
    const environments = environmentsByNpc.get(source)
    if (environments) {
      sources[source] = formatEnvironment([...environments].join('/'))
    } else if (describeSource(source, environmentsByNpc)) {
      sources[source] = describeSource(source, environmentsByNpc)
    } else if (extracts[source]?.extract) {
      sources[source] = firstSentence(summarize(extracts[source].extract))
    }
  }

  // Icons
  console.log('Fetching icons...')
  const fileTitles = new Map(
    [...nodes.keys()]
      .filter((name) => !INGREDIENT_GROUPS[name])
      .map((name) => [name, `File:${itemsByName.get(name)?.imagefile || `${name}.png`}`]),
  )
  const imageInfo = await queryPages(
    [...new Set(fileTitles.values())],
    { prop: 'imageinfo', iiprop: 'url' },
    50,
  )
  const usedImages = new Set()
  for (const [name, title] of fileTitles) {
    const url = imageInfo[title]?.imageinfo?.[0]?.url
    if (!url) continue
    const fileName = imageFileName(name, url)
    const target = path.join(IMAGE_DIR, fileName)
    if (!fs.existsSync(target)) fs.writeFileSync(target, await fetchCached(url, true))
    nodes.get(name).img = fileName
    usedImages.add(fileName)
  }
  for (const file of fs.readdirSync(IMAGE_DIR)) {
    if (!usedImages.has(file)) fs.rmSync(path.join(IMAGE_DIR, file))
  }

  // Final node shape
  const output = {}
  for (const name of [...nodes.keys()].sort()) {
    const node = nodes.get(name)
    const item = itemsByName.get(name)
    const entry = {}
    if (node.img) entry.img = node.img
    if (item && gearNames.has(name)) entry.meta = describe(item)
    const info = summarize(extracts[name]?.extract)
    if (info) entry.info = info
    if (node.anyOf) entry.anyOf = node.anyOf
    if (node.recipes) entry.recipes = node.recipes
    if (node.shimmer) entry.shimmer = node.shimmer
    if (node.drops) entry.drops = formatDrops(node.drops)
    if (node.usedIn) entry.usedIn = node.usedIn
    output[name] = entry
  }

  function formatDrops(itemDrops) {
    const seen = new Set()
    return itemDrops
      .map((drop) => {
        const entry = { from: drop.nameraw, ...parseRate(drop.rate) }
        const quantity = wikiToText(drop.quantity)
        if (quantity && quantity !== '1') entry.quantity = quantity
        const note = dropNote(drop)
        if (note) entry.note = note
        return entry
      })
      .filter((entry) => {
        const key = JSON.stringify(entry)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }

  fs.writeFileSync(GEAR_FILE, JSON.stringify({ items: output, sources }) + '\n')

  // Checklist collections
  const database = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'))
  const collections = database.collections.filter(
    (collection) => ![WEAPONS_COLLECTION.id, ACCESSORIES_COLLECTION.id].includes(collection.id),
  )
  collections.push({ ...WEAPONS_COLLECTION, items: weaponItems(weapons) })
  collections.push({ ...ACCESSORIES_COLLECTION, items: accessoryItems(accessories, equipByItemId) })
  database.collections = collections
  fs.writeFileSync(DATABASE_FILE, JSON.stringify(database, null, 2) + '\n')

  console.log(`Wrote ${Object.keys(output).length} items to ${path.relative(ROOT, GEAR_FILE)}`)
}

// Approximate progression order: Pre-Hardmode first, then by rarity
function progression(item) {
  const rarity = Number(item.rare)
  const hardmode = item.hardmode === '1' ? 1 : 0
  if (Number.isNaN(rarity)) return hardmode * 100 + 4
  if (rarity < 0) return hardmode * 100 + (hardmode ? 7 : 2)
  return hardmode * 100 + rarity
}

const byProgression = (a, b) => progression(a) - progression(b) || a.name.localeCompare(b.name)

function describe(item) {
  const parts = []
  if (item.damagetype) parts.push(item.damagetype[0].toUpperCase() + item.damagetype.slice(1))
  const damage = wikiToText(item.damage).split(' ')[0]
  if (damage) parts.push(`${damage} damage`)
  parts.push(item.hardmode === '1' ? 'Hardmode' : 'Pre-Hardmode')
  return parts.join(' · ')
}

function toEntry(item) {
  return { id: Number(item.itemid), name: item.name }
}

function weaponItems(weapons) {
  const list = []
  for (const { damageType, title } of WEAPON_CLASSES) {
    const inClass = weapons
      .filter((item) => (item.damagetype ?? '').toLowerCase() === damageType)
      .sort(byProgression)
    for (const [phase, hardmode] of [
      ['Pre-Hardmode', false],
      ['Hardmode', true],
    ]) {
      const inPhase = inClass.filter((item) => (item.hardmode === '1') === hardmode)
      if (inPhase.length === 0) continue
      list.push(`${title} · ${phase}`, ...inPhase.map(toEntry))
    }
  }
  return list
}

function accessoryItems(accessories, equipByItemId) {
  const groups = ACCESSORY_CATEGORIES.map((category) => ({ ...category, items: [] }))
  for (const item of accessories) {
    const equip = equipByItemId.get(item.itemid) ?? {}
    const hasFlag = (flag) => equip[flag] && equip[flag] !== '0'
    const group = groups.find((category) =>
      category.match
        ? category.match(item)
        : category.names?.includes(item.name) || category.flags.some(hasFlag),
    )
    group.items.push(item)
  }
  return groups
    .filter((group) => group.items.length > 0)
    .flatMap((group) => [group.title, ...group.items.sort(byProgression).map(toEntry)])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
