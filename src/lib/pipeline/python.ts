import { build, kernelSteps, outcomeTail } from "./common";
import type { Outcome, SourceConfig, Step } from "./types";

export function pythonSteps(payload: string, outcome: Outcome, cfg: SourceConfig): Step[] {
  const { body, valid } = outcomeTail(payload, cfg);
  const msg = JSON.stringify(payload);
  const H = "handler" as const;
  const drafts = [
    ...kernelSteps(cfg, payload, { name: "epoll_wait returns to selectors", code: "events = self._selector.select(timeout)", file: "asyncio/base_events.py" }),
    { zone: "runtime" as const, node: "loop", ownerNode: "server", owner: "asyncio.Server", title: "Event loop iteration", explanation: "The single-threaded loop's _run_once() got the listen FD back from the selector and schedules its reader callback via call_soon.", socketState: "LISTEN", queue: ["ready: [_accept_connection]"], handlerState: "not started", code: { file: "event_loop.py", snippet: "self._ready.append(handle)" } },
    { zone: "runtime" as const, node: "server", ownerNode: "server", owner: "asyncio.Server", title: "sock.accept() — non-blocking", explanation: `Server calls accept() up to backlog (${cfg.acceptors}) times per wakeup, sets the new socket non-blocking, and wraps it in a transport.`, socketState: "ESTABLISHED", queue: [], handlerState: "not started", code: { file: "server.py", snippet: `await asyncio.start_server(handle, port=${cfg.port}, backlog=${cfg.acceptors})` } },
    { zone: "runtime" as const, node: "transport", ownerNode: "transport", owner: "_SelectorSocketTransport", title: "Transport + StreamReader", explanation: "The transport owns the FD and registers it for EVENT_READ. A StreamReaderProtocol buffers incoming bytes for coroutines.", socketState: "ESTABLISHED · registered EVENT_READ", queue: ["StreamReader buffer: b''"], handlerState: "not started", code: { file: "event_loop.py", snippet: "selector.register(fd, EVENT_READ, (reader, None))" } },
    { zone: H, node: "task", ownerNode: "transport", owner: "Task(handle)", title: "Handler Task created", explanation: "client_connected_cb is wrapped in a Task. The coroutine runs until its first await, then yields back to the loop.", socketState: "ESTABLISHED", queue: ["ready: [Task.__step]"], handlerState: "awaiting reader.readline()", code: { file: "handler.py", snippet: "line = await reader.readline()" } },
  ];
  const tail =
    outcome === "frame"
      ? [
          { zone: H, node: "task", ownerNode: "transport", owner: "Task(handle)", title: "Bytes fed to StreamReader", explanation: `Selector reports the client FD readable; transport recv()s ${msg}, feed_data() wakes the Future the Task awaits.`, socketState: "ESTABLISHED", queue: [`buffer: ${msg}`], handlerState: "resumed", code: { file: "event_loop.py", snippet: "self._protocol.data_received(data)" } },
          valid
            ? { zone: "outcome" as const, node: "task", ownerNode: "transport", owner: "Task(handle)", title: "Frame parsed and echoed", explanation: `Body ${JSON.stringify(body)} is written back; await writer.drain() applies backpressure.`, socketState: "ESTABLISHED", queue: [], handlerState: "replied", code: { file: "protocol.py", snippet: `if line.startswith(b"${cfg.prefix}") and body: ...` } }
            : { zone: "outcome" as const, node: "task", ownerNode: "transport", owner: "Task(handle)", title: "Frame rejected", explanation: `Payload lacks ${JSON.stringify(cfg.prefix)} + body; protocol raises ValueError, handler writes an error line.`, socketState: "ESTABLISHED", queue: [], handlerState: "replied ERR", code: { file: "protocol.py", snippet: 'raise ValueError("bad frame")' } },
        ]
      : outcome === "close"
        ? [{ zone: "outcome" as const, node: "task", ownerNode: "transport", owner: "Task(handle)", title: "EOF → readline() returns b''", explanation: "recv() returned 0 bytes. feed_eof() completes the read with empty bytes; the handler closes the writer and the Task finishes.", socketState: "CLOSE_WAIT → CLOSED", queue: [], handlerState: "done", code: { file: "handler.py", snippet: "if not line: writer.close(); await writer.wait_closed()" } }]
        : [{ zone: "outcome" as const, node: "task", ownerNode: "transport", owner: "Task(handle)", title: "ConnectionResetError", explanation: "recv() raised ECONNRESET. The transport calls connection_lost(exc); the awaiting readline() raises inside the Task, which logs and exits. The loop keeps running.", socketState: "CLOSED (reset)", queue: [], handlerState: "raised ConnectionResetError", code: { file: "handler.py", snippet: "except ConnectionResetError: log.warning(...)" } }];
  return build("python", cfg, [...drafts, ...tail]);
}
