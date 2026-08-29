/**
 * Workbench atoms.
 *
 * Deliberately thin: the shared component library (`ui-primitives`) is a
 * platform module and already supplies markdown, code, diff, terminal and
 * icon rendering. What it does not supply is this surface's compact chrome —
 * the card, the popover menu and the two button weights — so only those live
 * here.
 * @module @dsh-portable/dcode-ui/client/shell/ui
 */
import type { CSSProperties, ReactNode } from 'react';
/** Class names other modules compose against (they own their own layout). */
export declare const ui: Record<string, string>;
/** A square control that carries an icon and an accessible name. */
export declare function IconButton(props: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    active?: boolean;
    disabled?: boolean;
    className?: string;
    dataFocusTarget?: string;
}): import("react").JSX.Element;
/** A labelled control. */
export declare function Button(props: {
    children: ReactNode;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
    title?: string;
    className?: string;
    autoFocus?: boolean;
    ariaLabel?: string;
    ariaExpanded?: boolean;
    ariaControls?: string;
}): import("react").JSX.Element;
/** A compact status chip. */
export declare function Pill(props: {
    children: ReactNode;
    className?: string;
    title?: string;
}): import("react").JSX.Element;
/** An added/removed line-count pair, hidden when both are zero. */
export declare function DiffCount(props: {
    insertions: number;
    deletions: number;
}): import("react").JSX.Element | null;
/** One row of a {@link Popover} menu. */
export interface MenuRow {
    readonly id: string;
    readonly label: ReactNode;
    readonly detail?: ReactNode;
    readonly group?: ReactNode;
    readonly icon?: ReactNode;
    readonly active?: boolean;
    readonly disabled?: boolean;
    readonly danger?: boolean;
    readonly onSelect?: () => void;
}
/**
 * A button that opens an anchored menu.
 *
 * Dismissal is owned here (outside pointer, Escape, and selection) so no
 * caller has to repeat it, and the menu is rendered inside the anchor so it
 * inherits the workbench token scope.
 */
export declare function Popover(props: {
    label: string;
    trigger: ReactNode;
    rows?: readonly MenuRow[];
    children?: ReactNode;
    placement?: 'up' | 'down';
    align?: 'start' | 'end';
    disabled?: boolean;
    triggerClassName?: string;
    popoverClassName?: string;
    style?: CSSProperties;
}): import("react").JSX.Element;
/** A centred explanatory state for an empty or unavailable panel. */
export declare function EmptyState(props: {
    children: ReactNode;
}): import("react").JSX.Element;
/** An indeterminate progress mark. */
export declare function Spinner(props?: {
    size?: 'sm' | 'md';
}): import("react").JSX.Element;
/** Shared clipboard action with consistent transient success feedback. */
export declare function CopyButton(props: {
    text: string;
    label: string;
    copiedLabel: string;
    className?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=ui.d.ts.map