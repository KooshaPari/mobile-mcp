# Eidolon Shim — mobile-mcp fork

This fork adds an optional **Eidolon delegation shim** so that every
mobile-mcp tool with a clean Eidolon `VirtualStage` equivalent can
route through `KooshaPari/Eidolon` instead of mobile-mcp's native
iOS/Android adapters.

## What this shim does

1. **Type-level mapping** (`EidolonMethod`, `TOOL_TO_EIDOLON`):
   declares which mobile-mcp tools have a `VirtualStage` equivalent.
2. **Runtime helper** (`translateToolInvocation`, `tryEidolon`):
   translates a mobile-mcp tool invocation into an Eidolon MCP call,
   falling back to the native adapter when Eidolon is unavailable.
3. **No-op default transport** (`NullEidolonTransport`): lets the
   fork compile and run without an Eidolon dependency.

## Why this matters

`KooshaPari/Eidolon` already has a `VirtualStage` trait family that
unifies mobile, desktop, sandbox, and browser modalities under one
abstraction. mobile-mcp's 25+ tools are excellent — but they only cover
mobile. By delegating the subset that maps cleanly, mobile-mcp becomes
a *thin iOS/Android surface* on top of a *unified device abstraction*.

This is the same pattern Anthropic's computer-use MCP, the CUA SDK,
and mobile-next themselves converge on: **one MCP, many modalities**.

## Activation

The shim is dormant by default. To enable Eidolon delegation, the
consumer (e.g. an agent runtime) injects an `EidolonTransport` and
calls `tryEidolon(...)` from each tool handler in `server.ts`. A
follow-up PR will wire this for the 7 mapped tools:

| mobile-mcp tool | Eidolon method |
|---|---|
| `mobile_take_screenshot` | `screenshot` |
| `mobile_get_screen_size` | `viewport` |
| `mobile_click_on_screen_at_coordinates` | `tap` |
| `mobile_swipe_on_screen` | `swipe` |
| `mobile_type_keys` | `type_text` |
| `mobile_press_button` | `press_button` |
| `mobile_list_available_devices` | `list_devices` |

## Coordination

- **Substrate owner:** `agent-platform` (T66: `DeviceStage` port).
- **Domain owner:** see `findings/2026-06-17-eidolon-absorption.md`.
- **ADR reference:** ADR-023 (app-effort governance), T66 in DAG v7.

## Versioning

This shim is **opt-in**. The default behavior of mobile-mcp is
unchanged when no `EidolonTransport` is injected.