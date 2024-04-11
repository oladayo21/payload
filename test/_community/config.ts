import path from 'path'
import { getFileByPath } from 'payload/uploads'
import { fileURLToPath } from 'url'

import { buildConfigWithDefaults } from '../buildConfigWithDefaults.js'
import { devUser } from '../credentials.js'
import { CategoriesCollection } from './collections/Categories/index.js'
import { MediaCollection } from './collections/Media/index.js'
import { PostsCollection, postsSlug } from './collections/Posts/index.js'
import { MenuGlobal } from './globals/Menu/index.js'
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfigWithDefaults({
  // ...extend config here
  collections: [CategoriesCollection, PostsCollection, MediaCollection],
  localization: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
  },
  globals: [
    MenuGlobal,
    // ...add more globals here
  ],
  onInit: async (payload) => {
    await payload.create({
      collection: 'users',
      data: {
        email: devUser.email,
        password: devUser.password,
      },
    })

    const category = await payload.create({
      collection: 'categories',
      data: {
        text: 'text',
      },
    })

    const post = await payload.create({
      collection: postsSlug,
      data: {
        category: category.id,
        text: 'example post',
      },
    })

    try {
      const findByID = await payload.find({
        collection: postsSlug,
        where: {
          'category.text': { equals: 'text' },
        },
      })
      console.log(findByID)
    } catch (error) {
      console.log(error)
    }

    // Create image
    const imageFilePath = path.resolve(dirname, '../uploads/image.png')
    const imageFile = await getFileByPath(imageFilePath)

    await payload.create({
      collection: 'media',
      data: {},
      file: imageFile,
    })
  },
})
