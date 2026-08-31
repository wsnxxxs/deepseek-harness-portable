/** Glass-styled, portal-backed select menu used by the DCode settings fallback. */
import type { ReactNode } from 'react';
export interface SelectMenuOption {
    readonly id: string;
    readonly label: ReactNode;
    readonly detail?: ReactNode;
    readonly disabled?: boolean;
}
export interface SelectMenuProps {
    readonly value: string;
    readonly options: readonly SelectMenuOption[];
    readonly onChange: (value: string) => void;
    readonly ariaLabel: string;
    readonly placeholder?: ReactNode;
    readonly disabled?: boolean;
}
/** A native-select replacement that stays inside DCode's visual language. */
export declare function SelectMenu({ value, options, onChange, ariaLabel, placeholder, disabled }: SelectMenuProps): import("react").JSX.Element;
//# sourceMappingURL=SelectMenu.d.ts.map