import {
  defineTarget,
  type BuildArchitecture,
  type BuildPlatform,
  type NativeAssetRule,
  type TargetSpec,
} from '../../packages/platform-contract/src/index.js'

const commonNativeAssets = (platform: BuildPlatform, arch: BuildArchitecture): NativeAssetRule[] => {
  const target = `${platform}-${arch}`
  return [
    {
      package: 'node-pty',
      source: `prebuilds/${target}`,
      storePrefix: 'node-pty@',
      strategy: 'copy-directory',
    },
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

export const TARGET_SPECS = [
  defineTarget({
    id: 'win32-x64',
    platform: 'win32',
    arch: 'x64',
    electron: { platform: 'win32', arch: 'x64' },
    nativeAssets: [
      ...commonNativeAssets('win32', 'x64'),
    ],
    launchers: ['cmd', 'powershell'],
    formats: ['portable-zip', 'inno-setup'],
    updaterAdapter: 'portable-directory-win32',
    signing: {
      adapter: 'authenticode',
      officialReleaseRequiresEvidence: true,
      credentialEnvironment: ['WINDOWS_SIGNING_CERTIFICATE', 'WINDOWS_SIGNING_PASSWORD'],
    },
    requiredModeSupport: [],
  }),
  defineTarget({
    id: 'darwin-arm64',
    platform: 'darwin',
    arch: 'arm64',
    electron: { platform: 'darwin', arch: 'arm64' },
    nativeAssets: commonNativeAssets('darwin', 'arm64'),
    launchers: ['posix'],
    formats: ['dmg'],
    updaterAdapter: 'manual-release-page',
    signing: {
      adapter: 'codesign-notarization',
      officialReleaseRequiresEvidence: true,
      credentialEnvironment: ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'],
    },
    requiredModeSupport: [],
  }),
  defineTarget({
    id: 'linux-x64',
    platform: 'linux',
    arch: 'x64',
    electron: { platform: 'linux', arch: 'x64' },
    nativeAssets: commonNativeAssets('linux', 'x64'),
    launchers: ['posix'],
    formats: ['app-image', 'deb'],
    updaterAdapter: 'manual-release-page',
    signing: {
      adapter: 'external-package-signing',
      officialReleaseRequiresEvidence: true,
      credentialEnvironment: ['LINUX_PACKAGE_SIGNING_KEY', 'LINUX_PACKAGE_SIGNING_PASSWORD'],
    },
    requiredModeSupport: [],
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
