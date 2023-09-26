/* eslint-disable no-restricted-syntax, no-await-in-loop */
import type { DrizzleSnapshotJSON } from 'drizzle-kit/utils'
import type { CreateMigration } from 'payload/database'

import { generateDrizzleJson, generateMigration } from 'drizzle-kit/utils'
import fs from 'fs'

import type { PostgresAdapter } from './types'

import { migrationTableExists } from './utilities/migrationTableExists'

const migrationTemplate = (
  upSQL?: string,
) => `import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres/types'
import { sql } from 'drizzle-orm'

export async function up({ payload }: MigrateUpArgs): Promise<void> {
${
  upSQL
    ? `await payload.db.db.execute(sql\`
${upSQL}\`);
  `
    : '// Migration code'
}
};

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  // Migration code
};
`

export const createMigration: CreateMigration = async function createMigration(
  this: PostgresAdapter,
  payload,
  migrationName,
) {
  payload.logger.info({ msg: 'Creating migration from postgres adapter...' })
  const dir = payload.db.migrationDir
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const [yyymmdd, hhmmss] = new Date().toISOString().split('T')
  const formattedDate = yyymmdd.replace(/\D/g, '')
  const formattedTime = hhmmss.split('.')[0].replace(/\D/g, '')

  const timestamp = `${formattedDate}_${formattedTime}`

  const formattedName = migrationName.replace(/\W/g, '_')
  const fileName = `${timestamp}_${formattedName}.ts`
  const filePath = `${dir}/${fileName}`

  let drizzleJsonBefore: DrizzleSnapshotJSON = {
    id: '00000000-0000-0000-0000-000000000000',
    _meta: {
      columns: {},
      schemas: {},
      tables: {},
    },
    dialect: 'pg',
    enums: {},
    prevId: '00000000-0000-0000-0000-000000000000',
    schemas: {},
    tables: {},
    version: '5',
  }

  const hasMigrationTable = await migrationTableExists(this.db)

  if (hasMigrationTable) {
    const migrationQuery = await payload.find({
      collection: 'payload-migrations',
      limit: 1,
      sort: '-name',
    })

    if (migrationQuery.docs?.[0]?.schema) {
      drizzleJsonBefore = migrationQuery.docs[0]?.schema as DrizzleSnapshotJSON
    }
  }

  const drizzleJsonAfter = generateDrizzleJson(this.schema)
  const sqlStatements = await generateMigration(drizzleJsonBefore, drizzleJsonAfter)

  fs.writeFileSync(
    filePath,
    migrationTemplate(sqlStatements.length ? sqlStatements?.join('\n') : undefined),
  )
  payload.logger.info({ msg: `Migration created at ${filePath}` })
}