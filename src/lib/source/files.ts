import type { Language } from "@/lib/pipeline/types";

export type SourceFiles = Record<string, string>;

export const DEFAULT_SOURCES: Record<Language, SourceFiles> = {
  elixir: {
    "main.exs": `defmodule Demo do
  def parse("ECHO " <> body) when body != "", do: {:ok, body}
  def parse(_), do: {:error, :bad_frame}
end

IO.inspect(Demo.parse("ECHO ping"))
IO.inspect(Demo.parse("ECHO "))
`,
    "application.ex": `defmodule WireIngest.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {ThousandIsland,
       port: 4000,
       handler_module: WireIngest.Handler,
       num_acceptors: 10}
    ]

    Supervisor.start_link(children, strategy: :one_for_one, name: WireIngest.Supervisor)
  end
end
`,
    "handler.ex": `defmodule WireIngest.Handler do
  use GenServer, restart: :temporary

  def start_link(socket), do: GenServer.start_link(__MODULE__, socket)

  @impl true
  def init(socket), do: {:ok, socket}

  # Called by the acceptor after start_child:
  #   :gen_tcp.controlling_process(socket, handler_pid)
  def handle_cast(:arm, socket) do
    :inet.setopts(socket, active: :once)
    {:noreply, socket}
  end

  @impl true
  def handle_info({:tcp, socket, data}, socket) do
    reply =
      case WireIngest.Protocol.parse(data) do
        {:ok, body} -> body
        {:error, :bad_frame} -> "ERR bad_frame\\n"
      end

    :gen_tcp.send(socket, reply)
    :inet.setopts(socket, active: :once)
    {:noreply, socket}
  end

  def handle_info({:tcp_closed, _}, s), do: {:stop, :normal, s}
  def handle_info({:tcp_error, _, reason}, s), do: {:stop, reason, s}
end
`,
    "protocol.ex": `defmodule WireIngest.Protocol do
  @prefix "ECHO "

  def parse(@prefix <> body) when body != "", do: {:ok, body}
  def parse(_), do: {:error, :bad_frame}
end
`,
    "supervision_tree.ex": `# Conceptual tree (ThousandIsland internals)
#
# WireIngest.Supervisor
# └── ThousandIsland.Server
#     ├── ThousandIsland.Listener        (owns listen socket)
#     └── ThousandIsland.AcceptorPoolSupervisor
#         └── AcceptorSupervisor × num_acceptors
#             ├── Acceptor               (loops on :gen_tcp.accept)
#             └── DynamicSupervisor      (starts :temporary handlers)
#                 └── WireIngest.Handler
`,
  },
  python: {
    "server.py": `import asyncio
from handler import handle

PORT = 4000
BACKLOG = 100

async def main():
    server = await asyncio.start_server(handle, port=PORT, backlog=BACKLOG)
    async with server:
        await server.serve_forever()

asyncio.run(main())
`,
    "event_loop.py": `# How asyncio's loop sees readiness (simplified)
#
# while True:
#     events = selector.select(timeout)     # epoll_wait
#     for key, mask in events:
#         self._ready.append(key.data)      # reader callback
#     for handle in ready: handle._run()   # accept / data_received
`,
    "handler.py": `import asyncio, logging
from protocol import parse

async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    try:
        while line := await reader.readline():
            try:
                writer.write(parse(line))
            except ValueError:
                writer.write(b"ERR bad_frame\\n")
            await writer.drain()
    except ConnectionResetError:
        logging.warning("peer reset")
    finally:
        writer.close()
        await writer.wait_closed()
`,
    "protocol.py": `PREFIX = "ECHO "

def parse(line: bytes) -> bytes:
    text = line.decode().rstrip("\\n")
    if text.startswith(PREFIX) and text[len(PREFIX):]:
        return text[len(PREFIX):].encode()
    raise ValueError("bad frame")
`,
  },
  nodejs: {
    "server.ts": `import net from "node:net";
import { onConnection } from "./handler";

const PORT = 4000;
const server = net.createServer(onConnection);
server.maxConnections = 100;
server.listen(PORT);
`,
    "event_loop.ts": `// libuv loop phases (per iteration)
// timers → pending → idle/prepare → POLL → check → close
//
// TCP accept/read readiness is handled in POLL on the main thread.
// The libuv threadpool is only for fs, dns.lookup, crypto, zlib.
// After each JS callback, V8 drains the microtask queue.
`,
    "handler.ts": `import type { Socket } from "node:net";
import { parseFrame } from "./protocol";

export function onConnection(socket: Socket) {
  socket.on("data", (chunk: Buffer) => {
    const r = parseFrame(chunk.toString());
    socket.write(r.ok ? r.body : "ERR bad_frame\\n");
  });
  socket.on("end", () => socket.end());
  socket.on("error", (e) => console.warn(e.message));
}
`,
    "protocol.ts": `export const PREFIX = "ECHO ";

export function parseFrame(line: string) {
  if (line.startsWith(PREFIX) && line.length > PREFIX.length) {
    return { ok: true as const, body: line.slice(PREFIX.length) };
  }
  return { ok: false as const, error: "bad_frame" };
}
`,
  },
  odin: {
    "main.odin": `package wire_ingest

import "core:thread"

THREADS :: 8

main :: proc() {
    pool: thread.Pool
    thread.pool_init(&pool, context.allocator, THREADS)
    thread.pool_start(&pool)
    serve(&pool)
}
`,
    "server.odin": `package wire_ingest

import "core:net"
import "core:thread"

PORT :: 4000

serve :: proc(pool: ^thread.Pool) {
    listener, err := net.listen_tcp({net.IP4_Any, PORT})
    if err != nil do return
    for {
        client, _, aerr := net.accept_tcp(listener)
        if aerr != nil do continue
        thread.pool_add_task(pool, context.allocator, handle_client, rawptr(uintptr(client)))
    }
}
`,
    "handler.odin": `package wire_ingest

import "core:net"
import "core:thread"

handle_client :: proc(t: thread.Task) {
    client := net.TCP_Socket(uintptr(t.data))
    defer net.close(client)
    buf: [1024]u8
    for {
        n, err := net.recv_tcp(client, buf[:])
        if err != nil || n == 0 do return
        body, perr := parse_frame(string(buf[:n]))
        net.send_tcp(client, transmute([]u8)(perr == nil ? body : "ERR bad_frame\\n"))
    }
}
`,
    "protocol.odin": `package wire_ingest

import "core:strings"

PREFIX :: "ECHO "

Frame_Error :: enum { None, Bad_Frame }

parse_frame :: proc(s: string) -> (string, Frame_Error) {
    if strings.has_prefix(s, PREFIX) && len(s) > len(PREFIX) {
        return s[len(PREFIX):], .None
    }
    return "", .Bad_Frame
}
`,
  },
};
