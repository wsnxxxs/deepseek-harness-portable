/**
 * Let profile-owned dependency setup mutate `profiles/node_modules`, then heal
 * the installation-owned fallback immediately before the first profile
 * compose. Dependency injection keeps this entry ordering directly testable.
 */
export async function composeAfterManagedFallback(options) {
    await options.mutate();
    if (!options.virtualRuntime)
        await options.heal({ installAnchor: options.installAnchor });
    return options.compose();
}
//# sourceMappingURL=profile-startup.js.map