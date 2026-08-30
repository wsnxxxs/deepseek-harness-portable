/** Build a stable, directory-first tree from repository-relative paths. */
export function buildFileTree(files) {
    const root = new Map();
    for (const file of files) {
        let level = root;
        let path = '';
        const parts = file.path.split('/').filter(Boolean);
        parts.forEach((name, index) => {
            path = path === '' ? name : `${path}/${name}`;
            let node = level.get(name);
            if (node === undefined) {
                node = { name, path, children: new Map() };
                level.set(name, node);
            }
            if (index === parts.length - 1)
                node.file = file;
            level = node.children;
        });
    }
    const freeze = (nodes) => [...nodes.values()]
        .sort((left, right) => Number(left.file !== undefined) - Number(right.file !== undefined) || left.name.localeCompare(right.name))
        .map((node) => {
        const children = freeze(node.children);
        return {
            ...node,
            children,
            fileCount: node.file === undefined ? children.reduce((count, child) => count + child.fileCount, 0) : 1,
        };
    });
    return freeze(root);
}
/** Apply the path query and exact porcelain status filter without changing group membership. */
export function filterGitFiles(files, query, status) {
    const needle = query.trim().toLocaleLowerCase();
    return files.filter(file => (status === 'all' || file.status === status)
        && (needle === '' || file.path.toLocaleLowerCase().includes(needle)));
}
/** Turn expanded tree state into fixed-height rows suitable for windowing. */
export function flattenFileTree(nodes, isExpanded, depth = 0) {
    const rows = [];
    for (const node of nodes) {
        if (node.file !== undefined) {
            rows.push({ kind: 'file', name: node.name, path: node.path, depth, file: node.file });
            continue;
        }
        const expanded = isExpanded(node);
        rows.push({
            kind: 'directory', name: node.name, path: node.path, depth,
            fileCount: node.fileCount, expanded,
        });
        if (expanded)
            rows.push(...flattenFileTree(node.children, isExpanded, depth + 1));
    }
    return rows;
}
/** Calculate the small row window that should enter the DOM. */
export function virtualRange(count, scrollTop, viewportHeight, rowHeight, overscan = 5) {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan;
    return { start, end: Math.min(count, Math.max(start, visibleEnd)) };
}
//# sourceMappingURL=fileTree.js.map