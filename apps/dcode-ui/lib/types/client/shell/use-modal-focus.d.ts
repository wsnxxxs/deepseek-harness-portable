import { type RefObject } from 'react';
interface ModalFocusOptions {
    readonly initialFocusRef?: RefObject<HTMLElement | null>;
    readonly onClose?: () => void;
}
/** Focus the first control in a modal, trap Tab, and restore the opener. */
export declare function useModalFocus(open: boolean, panelRef: RefObject<HTMLElement | null>, options?: ModalFocusOptions): void;
export {};
//# sourceMappingURL=use-modal-focus.d.ts.map