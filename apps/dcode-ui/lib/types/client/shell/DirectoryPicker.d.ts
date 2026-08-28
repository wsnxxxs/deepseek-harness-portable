/**
 * The workbench's directory browser.
 *
 * DSH offers two picking backends behind one Remote: a native chooser (the
 * desktop shell) and a host-listed browse (every surface). The official UI
 * selects between them by which package occupies its directory-flow slot —
 * a slot the workbench's own frame does not declare, so it makes the same
 * choice explicitly: try the native chooser first, and browse when there
 * isn't one. That keeps "Open workspace" working identically in the packaged
 * desktop app and in a plain browser tab.
 * @module @dsh-portable/dcode-ui/client/shell/DirectoryPicker
 */
/** Props of the picker dialog. */
export interface DirectoryPickerProps {
    /** The operator chose a directory; the caller adopts it as a workspace. */
    readonly onPicked: (path: string) => void;
    readonly onCancel: () => void;
}
/** A modal directory browser over the host's listing Remote. */
export declare function DirectoryPicker({ onPicked, onCancel }: DirectoryPickerProps): import("react").JSX.Element;
//# sourceMappingURL=DirectoryPicker.d.ts.map