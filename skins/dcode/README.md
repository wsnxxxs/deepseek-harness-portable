# DCode Graphite

[简体中文](README.zh.md)

A Skin Center v2 asset pack inspired by the DCode workbench: paper-white and
graphite palettes, layered panels, rounded controls, and original architectural
vector backgrounds. Both backgrounds are local, static SVGs.

![Light preview](preview/light.jpg)
![Dark preview](preview/dark.jpg)

## Dependencies

Requires DSH Web with `@linxin666/dsh-client-ui-skin-center` enabled. The skin
has no npm dependencies, Cordis rows, executable hooks, or network resources.
Skin Center owns loading, theme switching, background rendering, and cleanup.

The full `@dsh-portable/dcode-ui` workbench is a separate interface plugin;
it is **not required** to use this skin. Git, learning, usage, plugin management,
and other capabilities remain owned by their plugins. Installing this skin
does not install or enable them, and does not change the selected interface.

## Install locally

Copy this complete directory to `$DSH_HOME/skins/dcode/` (normally
`~/.dsh/skins/dcode/`). Refresh the GUI, then select **DCode Graphite** in
Settings → Skin Center. Select the official skin to restore the default look.

Alternatively, from a built dsh-web checkout:

```sh
node scripts/dsh-skin validate /absolute/path/to/skins/dcode
node scripts/dsh-skin install /absolute/path/to/skins/dcode
```

## Contribution

Copy this directory to `packages/skins/skin-center/skins/dcode/` in dsh-web.
Follow its current CONTRIBUTING.md and target `dev` for the skin contribution.
Do not include the Portable workbench or its dependencies in a skin PR.

```sh
node scripts/dsh-skin validate packages/skins/skin-center/skins/dcode
pnpm market:build
node scripts/capture-previews dcode --serve
pnpm market:build
pnpm market:check
pnpm skin-center:check
```

Run the remaining repository gates required by upstream before submitting.
The checked-in previews use upstream's official-facade try-on renderer;
they show the skin on its static shell, not a running agent conversation.

`skin.css` uses L1 tokens and L2 semantic attributes. `patches.css` provides
the small L3 fallback for older shells and static previews using stable
`data-pane`, `data-phase`, and `data-dsh-frame` attributes. No hashed classes,
layout replacement, animations, or script hooks are used. Plugins without
semantic attributes receive token-based styling only.

## License

MIT. Backgrounds and styles are original work by the Portable contributors;
see [LICENSE](LICENSE). Preview shell branding belongs to its respective owners.
