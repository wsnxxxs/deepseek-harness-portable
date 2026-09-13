# Runtime architecture

The desktop distribution now boots the unmodified official `dsh-v0.1.5-rc.2` Web profile. See [the current architecture and plugin configuration](architecture-layers.md) for the authoritative composition and activation instructions.

## Official default

The launcher initializes the profile and delegates to official `runCli()`. The desktop bridge contributes only process readiness. Optional UI, learning, team and attachment rows are disabled. Built-in management and the dsh-web 0.3.21 management/settings/compatibility components remain enabled; other community features stay disabled.

Electron uses a native title bar. Page styling and custom desktop menus belong to the opt-in desktop-enhancements plugin. No default preload CSS or DOM replacement changes the official page.

## Optional preset provider

The runtime package also exports an ordinary Cordis plugin, selected only by its explicit bundle. It measures the host, compiles supported Portable mode variants into `.system-agent-presets`, and publishes an official AgentPresets child service with that root. Unsupported modes are omitted; an unsupported requested default is replaced with the best supported mode. If no Portable mode is available, the optional plugin fails explicitly; default official startup is unaffected.

Capability reports and mode trace events exist only while this plugin is enabled. Learning uses its own optional source service and normally extends the official preset provider. Combining Learning and the Portable provider requires the root injection shown in the configuration guide.

## Build and distribution

The official submodule is pinned, built, and deployed without functional patches. Both patch inventories are empty. Runtime dependencies are generated from workspace manifests, official profile bundles, and optional plugin requirements. Native platform assets come from the upgraded official workspace, including `native/system`.

Packaging validates the official UI and preset roster, verifies optional plugin files without activating them, then records source identities, dependency hashes, native assets, and file hashes. Default `modeSupport` and patch attestations are empty; this does not claim that optional capability probes ran. Platform containers and immutable release verification remain separate from source tests.

## Session compatibility

Startup automatically migrates earlier Portable / Learning custom-event histories to official v3 logs. Original files remain unchanged; no history is deleted. The startup adapter normalizes known Portable metadata and delegates conversation migration to the unchanged official catalog, strictly validates the result, and atomically publishes a new generation.
