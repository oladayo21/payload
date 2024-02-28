import type { Metadata } from 'next'
import type { SanitizedConfig } from 'payload/types'

import { Logo, MinimalTemplate } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import React, { Fragment } from 'react'

import { getNextI18n } from '../../utilities/getNextI18n'
import { initPage } from '../../utilities/initPage'
import { meta } from '../../utilities/meta'
import { LoginForm } from './LoginForm'
import './index.scss'

const baseClass = 'login'

export const generateMetadata = async ({
  config: configPromise,
}: {
  config: Promise<SanitizedConfig>
}): Promise<Metadata> => {
  const config = await configPromise

  const { t } = await getNextI18n({
    config,
  })

  return meta({
    config,
    description: `${t('authentication:login')}`,
    keywords: `${t('authentication:login')}`,
    title: t('authentication:login'),
  })
}

export const Login: React.FC<{
  config: Promise<SanitizedConfig>
  searchParams: { [key: string]: string | string[] | undefined }
}> = async ({ config: configPromise, searchParams }) => {
  const { config, user } = await initPage({ config: configPromise, route: '/login', searchParams })

  const {
    admin: { components: { afterLogin, beforeLogin } = {}, user: userSlug },
    collections,
    routes: { admin },
  } = config

  if (user) {
    redirect(admin)
  }

  const collectionConfig = collections.find(({ slug }) => slug === userSlug)

  return (
    <MinimalTemplate className={baseClass}>
      <Fragment>
        <div className={`${baseClass}__brand`}>
          <Logo config={config} />
        </div>
        {Array.isArray(beforeLogin) && beforeLogin.map((Component, i) => <Component key={i} />)}
        {!collectionConfig?.auth?.disableLocalStrategy && <LoginForm searchParams={searchParams} />}
        {Array.isArray(afterLogin) && afterLogin.map((Component, i) => <Component key={i} />)}
      </Fragment>
    </MinimalTemplate>
  )
}