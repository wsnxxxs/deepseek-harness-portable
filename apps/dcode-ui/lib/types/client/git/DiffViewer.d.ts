export interface DiffViewerProps {
    readonly cwd: string;
    readonly path: string;
    readonly staged: boolean;
    readonly onClose: () => void;
}
export declare function DiffViewer({ cwd, path, staged, onClose }: DiffViewerProps): import("react").JSX.Element;
//# sourceMappingURL=DiffViewer.d.ts.map