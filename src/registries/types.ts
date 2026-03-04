export type FormioComponents = {
  components: Record<string, unknown> & { component: unknown }
  setComponent: (key: string, cls: unknown) => void
}
