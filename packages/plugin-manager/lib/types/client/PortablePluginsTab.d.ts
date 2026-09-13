/**
 * The built-in features page of the official Plugins settings section.
 *
 * It answers the question upstream's read-only inventory cannot: which of this
 * distribution's own feature packages are live, and how do I switch one off.
 * The rows come straight off the running Loader, so a build that ships a new
 * feature lists it here without this component learning its name.
 * @module @dsh-portable/plugin-manager/client/PortablePluginsTab
 */
import type { ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { PortablePluginApi } from './rpc.ts';
/** Registration-side operations, bound to the channel by the plugin body. */
export interface PortablePluginsTabInjected {
    /** The typed `/portable-plugins` face. */
    readonly api: PortablePluginApi;
}
export type PortablePluginsTabProps = PropsRuntime<'settings.plugins.tab'> & PropsLocale<'portablePlugins'> & InjectFace<PortablePluginsTabInjected>;
/** The built-in features page. */
export declare function PortablePluginsTab(props: PortablePluginsTabProps): ReactNode;
//# sourceMappingURL=PortablePluginsTab.d.ts.map