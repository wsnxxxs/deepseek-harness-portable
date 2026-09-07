# DCode Graphite

English | [中文](README.zh.md)

## What it does

A Skin Center v2 asset pack inspired by the DCode workbench: paper-white and graphite palettes, layered panels, rounded controls, and original architectural vector backgrounds. Both backgrounds are local, static SVGs.

![Light preview](preview/light.jpg)
![Dark preview](preview/dark.jpg)

## Install

Requires DSH Web with `@linxin666/dsh-client-ui-skin-center` enabled. Copy this complete directory to `$DSH_HOME/skins/dcode/` (normally `~/.dsh/skins/dcode/`), refresh the GUI, and select **DCode Graphite** in Settings → Skin Center.

Alternatively, from a built dsh-web checkout:

```sh
node scripts/dsh-skin validate /absolute/path/to/skins/dcode
node scripts/dsh-skin install /absolute/path/to/skins/dcode
```

## Config

Use the host's appearance setting to choose light or dark mode. Skin Center owns skin selection, background visibility, and unloading. Select the official skin to restore the default look. Installing this asset does not change the selected interface or enable feature plugins.


The glass material uses 16px blur with 140% saturation. Light surfaces use 68/74/80/86% opacity and dark surfaces use 76/82/88/94% for canvas/panels/cards/dialogs. Panel highlights, layered shadows, a 22px composer, focus feedback, chips, queue cards, and thin conversation scrollbars follow the workbench. Standard task-board, usage, plugin-settings, Git dialog, session-ID panel, and skill-explorer anchors receive matching card or dialog styling when present.

Desktop Acrylic/Mica, custom workbench layout, drag/drop effects, streaming indicators, and component-specific animations require their host or feature components. They are not supplied by this asset. Glass blurs the in-page background; it does not enable native desktop transparency. Full-screen overlays and the conversation are not filtered, keeping fixed-position controls and scrolling independent of a full-screen blur layer.

## Known limitations

This is an appearance pack, not the full Portable workbench. Git, learning, usage, and plugin management remain separate features; `@dsh-portable/dcode-ui` is not required. The skin has no npm dependencies, Cordis rows, executable hooks, or network resources.

`skin.css` uses L1 tokens and L2 semantic attributes. `patches.css` supplies a small L3 fallback using stable `data-pane`, `data-phase`, `data-dsh-frame`, `data-composer-card`, and ARIA menu/listbox attributes. Plugins without semantic attributes receive token-based styling only. Host layout and controls retain their behavior. Previews show upstream's static official-facade try-on shell, not a running agent conversation.

## License

MIT. Backgrounds and styles are original work by the deepseek-harness-portable contributors; see [LICENSE](LICENSE). Preview shell branding belongs to its respective owners.
