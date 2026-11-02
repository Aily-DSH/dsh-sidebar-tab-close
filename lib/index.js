/**
 * Host half of dsh-sidebar-tab-close.
 *
 * The whole behavior lives in the browser half (`./client.js`): it adjusts the
 * right-sidebar close resolution and adds a tab double-click close. The host
 * row exists only so the client bundle is discovered and injected, so this
 * plugin needs no host services and no configuration.
 * @module dsh-sidebar-tab-close
 */

/** Host plugin name, as shown by the plugin roster. */
export const name = 'dsh-sidebar-tab-close';

/**
 * Mount the host row without side effects; the client bundle does the work.
 * @param _ctx - host plugin context (unused).
 */
export function apply(_ctx) {}
