/**
 * Let profile-owned dependency setup mutate `profiles/node_modules`, then heal
 * the installation-owned fallback immediately before the first profile
 * compose. Dependency injection keeps this entry ordering directly testable.
 */
export async function composeAfterManagedFallback<T>(options: {
  readonly virtualRuntime: boolean
  readonly installAnchor: string
  readonly mutate: () => void | Promise<void>
  readonly heal: (options: { installAnchor: string }) => void | Promise<void>
  readonly compose: () => T | Promise<T>
}): Promise<T> {
  await options.mutate()
  if (!options.virtualRuntime) await options.heal({ installAnchor: options.installAnchor })
  return options.compose()
}
