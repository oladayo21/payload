import type { CollectionConfig } from 'payload/types'

import { mediaSlug } from '../Media/index.js'

export const postsSlug = 'posts'

export const PostsCollection: CollectionConfig = {
  slug: postsSlug,
  admin: {
    useAsTitle: 'text',
  },
  fields: [
    {
      name: 'text',
      type: 'text',
    },
    {
      type: 'row',
      fields: [],
    },
    {
      name: 'category',
      type: 'relationship',
      localized: true,
      relationTo: 'categories',
    },
    {
      name: 'associatedMedia',
      type: 'upload',
      access: {
        create: () => true,
        update: () => false,
      },
      relationTo: mediaSlug,
    },
  ],
  versions: {
    drafts: true,
  },
}
