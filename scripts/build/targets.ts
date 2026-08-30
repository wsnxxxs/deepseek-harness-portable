import {
  defineTarget,
  type BuildArchitecture,
  type BuildPlatform,
  type ModeExpectation,
  type NativeAssetRule,
  type TargetSpec,
} from '../../packages/platform-contract/src/index.js'

const commonNativeAssets = (platform: BuildPlatform, arch: BuildArchitecture): NativeAssetRule[] => {
  const target = `${platform}-${arch}`
  return [
    {
      package: `@img/sharp-${target}`,
      source: 'lib',
      storePrefix: `@img+sharp-${target}@`,
      strategy: 'copy-directory',
    },
    {
      package: `@koromix/koffi-${target}`,
      source: `${platform}_${arch}/koffi.node`,
      storePrefix: `@koromix+koffi-${target}@`,
      strategy: 'copy-file',
    },
  ]
}

const commonModes = (minimal: ModeExpectation): ModeExpectation[] => [
  { mode: 'standard', minimum: 'native' },
  { mode: 'ptc', minimum: 'native' },
  { mode: 'cordis', minimum: 'native' },
  minimal,
]

export const TARGET_SPECS = [
  defineTarget({
    id: 'win32-x64',
    platform: 'win32',
    arch: 'x64',
    electron: { platform: 'win32', arch: 'x64' },
    nativeAssets: [
      ...commonNativeAssets('win32', 'x64'),
      {
        package: 'node-pty',
        source: 'prebuilds/win32-x64',
        storePrefix: 'node-pty@',
        strategy: 'copy-directory',
      },
    ],
    launchers: ['cmd', 'powershell'],
    formats: ['portable-zip', 'inno-setup'],
    updaterAdapter: 'portable-directory-win32',
    signing: {
      adapter: 'authenticode',
      officialReleaseRequiresEvidence: true,
      credentialEnvironment: ['WINDOWS_SIGNING_CERTIFICATE', 'WINDOWS_SIGNING_PASSWORD'],
    },
    requiredModeSupport: commonModes({
      mode: 'minimal',
      minimum: 'compatible',
      variant: 'win32-wsl',
      runtimeRequirements: ['WSL distribution', 'Bash inside WSL'],
      limitations: ['process-tree-unobservable', 'process-group-signals-emulated'],
    }),
  }),
] as const satisfies readonly TargetSpec[]

const TARGETS_BY_ID = new Map(TARGET_SPECS.map(target => [target.id, target]))

export type TargetId = typeof TARGET_SPECS[number]['id']

/** Resolve one registered target; unsupported platform/arch pairs fail loud. */
export function getTargetSpec(id: string): TargetSpec {
  const target = TARGETS_BY_ID.get(id as TargetId)
  if (target === undefined) {
    throw new Error(`unsupported build target ${JSON.stringify(id)}; use ${TARGET_SPECS.map(item => item.id).join(', ')}`)
  }
  return target
}

/** Compatibility bridge for the old --platform/--arch CLI pair. */
export function getTargetSpecFor(platform: string, arch: string): TargetSpec {
  return getTargetSpec(`${platform}-${arch}`)
}
