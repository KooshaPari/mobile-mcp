# Subsystems — mobile-mcp

> L7 subsystem decomposition. Bounded contexts, ports, owned data, external
> dependencies, and failure modes for the mobile-mcp MCP server (fork of
> mobile-next/mobile-mcp with the Eidolon delegation shim). Companion to
> `README.md` and `EIDOLON_SHIM.md`. Initial decomposition 2026-06-21
> (v16 cycle-6 T1).

## Subsystem map

| Subsystem | Path | Responsibility | Owned data | Critical? |
|---|---|---|---|---|
| MCP server | `src/server.ts` | MCP protocol surface — registers all tools, handles JSON-RPC | session id, tool registry | yes |
| iOS adapter | `src/ios.ts` | iOS device automation via WebDriverAgent / XCUITest | device UDID, WDA session | yes |
| Android adapter | `src/android.ts` | Android automation via adb + uiautomator | device serial, adb session | yes |
| Simulator | `src/iphone-simulator.ts` | iOS Simulator (xcrun simctl) automation | simulator UDID, runtime version | no |
| Device manager | `src/mobile-device.ts` | Device discovery, capability advertise, persistent connection pool | device cache, capabilities | yes |
| WebDriver agent | `src/webdriver-agent.ts` | WDA install / lifecycle on physical iOS devices | WDA bundle id, signing identity | no |
| Image utils | `src/image-utils.ts`, `src/png.ts` | Screenshot post-processing, diff, masking | temp image paths | no |
| Robot | `src/robot.ts` | Tap/swipe/type primitives (device-agnostic) | gesture queue | yes |
| Mobile-CLI bridge | `src/mobilecli.ts` | Delegates to `mobile-cli` subprocess for discovery | CLI argv cache | no |
| Eidolon shim | `src/eidolon-shim.ts` | Optional delegation to KooshaPari/Eidolon VirtualStage | endpoint URL, EidolonMethod registry | no |
| Logger | `src/logger.ts` | Structured JSON logging (consumed by `pheno-tracing`) | log file path | no |
| Utils | `src/utils.ts` | Misc helpers (path, async, retry) | none | no |

## Port catalogue

### Input ports (consumed)

- MCP client JSON-RPC (`stdio` or `sse`) — primary transport.
- `mobile-cli` subprocess — device discovery + low-level ops fallback.
- `pheno-config::Config` — layered config.
- `pheno-errors::Error` envelope.
- `pheno-tracing` OTLP exporter.

### Output ports (produced)

- MCP `tools/list`, `tools/call` — public protocol.
- `EidolonTransport` — `NullEidolonTransport` (no-op) and `HttpEidolonTransport` (live Eidolon endpoint).
- Telemetry events on every tool invocation (via `pheno-tracing`).

## External dependencies

| Dependency | Kind | Used by |
|---|---|---|
| `@modelcontextprotocol/sdk` | npm | server core |
| `playwright` | npm | browser-adjacent tools, image diff |
| `mobile-cli` | Go binary (subprocess) | device discovery |
| `@phenotype/eidolon` | npm (optional) | Eidolon shim |
| `xcrun simctl` | macOS SDK | simulator adapter |
| `adb` | Android SDK | android adapter |
| `WebDriverAgent` | iOS bundle | WDA adapter |
| `pheno-config`, `pheno-errors`, `pheno-tracing` | npm workspace | shared substrate |

## Failure modes

| Subsystem | Failure | Detection | Recovery |
|---|---|---|---|
| MCP server | Tool timeout | MCP request `cancel` after 30s | return partial result with retry hint |
| iOS adapter | WDA crash | WDA process exit / socket close | restart WDA bundle; re-attach |
| Android adapter | adb disconnect | adb `get-state` returns `offline` | reconnect; refresh device list |
| Simulator | simulator runtime missing | `xcrun simctl list` empty | emit `EnvironmentError` |
| Device manager | stale cache | device responds 410 Gone | re-discover via mobile-cli |
| Eidolon shim | endpoint unreachable | `HttpEidolonTransport` connection error | fall back to native adapter; log once |
| Image utils | disk full | ENOSPC on write | surface error; pause screenshot stream |
| Robot | gesture rejected by app | AccessibilityService rejection | retry with backoff; max 3 |

## Change log

- 2026-06-21 — initial decomposition (v16 cycle-6 T1, L7).