/**
 * Eidolon delegation shim for mobile-mcp.
 *
 * Per findings/2026-06-17-mobile-next-fork-plan.md: every tool that mobile-mcp
 * exposes is a candidate to delegate to Eidolon when Eidolon is reachable.
 * The shim provides:
 *
 *   1. A type-level mapping from mobile-mcp tool names to Eidolon
 *      VirtualStage methods (the Eidolon trait family is MobileStage,
 *      DesktopStage, SandboxStage, all unified under VirtualStage).
 *
 *   2. A runtime helper `eidolonCall` that, given an Eidolon MCP client,
 *      translates a mobile-mcp tool invocation into the Eidolon equivalent.
 *
 *   3. A feature-flag fallback: if Eidolon is not reachable, the shim is a
 *      no-op and mobile-mcp falls back to its native ios/android adapters.
 *
 * This file does NOT take a dependency on the Eidolon workspace; it speaks
 * the Eidolon MCP transport only, so it can be consumed by mobile-mcp
 * without a workspace-level coupling.
 */

/**
 * Eidolon MCP method names — one per mobile-mcp tool that has an equivalent.
 *
 * Mobile-mcp exposes 25+ tools (see src/server.ts). We only list the ones
 * that map cleanly to Eidolon's VirtualStage surface; the rest stay native.
 */
export type EidolonMethod =
  // VirtualStage core
  | "screenshot"
  | "viewport"
  | "list_devices"
  | "open_session"
  | "close_session"
  | "call"
  // Pointer / key
  | "pointer"
  | "key"
  // MobileStage-specific (subset that has 1:1 mapping)
  | "tap"
  | "swipe"
  | "type_text"
  | "press_button";

/**
 * Tool-name → Eidolon method mapping.
 *
 * The keys are mobile-mcp tool names (from server.ts); the values are
 * Eidolon method names. Mappings not listed here are intentionally native
 * (they have no VirtualStage equivalent, e.g. mobile_list_apps,
 * mobile_install_app).
 */
export const TOOL_TO_EIDOLON: Readonly<Record<string, EidolonMethod>> = {
  mobile_take_screenshot: "screenshot",
  mobile_get_screen_size: "viewport",
  mobile_click_on_screen_at_coordinates: "tap",
  mobile_swipe_on_screen: "swipe",
  mobile_type_keys: "type_text",
  mobile_press_button: "press_button",
  mobile_list_available_devices: "list_devices",
};

export interface EidolonCallRequest {
  readonly method: EidolonMethod;
  readonly sessionId?: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

export interface EidolonCallResponse<T = unknown> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: string;
}

/**
 * Thin transport contract. The real implementation lives in the consuming
 * project (which has Eidolon as a dependency); this file only defines the
 * shape so mobile-mcp can compile against it without taking on Eidolon.
 */
export interface EidolonTransport {
  call<T = unknown>(req: EidolonCallRequest): Promise<EidolonCallResponse<T>>;
  isAvailable(): Promise<boolean>;
}

/**
 * Translate a mobile-mcp tool invocation into an Eidolon call.
 *
 * Returns `null` if the tool has no Eidolon mapping (caller should fall
 * back to the native adapter). Returns `{ method, params }` otherwise.
 */
export function translateToolInvocation(
  toolName: string,
  args: Readonly<Record<string, unknown>>,
): { method: EidolonMethod; params: Readonly<Record<string, unknown>> } | null {
  const method = TOOL_TO_EIDOLON[toolName];
  if (!method) return null;
  return { method, params: args };
}

/**
 * Default no-op transport. The shim compiles without any Eidolon
 * dependency; consumers inject a real transport when available.
 */
export const NullEidolonTransport: EidolonTransport = {
  async call<T = unknown>(_req: EidolonCallRequest): Promise<EidolonCallResponse<T>> {
    return { ok: false, error: "Eidolon transport not configured" } as EidolonCallResponse<T>;
  },
  async isAvailable(): Promise<boolean> {
    return false;
  },
};

/**
 * Helper for tool handlers in server.ts. Try Eidolon first; if it returns
 * `{ ok: false }` or is not available, return `null` so the caller falls
 * back to the native adapter.
 */
export async function tryEidolon<T = unknown>(
  transport: EidolonTransport,
  req: EidolonCallRequest,
): Promise<T | null> {
  if (!(await transport.isAvailable())) return null;
  const res = await transport.call<T>(req);
  return res.ok && res.value !== undefined ? res.value : null;
}