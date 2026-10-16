import React from 'react'
import { GEAR_COLLECTION_IDS } from '../helper/gear'
import { Chapter } from '../type/chapter'
import { Collection } from '../type/collection'
import { Page as PageType } from '../type/page'
import ChapterPage from './ChapterPage'
import CollectionPage from './CollectionPage'
import GearPage from './GearPage'
import HomePage from './HomePage'
import './Page.scss'

interface PageProps {
  page: PageType | null | undefined
}

const Page = ({ page }: PageProps): JSX.Element => {
  const isGear = page?.type === 'collection' && GEAR_COLLECTION_IDS.includes(page.content?.id ?? 0)

  return (
    <main id="main-content" tabIndex={-1}>
      {page?.type === 'chapter' && <ChapterPage page={page.content as Chapter} />}
      {page?.type === 'collection' && !isGear && (
        <CollectionPage page={page.content as Collection} />
      )}
      {isGear && <GearPage key={page?.content?.id} page={page?.content as Collection} />}
      {!page && <HomePage />}
    </main>
  )
}

export default Page
