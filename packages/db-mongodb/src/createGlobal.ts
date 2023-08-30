import type { CreateGlobal } from 'payload/database'
import type { PayloadRequest } from 'payload/types'

import type { MongooseAdapter } from './index.js'

import sanitizeInternalFields from './utilities/sanitizeInternalFields.js'
import { withSession } from './withSession.js'

export const createGlobal: CreateGlobal = async function createGlobal(
  this: MongooseAdapter,
  { data, req = {} as PayloadRequest, slug },
) {
  const Model = this.globals
  const global = {
    globalType: slug,
    ...data,
  }
  const options = withSession(this, req.transactionID)

  let [result] = (await Model.create([global], options)) as any

  result = JSON.parse(JSON.stringify(result))

  // custom id type reset
  result.id = result._id
  result = sanitizeInternalFields(result)

  return result
}