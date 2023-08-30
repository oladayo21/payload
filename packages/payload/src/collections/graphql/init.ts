/* eslint-disable no-param-reassign */
import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import type { Field } from '../../fields/config/types.js'
import type { ObjectTypeConfig } from '../../graphql/schema/buildObjectType.js'
import type { Payload } from '../../payload.js'
import type { Collection, SanitizedCollectionConfig } from '../config/types.js'

import forgotPassword from '../../auth/graphql/resolvers/forgotPassword.js'
import init from '../../auth/graphql/resolvers/init.js'
import login from '../../auth/graphql/resolvers/login.js'
import logout from '../../auth/graphql/resolvers/logout.js'
import me from '../../auth/graphql/resolvers/me.js'
import refresh from '../../auth/graphql/resolvers/refresh.js'
import resetPassword from '../../auth/graphql/resolvers/resetPassword.js'
import unlock from '../../auth/graphql/resolvers/unlock.js'
import verifyEmail from '../../auth/graphql/resolvers/verifyEmail.js'
import { fieldAffectsData } from '../../fields/config/types.js'
import buildMutationInputType, {
  getCollectionIDType,
} from '../../graphql/schema/buildMutationInputType.js'
import buildObjectType from '../../graphql/schema/buildObjectType.js'
import buildPaginatedListType from '../../graphql/schema/buildPaginatedListType.js'
import { buildPolicyType } from '../../graphql/schema/buildPoliciesType.js'
import buildWhereInputType from '../../graphql/schema/buildWhereInputType.js'
import formatName from '../../graphql/utilities/formatName.js'
import { formatNames, toWords } from '../../utilities/formatLabels.js'
import { buildVersionCollectionFields } from '../../versions/buildCollectionFields.js'
import createResolver from './resolvers/create.js'
import getDeleteResolver from './resolvers/delete.js'
import { docAccessResolver } from './resolvers/docAccess.js'
import findResolver from './resolvers/find.js'
import findByIDResolver from './resolvers/findByID.js'
import findVersionByIDResolver from './resolvers/findVersionByID.js'
import findVersionsResolver from './resolvers/findVersions.js'
import restoreVersionResolver from './resolvers/restoreVersion.js'
import updateResolver from './resolvers/update.js'

function initCollectionsGraphQL(payload: Payload): void {
  Object.keys(payload.collections).forEach((slug) => {
    const collection: Collection = payload.collections[slug]
    const {
      config,
      config: { fields, graphQL = {} as SanitizedCollectionConfig['graphQL'], versions },
    } = collection

    if (!graphQL) return

    let singularName
    let pluralName
    const fromSlug = formatNames(collection.config.slug)
    if (graphQL.singularName) {
      singularName = toWords(graphQL.singularName, true)
    } else {
      singularName = fromSlug.singular
    }
    if (graphQL.pluralName) {
      pluralName = toWords(graphQL.pluralName, true)
    } else {
      pluralName = fromSlug.plural
    }

    // For collections named 'Media' or similar,
    // there is a possibility that the singular name
    // will equal the plural name. Append `all` to the beginning
    // of potential conflicts
    if (singularName === pluralName) {
      pluralName = `all${singularName}`
    }

    collection.graphQL = {} as Collection['graphQL']

    const idField = fields.find((field) => fieldAffectsData(field) && field.name === 'id')
    const idType = getCollectionIDType(config)

    const baseFields: ObjectTypeConfig = {}

    const whereInputFields = [...fields]

    if (!idField) {
      baseFields.id = { type: idType }
      whereInputFields.push({
        name: 'id',
        type: 'text',
      })
    }

    const forceNullableObjectType = Boolean(versions?.drafts)

    collection.graphQL.type = buildObjectType({
      baseFields,
      fields,
      forceNullable: forceNullableObjectType,
      name: singularName,
      parentName: singularName,
      payload,
    })

    collection.graphQL.paginatedType = buildPaginatedListType(pluralName, collection.graphQL.type)

    collection.graphQL.whereInputType = buildWhereInputType(
      singularName,
      whereInputFields,
      singularName,
    )

    if (config.auth && !config.auth.disableLocalStrategy) {
      fields.push({
        label: 'Password',
        name: 'password',
        required: true,
        type: 'text',
      })
    }

    collection.graphQL.mutationInputType = new GraphQLNonNull(
      buildMutationInputType(payload, singularName, fields, singularName),
    )

    collection.graphQL.updateMutationInputType = new GraphQLNonNull(
      buildMutationInputType(
        payload,
        `${singularName}Update`,
        fields.filter((field) => !(fieldAffectsData(field) && field.name === 'id')),
        `${singularName}Update`,
        true,
      ),
    )

    payload.Query.fields[singularName] = {
      args: {
        draft: { type: GraphQLBoolean },
        id: { type: new GraphQLNonNull(idType) },
        ...(payload.config.localization
          ? {
              fallbackLocale: { type: payload.types.fallbackLocaleInputType },
              locale: { type: payload.types.localeInputType },
            }
          : {}),
      },
      resolve: findByIDResolver(collection),
      type: collection.graphQL.type,
    }

    payload.Query.fields[pluralName] = {
      args: {
        draft: { type: GraphQLBoolean },
        where: { type: collection.graphQL.whereInputType },
        ...(payload.config.localization
          ? {
              fallbackLocale: { type: payload.types.fallbackLocaleInputType },
              locale: { type: payload.types.localeInputType },
            }
          : {}),
        limit: { type: GraphQLInt },
        page: { type: GraphQLInt },
        sort: { type: GraphQLString },
      },
      resolve: findResolver(collection),
      type: buildPaginatedListType(pluralName, collection.graphQL.type),
    }

    payload.Query.fields[`docAccess${singularName}`] = {
      args: {
        id: { type: new GraphQLNonNull(idType) },
      },
      resolve: docAccessResolver(),
      type: buildPolicyType({
        entity: config,
        scope: 'docAccess',
        type: 'collection',
        typeSuffix: 'DocAccess',
      }),
    }

    payload.Mutation.fields[`create${singularName}`] = {
      args: {
        data: { type: collection.graphQL.mutationInputType },
        draft: { type: GraphQLBoolean },
        ...(payload.config.localization
          ? {
              locale: { type: payload.types.localeInputType },
            }
          : {}),
      },
      resolve: createResolver(collection),
      type: collection.graphQL.type,
    }

    payload.Mutation.fields[`update${singularName}`] = {
      args: {
        autosave: { type: GraphQLBoolean },
        data: { type: collection.graphQL.updateMutationInputType },
        draft: { type: GraphQLBoolean },
        id: { type: new GraphQLNonNull(idType) },
        ...(payload.config.localization
          ? {
              locale: { type: payload.types.localeInputType },
            }
          : {}),
      },
      resolve: updateResolver(collection),
      type: collection.graphQL.type,
    }

    payload.Mutation.fields[`delete${singularName}`] = {
      args: {
        id: { type: new GraphQLNonNull(idType) },
      },
      resolve: getDeleteResolver(collection),
      type: collection.graphQL.type,
    }

    if (config.versions) {
      const versionCollectionFields: Field[] = [
        ...buildVersionCollectionFields(config),
        {
          name: 'id',
          type: 'text',
        },
        {
          label: 'Created At',
          name: 'createdAt',
          type: 'date',
        },
        {
          label: 'Updated At',
          name: 'updatedAt',
          type: 'date',
        },
      ]

      collection.graphQL.versionType = buildObjectType({
        fields: versionCollectionFields,
        forceNullable: forceNullableObjectType,
        name: `${singularName}Version`,
        parentName: `${singularName}Version`,
        payload,
      })

      payload.Query.fields[`version${formatName(singularName)}`] = {
        args: {
          id: { type: GraphQLString },
          ...(payload.config.localization
            ? {
                fallbackLocale: { type: payload.types.fallbackLocaleInputType },
                locale: { type: payload.types.localeInputType },
              }
            : {}),
        },
        resolve: findVersionByIDResolver(collection),
        type: collection.graphQL.versionType,
      }
      payload.Query.fields[`versions${pluralName}`] = {
        args: {
          where: {
            type: buildWhereInputType(
              `versions${singularName}`,
              versionCollectionFields,
              `versions${singularName}`,
            ),
          },
          ...(payload.config.localization
            ? {
                fallbackLocale: { type: payload.types.fallbackLocaleInputType },
                locale: { type: payload.types.localeInputType },
              }
            : {}),
          limit: { type: GraphQLInt },
          page: { type: GraphQLInt },
          sort: { type: GraphQLString },
        },
        resolve: findVersionsResolver(collection),
        type: buildPaginatedListType(
          `versions${formatName(pluralName)}`,
          collection.graphQL.versionType,
        ),
      }
      payload.Mutation.fields[`restoreVersion${formatName(singularName)}`] = {
        args: {
          id: { type: GraphQLString },
        },
        resolve: restoreVersionResolver(collection),
        type: collection.graphQL.type,
      }
    }

    if (config.auth) {
      const authFields: Field[] = config.auth.disableLocalStrategy
        ? []
        : [
            {
              name: 'email',
              required: true,
              type: 'email',
            },
          ]
      collection.graphQL.JWT = buildObjectType({
        fields: [
          ...config.fields.filter((field) => fieldAffectsData(field) && field.saveToJWT),
          ...authFields,
          {
            name: 'collection',
            required: true,
            type: 'text',
          },
        ],
        name: formatName(`${slug}JWT`),
        parentName: formatName(`${slug}JWT`),
        payload,
      })

      payload.Query.fields[`me${singularName}`] = {
        resolve: me(collection),
        type: new GraphQLObjectType({
          fields: {
            collection: {
              type: GraphQLString,
            },
            exp: {
              type: GraphQLInt,
            },
            token: {
              type: GraphQLString,
            },
            user: {
              type: collection.graphQL.type,
            },
          },
          name: formatName(`${slug}Me`),
        }),
      }

      payload.Query.fields[`initialized${singularName}`] = {
        resolve: init(collection.config.slug),
        type: GraphQLBoolean,
      }

      payload.Mutation.fields[`refreshToken${singularName}`] = {
        args: {
          token: { type: GraphQLString },
        },
        resolve: refresh(collection),
        type: new GraphQLObjectType({
          fields: {
            exp: {
              type: GraphQLInt,
            },
            refreshedToken: {
              type: GraphQLString,
            },
            user: {
              type: collection.graphQL.JWT,
            },
          },
          name: formatName(`${slug}Refreshed${singularName}`),
        }),
      }

      payload.Mutation.fields[`logout${singularName}`] = {
        resolve: logout(collection),
        type: GraphQLString,
      }

      if (!config.auth.disableLocalStrategy) {
        if (config.auth.maxLoginAttempts > 0) {
          payload.Mutation.fields[`unlock${singularName}`] = {
            args: {
              email: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: unlock(collection),
            type: new GraphQLNonNull(GraphQLBoolean),
          }
        }

        payload.Mutation.fields[`login${singularName}`] = {
          args: {
            email: { type: GraphQLString },
            password: { type: GraphQLString },
          },
          resolve: login(collection),
          type: new GraphQLObjectType({
            fields: {
              exp: {
                type: GraphQLInt,
              },
              token: {
                type: GraphQLString,
              },
              user: {
                type: collection.graphQL.type,
              },
            },
            name: formatName(`${slug}LoginResult`),
          }),
        }

        payload.Mutation.fields[`forgotPassword${singularName}`] = {
          args: {
            disableEmail: { type: GraphQLBoolean },
            email: { type: new GraphQLNonNull(GraphQLString) },
            expiration: { type: GraphQLInt },
          },
          resolve: forgotPassword(collection),
          type: new GraphQLNonNull(GraphQLBoolean),
        }

        payload.Mutation.fields[`resetPassword${singularName}`] = {
          args: {
            password: { type: GraphQLString },
            token: { type: GraphQLString },
          },
          resolve: resetPassword(collection),
          type: new GraphQLObjectType({
            fields: {
              token: { type: GraphQLString },
              user: { type: collection.graphQL.type },
            },
            name: formatName(`${slug}ResetPassword`),
          }),
        }

        payload.Mutation.fields[`verifyEmail${singularName}`] = {
          args: {
            token: { type: GraphQLString },
          },
          resolve: verifyEmail(collection),
          type: GraphQLBoolean,
        }
      }
    }
  })
}

export default initCollectionsGraphQL