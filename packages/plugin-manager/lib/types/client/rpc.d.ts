/**
 * Typed browser face of the `/portable-plugins` channel.
 *
 * The host answers with the `{ ok, value } | { ok, error }` envelope; this
 * module's job is to keep the tab off `unknown` and to turn a transport
 * rejection into the same envelope a business refusal produces, so a settings
 * page degrades to an explanatory empty state rather than a crash.
 * @module @dsh-portable/plugin-manager/client/rpc
 */
import { type PortablePluginList, type PortablePluginResult, type PortablePluginToggle } from '../host/contract.ts';
/** The Connection RPC face this module needs. */
export interface RpcCarrier {
    rpc: {
        call(channel: string, endpoint: string, payload: unknown): Promise<unknown>;
    };
}
/** The built-in feature roster, as the settings tab consumes it. */
export interface PortablePluginApi {
    /** Whether a Connection carrier was available when this face was created. */
    readonly available: boolean;
    list(): Promise<PortablePluginResult<PortablePluginList>>;
    setEnabled(name: string, enabled: boolean): Promise<PortablePluginResult<PortablePluginToggle>>;
}
/**
 * Build the browser face over one Connection carrier.
 * @param carrier - the connection service, or undefined when none is present.
 * @returns the typed API.
 */
export declare function createPortablePluginApi(carrier: RpcCarrier | undefined): PortablePluginApi;
//# sourceMappingURL=rpc.d.ts.map