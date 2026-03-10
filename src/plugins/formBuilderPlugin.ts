import { Formstest } from '../collections/Formstest'

const PLUGIN_COLLECTIONS = [Formstest]

/** Payload plugin that adds forms collection (API: /api/forms). */
export function formBuilderPlugin(): (incomingConfig: any) => any {
  return (incomingConfig: any) => {
    const existing: any[] = incomingConfig.collections ?? []
    const existingSlugs = new Set(existing.map((c: { slug?: string }) => c.slug))

    const toAdd = PLUGIN_COLLECTIONS.filter((c) => !existingSlugs.has(c.slug))

    return {
      ...incomingConfig,
      collections: [...existing, ...toAdd],
    }
  }
}
