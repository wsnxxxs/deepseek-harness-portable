import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { UsageCards, usageCardStyles } from "./UsageCards.js";
import classes from './ModelsUsageCard.module.css';
const css = usageCardStyles(classes);
/** Render the shared statistics card in the official settings token domain. */
export function ModelsUsageCard({ useSessions, t }) {
    const list = useSessions(snapshot => snapshot);
    return (_jsxs("section", { className: classes.section, children: [_jsx("h2", { className: classes.title, children: t('usage.title') }), _jsx("p", { className: classes.intro, children: t('usage.body') }), _jsx(UsageCards, { list: list, t: t, styles: css })] }));
}
//# sourceMappingURL=ModelsUsageCard.js.map