import { build, kernelSteps, outcomeTail } from "./common";
import type { Outcome, SourceConfig, Step } from "./types";

export function odinSteps(payload: string, outcome: Outcome, cfg: SourceConfig): Step[] {
  const { body, valid } = outcomeTail(payload, cfg);
  const msg = JSON.stringify(payload);
  const t = 0;
  const thread = `thread_${t}`;
  const drafts = [
    ...kernelSteps(cfg, payload, { name: "Blocked accept() returns", code: "client, src, err := net.accept_tcp(listener)", file: "core:net" }),
    { zone: "runtime" as const, node: "listener", ownerNode: "listener", owner: "main thread", title: "Listener FD", explanation: `main.odin bound and listened on port ${cfg.port}. core:net is a thin wrapper over the OS socket API — explicit, but not zero-abstraction.`, socketState: "LISTEN", queue: ["accept queue: 1"], handlerState: "not started", code: { file: "server.odin", snippet: `listener := net.listen_tcp({net.IP4_Any, ${cfg.port}}) or_return` } },
    { zone: "runtime" as const, node: "accept_loop", ownerNode: "accept_loop", owner: "accept loop (main thread)", title: "accept_tcp returns a raw fd", explanation: "The accept loop now holds a TCP_Socket — a distinct integer type over the fd. No GC, no finalizer: whoever holds it must close it.", socketState: "ESTABLISHED", queue: [], handlerState: "not started", code: { file: "server.odin", snippet: "client, _ := net.accept_tcp(listener) or_continue" } },
    { zone: "runtime" as const, node: thread, ownerNode: thread, owner: `worker thread ${t}`, title: `Hand fd to worker thread (pool of ${cfg.acceptors})`, explanation: "Ownership is explicit: the fd is moved into a thread-pool task. The accept loop must not touch it again.", socketState: "ESTABLISHED", queue: [`task queue: [client fd]`], handlerState: "spawned", code: { file: "main.odin", snippet: `thread.pool_add_task(&pool, context.allocator, handle_client, rawptr(uintptr(client)))` } },
    { zone: "handler" as const, node: `handler_${t}`, ownerNode: `handler_${t}`, owner: `handle_client (thread ${t})`, title: "Blocking recv on the worker", explanation: "The worker blocks in recv_tcp(). The kernel parks the OS thread until bytes arrive — simple and predictable, one thread per in-flight connection.", socketState: "ESTABLISHED", queue: ["buf: [1024]u8"], handlerState: "defer net.close(client)", code: { file: "handler.odin", snippet: "defer net.close(client)\nn, err := net.recv_tcp(client, buf[:])" } },
  ];
  const tail =
    outcome === "frame"
      ? [
          { zone: "handler" as const, node: `handler_${t}`, ownerNode: `handler_${t}`, owner: `handle_client (thread ${t})`, title: "recv returns bytes", explanation: `recv copied ${msg} from sk_receive_queue into the stack buffer.`, socketState: "ESTABLISHED", queue: [`buf[:n] = ${msg}`], handlerState: "parsing", code: { file: "handler.odin", snippet: "frame := string(buf[:n])" } },
          valid
            ? { zone: "outcome" as const, node: `handler_${t}`, ownerNode: `handler_${t}`, owner: `handle_client (thread ${t})`, title: "Frame parsed and echoed", explanation: `Body ${JSON.stringify(body)} sent with send_tcp. Short writes must be looped manually.`, socketState: "ESTABLISHED", queue: [], handlerState: "replied", code: { file: "protocol.odin", snippet: `if strings.has_prefix(frame, "${cfg.prefix}") { ... }` } }
            : { zone: "outcome" as const, node: `handler_${t}`, ownerNode: `handler_${t}`, owner: `handle_client (thread ${t})`, title: "Frame rejected", explanation: "parse_frame returns .Bad_Frame; handler sends ERR.", socketState: "ESTABLISHED", queue: [], handlerState: "replied ERR", code: { file: "protocol.odin", snippet: "return {}, .Bad_Frame" } },
        ]
      : outcome === "close"
        ? [{ zone: "outcome" as const, node: `handler_${t}`, ownerNode: `handler_${t}`, owner: `handle_client (thread ${t})`, title: "recv returns 0", explanation: "Zero bytes = orderly shutdown. The proc returns, the deferred net.close releases the fd, and the thread goes back to the pool.", socketState: "CLOSE_WAIT → CLOSED", queue: [], handlerState: "returned · fd closed", code: { file: "handler.odin", snippet: "if n == 0 do return" } }]
        : [{ zone: "outcome" as const, node: `handler_${t}`, ownerNode: `handler_${t}`, owner: `handle_client (thread ${t})`, title: "recv error: Connection_Reset", explanation: "recv returns an error enum. Odin has no exceptions — the handler checks err, returns, and defer closes the fd.", socketState: "CLOSED (reset)", queue: [], handlerState: "returned with error", code: { file: "handler.odin", snippet: "if err != nil { log.warn(err); return }" } }];
  return build("odin", cfg, [...drafts, ...tail]);
}
