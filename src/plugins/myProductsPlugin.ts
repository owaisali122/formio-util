import { Products } from '../collections/Products'

/** Payload plugin that adds the Products collection. Compatible with Payload's Plugin type. */
export function myProductsPlugin(): (incomingConfig: any) => any {
  return (incomingConfig: any) => {
    const existingCollections: any[] = incomingConfig.collections ?? []
    const alreadyRegistered = existingCollections.some(
      (c: { slug?: string }) => c.slug === Products.slug,
    )
    return {
      ...incomingConfig,
      collections: alreadyRegistered
        ? existingCollections
        : [...existingCollections, Products],
    }
  }
}
