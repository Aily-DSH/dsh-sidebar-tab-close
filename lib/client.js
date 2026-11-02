/**
 * Browser half of dsh-sidebar-tab-close.
 *
 * The right sidebar owns `ctx.sidebarRight` (the controller behind the pane
 * commands). Two behaviors are adjusted here, entirely through that public
 * face and the owner markup:
 *
 * 1. Ctrl+W prefers the active sidebar tab. The built-in `page.close` command
 *    resolves `sidebar.focusedTarget()` and only closes a tab when focus is
 *    inside the panel; with focus in the conversation it closes the window.
 *    `focusedTarget` is wrapped so an open sidebar falls back to the active
 *    pane target, which makes `page.close` close that tab instead.
 * 2. Double-clicking a sidebar tab closes it: the tab element is re-read with
 *    `focusedTarget`, then closed through `canCloseTarget`/`closeTarget`, so
 *    the same eligibility rules (sole guide tab, close handlers) still apply.
 *
 * Both hooks are installed on `apply` and removed with the plugin's effect
 * scope; every failure is contained so a stale DOM shape can never break the
 * sidebar itself.
 * @module dsh-sidebar-tab-close/client
 */

window.__ModuleLoader__.load({
	id: "dsh-sidebar-tab-close",
	factory: () => {
		var module = { exports: {} };
		var exports = module.exports;

		/** Owner markup for one sidebar tab. */
		const TAB_SELECTOR = "[data-dockkit-tab], [data-sidebar-right-tab]";
		/** Inner affordance that keeps its own click handling (the close control). */
		const CONTROL_SELECTOR = "button, [role='button']";

		/**
		 * Read the tab element containing an event target.
		 * @param node - event target or node below the tab strip.
		 * @returns the tab element, or null outside a tab.
		 */
		function tabOf(node) {
			const element = node instanceof Element ? node : node instanceof Node ? node.parentElement : null;
			return element === null ? null : element.closest(TAB_SELECTOR);
		}

		/**
		 * Close the tab the double-click landed on, when the sidebar allows it.
		 * @param sidebar - the `sidebarRight` controller face.
		 * @param event - the captured double-click.
		 */
		function closeTabAt(sidebar, event) {
			if (event.defaultPrevented || event.button !== 0) return;
			const tab = tabOf(event.target);
			if (tab === null) return;
			const control = event.target instanceof Element ? event.target.closest(CONTROL_SELECTOR) : null;
			if (control !== null && control !== tab) return;
			try {
				const target = sidebar.focusedTarget(tab);
				if (target === void 0 || !sidebar.canCloseTarget(target)) return;
				event.preventDefault();
				event.stopPropagation();
				sidebar.closeTarget(target);
			} catch (error) {
				console.warn("[dsh-sidebar-tab-close] double-click close failed", error);
			}
		}

		/** Delay that still reads as one double click. */
		const DOUBLE_PRESS_MS = 450;
		/** Last left press, so double clicks survive owners that cancel native ones. */
		let lastPress = null;

		/**
		 * Close the tab on the second left press of a double click.
		 *
		 * The tab strip cancels the native pointer sequence (so `dblclick` never
		 * reaches us), therefore the presses are counted here instead.
		 * @param sidebar - the `sidebarRight` controller face.
		 * @param event - the captured pointer release.
		 */
		function closeTabOnSecondPress(sidebar, event) {
			if (event.button !== 0 || event.pointerType === "touch") return;
			const tab = tabOf(event.target);
			if (tab === null) {
				lastPress = null;
				return;
			}
			const control = event.target instanceof Element ? event.target.closest(CONTROL_SELECTOR) : null;
			if (control !== null && control !== tab) {
				lastPress = null;
				return;
			}
			const key = tab.getAttribute("data-dockkit-tab") ?? tab.getAttribute("data-sidebar-right-tab") ?? "";
			const now = Date.now();
			const repeated = lastPress !== null && lastPress.key === key && now - lastPress.at <= DOUBLE_PRESS_MS;
			lastPress = { key, at: now };
			if (!repeated) return;
			lastPress = null;
			closeTabAt(sidebar, event);
		}

		/** Services this client plugin requires. */
		const inject = ["sidebarRight"];

		/**
		 * Install both behaviors for the lifetime of the plugin.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			const sidebar = ctx.sidebarRight;
			if (sidebar === void 0 || sidebar === null || typeof sidebar.focusedTarget !== "function") return;
			const original = sidebar.focusedTarget;
			/** Re-entrancy guard: `commandTarget` calls `focusedTarget` internally. */
			let fallingBack = false;
			const focusedTarget = function (element) {
				const direct = original.call(this, element);
				if (direct !== void 0 || fallingBack) return direct;
				if (typeof this.isExpanded === "function" && !this.isExpanded()) return direct;
				fallingBack = true;
				try {
					const active = typeof this.commandTarget === "function" ? this.commandTarget(element) : void 0;
					return active !== void 0 && active.tabId !== void 0 ? active : direct;
				} catch (error) {
					console.warn("[dsh-sidebar-tab-close] active tab fallback failed", error);
					return direct;
				} finally {
					fallingBack = false;
				}
			};
			sidebar.focusedTarget = focusedTarget;
			const onDoubleClick = (event) => closeTabAt(sidebar, event);
			document.addEventListener("dblclick", onDoubleClick, true);
			const onPointerUp = (event) => closeTabOnSecondPress(sidebar, event);
			document.addEventListener("pointerup", onPointerUp, true);
			ctx.effect(() => () => {
				document.removeEventListener("dblclick", onDoubleClick, true);
				document.removeEventListener("pointerup", onPointerUp, true);
				if (sidebar.focusedTarget === focusedTarget) sidebar.focusedTarget = original;
			}, "dsh-sidebar-tab-close: sidebar tab close");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
