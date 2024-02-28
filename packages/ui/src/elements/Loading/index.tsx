'use client'
import { getTranslation } from '@payloadcms/translations'
import React from 'react'

import type { LoadingOverlayTypes } from '../../elements/LoadingOverlay/types'

import { useLoadingOverlay } from '../../elements/LoadingOverlay'
import { useFormProcessing } from '../../forms/Form/context'
import { useTranslation } from '../../providers/Translation'
import './index.scss'

const baseClass = 'loading-overlay'

type Props = {
  animationDuration?: string
  loadingText?: string
  overlayType?: string
  show?: boolean
}

export const LoadingOverlay: React.FC<Props> = ({
  animationDuration,
  loadingText,
  overlayType,
  show = true,
}) => {
  const { t } = useTranslation()

  return (
    <div
      className={[
        baseClass,
        show ? `${baseClass}--entering` : `${baseClass}--exiting`,
        overlayType ? `${baseClass}--${overlayType}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        animationDuration: animationDuration || '500ms',
      }}
    >
      <div className={`${baseClass}__bars`}>
        <div className={`${baseClass}__bar`} />
        <div className={`${baseClass}__bar`} />
        <div className={`${baseClass}__bar`} />
        <div className={`${baseClass}__bar`} />
        <div className={`${baseClass}__bar`} />
      </div>

      <span className={`${baseClass}__text`}>{loadingText || t('general:loading')}</span>
    </div>
  )
}

type UseLoadingOverlayToggleT = {
  loadingText?: string
  name: string
  show: boolean
  type?: LoadingOverlayTypes
}
export const LoadingOverlayToggle: React.FC<UseLoadingOverlayToggleT> = ({
  name: key,
  loadingText,
  show,
  type = 'fullscreen',
}) => {
  const { toggleLoadingOverlay } = useLoadingOverlay()

  React.useEffect(() => {
    toggleLoadingOverlay({
      isLoading: show,
      key,
      loadingText: loadingText || undefined,
      type,
    })

    return () => {
      toggleLoadingOverlay({
        isLoading: false,
        key,
        type,
      })
    }
  }, [show, toggleLoadingOverlay, key, type, loadingText])

  return null
}

type FormLoadingOverlayToggleT = {
  action: 'create' | 'loading' | 'update'
  formIsLoading?: boolean
  loadingSuffix?: string
  name: string
  type?: LoadingOverlayTypes
}
export const FormLoadingOverlayToggle: React.FC<FormLoadingOverlayToggleT> = ({
  name,
  action,
  formIsLoading = false,
  loadingSuffix,
  type = 'fullscreen',
}) => {
  const isProcessing = useFormProcessing()
  const { i18n, t } = useTranslation()

  const labels = {
    create: t('general:creating'),
    loading: t('general:loading'),
    update: t('general:updating'),
  }

  return (
    <LoadingOverlayToggle
      loadingText={`${labels[action]} ${
        loadingSuffix ? getTranslation(loadingSuffix, i18n) : ''
      }`.trim()}
      name={name}
      show={formIsLoading || isProcessing}
      type={type}
    />
  )
}