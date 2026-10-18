import { build, kernelSteps, outcomeTail } from "./common";
import type { Outcome, SourceConfig, Step } from "./types";

export function nodejsSteps(payload: string, outcome: Outcome, cfg: SourceConfig): Step[] {
  const { body, valid } = outcomeTail(payload, cfg);
  const msg = JSON.stringify(payload);
  const H = "handler" as const;
  const drafts = [
    ...kernelSteps(cfg, payload, { name: "epoll wakes libuv poll phase", code: "uv__io_poll(loop, timeout) → epoll_wait", file: "deps/uv/src/unix/linux.c" }),
    { zone: "runtime" as const, node: "uv_poll", ownerNode: "server", owner: "uv_tcp_t (server)", title: "libuv poll phase", explanation: "The main thread's event loop is in the poll phase. TCP readiness is handled right here on the loop thread — not in the libuv threadpool, which is for fs/dns/crypto.", socketState: "LISTEN", queue: ["io watchers: listen fd"], handlerState: "not started", code: { file: "event_loop.ts", snippet: "// poll phase: uv__server_io → accept4()" } },
    { zone: "runtime" as const, node: "server", ownerNode: "server", owner: "net.Server", title: "uv_accept → 'connection'", explanation: `libuv accept4()s the FD (non-blocking) and wraps it in a uv_tcp_t. Node creates a net.Socket and emits 'connection'. maxConnections = ${cfg.acceptors}.`, socketState: "ESTABLISHED", queue: [], handlerState: "not started", code: { file: "server.ts", snippet: `server.maxConnections = ${cfg.acceptors}; server.listen(${cfg.port})` } },
    { zone: "runtime" as const, node: "callbacks", ownerNode: "socket", owner: "net.Socket", title: "V8 runs the JS callback", explanation: "The C++ binding calls into V8 with the socket object. Your connection listener runs to completion; then microtasks (Promises) drain before libuv continues.", socketState: "ESTABLISHED · reading", queue: ["microtasks: []"], handlerState: "registered 'data'/'end'/'error'", code: { file: "handler.ts", snippet: "socket.on('data', onData)" } },
  ];
  const tail =
    outcome === "frame"
      ? [
          { zone: H, node: "socket", ownerNode: "socket", owner: "net.Socket", title: "'data' event", explanation: `libuv read ${msg} into a buffer; the stream emits a Buffer to the 'data' listener on the next callback turn.`, socketState: "ESTABLISHED", queue: [`Buffer<${msg}>`], handlerState: "onData()", code: { file: "handler.ts", snippet: "function onData(chunk: Buffer) {" } },
          valid
            ? { zone: "outcome" as const, node: "socket", ownerNode: "socket", owner: "net.Socket", title: "Frame parsed and echoed", explanation: `Body ${JSON.stringify(body)} is written; socket.write() returns false if the kernel send buffer is full — wait for 'drain'.`, socketState: "ESTABLISHED", queue: ["microtasks: []"], handlerState: "replied", code: { file: "protocol.ts", snippet: `if (line.startsWith("${cfg.prefix}") && body) socket.write(body)` } }
            : { zone: "outcome" as const, node: "socket", ownerNode: "socket", owner: "net.Socket", title: "Frame rejected", explanation: `Payload lacks ${JSON.stringify(cfg.prefix)} + body; parseFrame returns an error result and the handler writes ERR.`, socketState: "ESTABLISHED", queue: [], handlerState: "replied ERR", code: { file: "protocol.ts", snippet: "return { ok: false, error: 'bad_frame' }" } },
        ]
      : outcome === "close"
        ? [{ zone: "outcome" as const, node: "socket", ownerNode: "socket", owner: "net.Socket", title: "'end' then 'close'", explanation: "read() returned 0 (FIN). The stream emits 'end'; with allowHalfOpen=false Node ends its side too, then emits 'close' and the uv handle is freed.", socketState: "CLOSE_WAIT → CLOSED", queue: [], handlerState: "closed", code: { file: "handler.ts", snippet: "socket.on('end', () => socket.end())" } }]
        : [{ zone: "outcome" as const, node: "socket", ownerNode: "socket", owner: "net.Socket", title: "'error' ECONNRESET", explanation: "libuv reports UV_ECONNRESET. The socket emits 'error' then 'close'. Without an 'error' listener this would crash the process.", socketState: "CLOSED (reset)", queue: [], handlerState: "error handled", code: { file: "handler.ts", snippet: "socket.on('error', (e) => log(e.code))" } }];
  return build("nodejs", cfg, [...drafts, ...tail]);
}
