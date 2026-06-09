import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['ja', 'en', 'vi'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
