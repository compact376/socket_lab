import{n as e}from"./rolldown-runtime-CbXtAM7H.js";import{i as t,r as n}from"./index-DP3C-Brm.js";var r=e(t(),1),i={acceptors:10,prefix:`ECHO `,activeMode:`once`,handoff:!0,requireBody:!0,port:4e3};function a(e,t=i.acceptors){let n=typeof e==`number`?e:Number.parseInt(String(e??``),10);return!Number.isFinite(n)||Number.isNaN(n)?t:Math.min(100,Math.max(1,Math.trunc(n)))}function o(e){return e.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g,``).slice(0,256)}function s(e){return{...i,...e,acceptors:a(e?.acceptors)}}function c(e,t,n){let r=[];return n.map((n,i)=>(r.includes(n.node)||r.push(n.node),{...n,id:n.id??`${e}-${i}`,language:e,acceptors:t.acceptors,path:[...r]}))}function l(e,t,n){let r=new TextEncoder().encode(t).length+40,i=(e,t,n,r,i,a=[],o=``,s=`linux/net`)=>({zone:e,node:t,ownerNode:t,title:n,explanation:r,owner:e===`hardware`?`NIC hardware`:`Linux kernel`,socketState:i,queue:a,handlerState:`not started`,code:{file:s,snippet:o}});return[i(`hardware`,`nic`,`Frame arrives at the NIC`,`An Ethernet frame carrying a TCP segment (~${r} bytes incl. headers) for port ${e.port} lands in the NIC's RX FIFO. The MAC verifies the FCS checksum.`,`SYN_RECV → ESTABLISHED (handshake done)`,[],`rx_ring[head] = frame;`,`drivers/net/ethernet`),i(`hardware`,`dma`,`DMA into the RX ring`,`The NIC writes the frame straight into a pre-allocated ring buffer in RAM by DMA — no CPU copy — and advances the descriptor head.`,`ESTABLISHED`,[`rx_desc[n]`],`dma_map_single(dev, buf, len, DMA_FROM_DEVICE);`,`drivers/net/ethernet`),i(`kernel`,`irq`,`Hardware interrupt (IRQ)`,`The NIC raises an MSI-X interrupt. The top-half handler does almost nothing: it masks further IRQs and schedules NAPI polling.`,`ESTABLISHED`,[`rx_desc[n]`],`napi_schedule(&q->napi);`,`drivers/net/ethernet`),i(`kernel`,`napi`,`SoftIRQ / NAPI poll`,`NET_RX_SOFTIRQ runs the driver's poll() in a batch, draining descriptors with interrupts still masked — this is how Linux avoids interrupt storms.`,`ESTABLISHED`,[`rx_desc[n]`],`work = napi->poll(napi, budget);`,`net/core/dev.c`),i(`kernel`,`skb`,`sk_buff built`,`Each frame becomes a struct sk_buff. GRO may coalesce segments; the IP and TCP layers validate headers and look up the socket by 4-tuple.`,`ESTABLISHED`,[`skb`],`sk = __inet_lookup_skb(&tcp_hashinfo, skb, ...);`,`net/ipv4/tcp_ipv4.c`),i(`kernel`,`sock`,`Queued on struct sock`,`The connection's struct sock is found. For a new connection the completed child socket sits in the listener's accept queue; payload bytes go to sk_receive_queue.`,`ESTABLISHED`,[`sk_receive_queue: skb`],`tcp_queue_rcv(sk, skb, &fragstolen);`,`net/ipv4/tcp_input.c`),i(`kernel`,`fdt`,`File-descriptor table`,`accept() installs the child socket into the process FD table. From here user space only ever sees a small integer.`,`ESTABLISHED · fd allocated`,[`accept queue: 1`],`fd_install(newfd, newfile);`,`net/socket.c`),i(`kernel`,`accept_q`,`Accept queue ready`,`The listening socket is now readable: its accept queue holds a completed connection waiting for the runtime.`,`LISTEN (listener) · ESTABLISHED (child)`,[`accept queue: 1`],`sk->sk_data_ready(sk);`,`net/ipv4/inet_connection_sock.c`),{...i(`kernel`,`poll`,n.name,`The readiness notifier (epoll on Linux, kqueue on BSD/macOS) marks the FD ready and wakes whatever is blocked waiting on it.`,`ESTABLISHED`,[`ready list: fd`],n.code,n.file),owner:`Linux kernel → runtime`}]}function u(e,t){let n=e.startsWith(t.prefix)?e.slice(t.prefix.length):null;return{body:n,valid:n!==null&&(!t.requireBody||n.trim().length>0)}}function d(e,t){let n=0;for(let t of e)n=n*31+t.charCodeAt(0)>>>0;return n%Math.max(1,t)}function f(e,t,n){let r=d(e,n.acceptors),i=`acceptor_${r}`,a=`handler_${r}`,{body:o,valid:s}=u(e,n),f=`runtime`,p=(e,t,n)=>({node:e,ownerNode:t,owner:n}),m=[{...p(`listener`,`listener`,`Listener (port owner)`),zone:f,title:`Listener holds the listen socket`,explanation:`ThousandIsland.Listener opened :gen_tcp.listen(${n.port}) at boot and owns the listen socket. It shares it with every acceptor; it never accepts itself.`,socketState:`LISTEN`,queue:[`accept queue: 1`],handlerState:`not started`,code:{file:`application.ex`,snippet:`{ThousandIsland, port: ${n.port}, handler_module: WireIngest.Handler}`}},{...p(i,`accept_q`,`Acceptor ${r} (blocked in accept)`),zone:f,title:`Acceptor ${r} wakes from :gen_tcp.accept/1`,explanation:`${n.acceptors} acceptor processes all block in accept on the same listen socket. BEAM's :inet driver registered the FD with epoll; the wakeup lands on one scheduler and acceptor ${r} wins the race.`,socketState:`ESTABLISHED`,queue:[`mailbox: []`],handlerState:`not started`,code:{file:`supervision_tree.ex`,snippet:`num_acceptors: ${n.acceptors}`}},{...p(i,i,`Acceptor ${r}`),zone:f,title:`Port created; acceptor owns socket`,explanation:`accept returns a port (the BEAM's wrapper around the FD). The process that called accept is the controlling process — messages from the socket go to its mailbox.`,socketState:`ESTABLISHED · passive`,queue:[`mailbox: []`],handlerState:`not started`,code:{file:`handler.ex`,snippet:`{:ok, socket} = :gen_tcp.accept(listen_socket)`}},{...p(`dyn_sup_${r}`,i,`Acceptor ${r}`),zone:f,title:`DynamicSupervisor starts a handler`,explanation:`The acceptor asks its sibling DynamicSupervisor to start a :temporary handler GenServer, so a crashing connection never takes down the acceptor pool.`,socketState:`ESTABLISHED · passive`,queue:[`mailbox: []`],handlerState:`starting (init/1)`,code:{file:`supervision_tree.ex`,snippet:`DynamicSupervisor.start_child(sup, {Handler, socket})`}},n.handoff?{...p(a,a,`Handler ${r}`),zone:`handler`,title:`Ownership handoff`,explanation:`The acceptor transfers control so the socket's messages go to the handler's mailbox, then loops back to accept the next connection.`,socketState:`ESTABLISHED · passive`,queue:[`mailbox: []`],handlerState:`running`,code:{file:`handler.ex`,snippet:`:gen_tcp.controlling_process(socket, handler_pid)`}}:{...p(a,i,`Acceptor ${r} (no handoff!)`),zone:`handler`,title:`Missing ownership handoff`,explanation:`Your saved source has no controlling_process/2 call. Socket messages still go to the acceptor's mailbox — the handler will never see data, and the acceptor is stuck serving one client.`,socketState:`ESTABLISHED · passive`,queue:[`acceptor mailbox`],handlerState:`running · starved`,code:{file:`handler.ex`,snippet:`# controlling_process/2 not found`}},{...p(a,n.handoff?a:i,n.handoff?`Handler ${r}`:`Acceptor ${r}`),zone:`handler`,title:`Arm active: ${n.activeMode}`,explanation:n.activeMode===`once`?`active: :once delivers exactly one {:tcp, socket, data} message, then flips back to passive. Built-in backpressure: the handler re-arms only when ready.`:n.activeMode===`true`?`active: true streams every packet into the mailbox as fast as it arrives — no backpressure, the mailbox can grow without bound.`:`Passive mode: the handler must call :gen_tcp.recv/2 explicitly and block.`,socketState:`ESTABLISHED · active=${n.activeMode}`,queue:[],handlerState:`waiting for data`,code:{file:`handler.ex`,snippet:`:inet.setopts(socket, active: :${n.activeMode===`false`?`false`:n.activeMode})`}}],h=n.handoff?a:i,g=JSON.stringify(e),_=t===`frame`?[{node:a,ownerNode:h,owner:`Handler ${r}`,zone:`handler`,title:`{:tcp, socket, data} in mailbox`,explanation:`The port driver read the bytes from sk_receive_queue and sent a message: {:tcp, #Port<>, ${g}}.`,socketState:`ESTABLISHED · passive (once consumed)`,queue:[`{:tcp, port, ${g}}`],handlerState:`handle_info/2`,code:{file:`handler.ex`,snippet:`def handle_info({:tcp, socket, data}, state)`}},s?{node:a,ownerNode:h,owner:`Handler ${r}`,zone:`outcome`,title:`Frame parsed and echoed`,explanation:`Protocol matched prefix ${JSON.stringify(n.prefix)} with body ${JSON.stringify(o)}. Handler replies with :gen_tcp.send/2 and re-arms active: :once.`,socketState:`ESTABLISHED`,queue:[],handlerState:`replied · re-armed`,code:{file:`protocol.ex`,snippet:`def parse("${n.prefix}" <> body) when body != "", do: {:ok, body}`}}:{node:a,ownerNode:h,owner:`Handler ${r}`,zone:`outcome`,title:`Frame rejected`,explanation:`Payload does not match ${JSON.stringify(n.prefix)} + non-empty body. Handler sends an error line and keeps the connection.`,socketState:`ESTABLISHED`,queue:[],handlerState:`replied {:error, :bad_frame}`,code:{file:`protocol.ex`,snippet:`def parse(_), do: {:error, :bad_frame}`}}]:t===`close`?[{node:a,ownerNode:h,owner:`Handler ${r}`,zone:`outcome`,title:`{:tcp_closed, socket}`,explanation:`Peer sent FIN. The port driver delivers :tcp_closed; the handler returns {:stop, :normal, state}. Being :temporary, it is not restarted.`,socketState:`CLOSE_WAIT → CLOSED`,queue:[`{:tcp_closed, port}`],handlerState:`terminated :normal`,code:{file:`handler.ex`,snippet:`def handle_info({:tcp_closed, _}, s), do: {:stop, :normal, s}`}}]:[{node:a,ownerNode:h,owner:`Handler ${r}`,zone:`outcome`,title:`{:tcp_error, socket, :econnreset}`,explanation:`Peer sent RST. The handler stops with the reason; the DynamicSupervisor logs it but the acceptor pool is untouched — let it crash, contained.`,socketState:`CLOSED (reset)`,queue:[`{:tcp_error, port, :econnreset}`],handlerState:`terminated {:error, :econnreset}`,code:{file:`handler.ex`,snippet:`def handle_info({:tcp_error, _, r}, s), do: {:stop, r, s}`}}];return c(`elixir`,n,[...l(n,e,{name:`epoll wakes BEAM's :inet poller`,code:`erts_check_io() → epoll_wait(...)`,file:`erts/emulator/sys/common/erl_poll.c`}),...m,..._])}function p(e,t,n){let{body:r,valid:i}=u(e,n),a=JSON.stringify(e),o=[...l(n,e,{name:`epoll wakes libuv poll phase`,code:`uv__io_poll(loop, timeout) → epoll_wait`,file:`deps/uv/src/unix/linux.c`}),{zone:`runtime`,node:`uv_poll`,ownerNode:`server`,owner:`uv_tcp_t (server)`,title:`libuv poll phase`,explanation:`The main thread's event loop is in the poll phase. TCP readiness is handled right here on the loop thread — not in the libuv threadpool, which is for fs/dns/crypto.`,socketState:`LISTEN`,queue:[`io watchers: listen fd`],handlerState:`not started`,code:{file:`event_loop.ts`,snippet:`// poll phase: uv__server_io → accept4()`}},{zone:`runtime`,node:`server`,ownerNode:`server`,owner:`net.Server`,title:`uv_accept → 'connection'`,explanation:`libuv accept4()s the FD (non-blocking) and wraps it in a uv_tcp_t. Node creates a net.Socket and emits 'connection'. maxConnections = ${n.acceptors}.`,socketState:`ESTABLISHED`,queue:[],handlerState:`not started`,code:{file:`server.ts`,snippet:`server.maxConnections = ${n.acceptors}; server.listen(${n.port})`}},{zone:`runtime`,node:`callbacks`,ownerNode:`socket`,owner:`net.Socket`,title:`V8 runs the JS callback`,explanation:`The C++ binding calls into V8 with the socket object. Your connection listener runs to completion; then microtasks (Promises) drain before libuv continues.`,socketState:`ESTABLISHED · reading`,queue:[`microtasks: []`],handlerState:`registered 'data'/'end'/'error'`,code:{file:`handler.ts`,snippet:`socket.on('data', onData)`}}],s=t===`frame`?[{zone:`handler`,node:`socket`,ownerNode:`socket`,owner:`net.Socket`,title:`'data' event`,explanation:`libuv read ${a} into a buffer; the stream emits a Buffer to the 'data' listener on the next callback turn.`,socketState:`ESTABLISHED`,queue:[`Buffer<${a}>`],handlerState:`onData()`,code:{file:`handler.ts`,snippet:`function onData(chunk: Buffer) {`}},i?{zone:`outcome`,node:`socket`,ownerNode:`socket`,owner:`net.Socket`,title:`Frame parsed and echoed`,explanation:`Body ${JSON.stringify(r)} is written; socket.write() returns false if the kernel send buffer is full — wait for 'drain'.`,socketState:`ESTABLISHED`,queue:[`microtasks: []`],handlerState:`replied`,code:{file:`protocol.ts`,snippet:`if (line.startsWith("${n.prefix}") && body) socket.write(body)`}}:{zone:`outcome`,node:`socket`,ownerNode:`socket`,owner:`net.Socket`,title:`Frame rejected`,explanation:`Payload lacks ${JSON.stringify(n.prefix)} + body; parseFrame returns an error result and the handler writes ERR.`,socketState:`ESTABLISHED`,queue:[],handlerState:`replied ERR`,code:{file:`protocol.ts`,snippet:`return { ok: false, error: 'bad_frame' }`}}]:t===`close`?[{zone:`outcome`,node:`socket`,ownerNode:`socket`,owner:`net.Socket`,title:`'end' then 'close'`,explanation:`read() returned 0 (FIN). The stream emits 'end'; with allowHalfOpen=false Node ends its side too, then emits 'close' and the uv handle is freed.`,socketState:`CLOSE_WAIT → CLOSED`,queue:[],handlerState:`closed`,code:{file:`handler.ts`,snippet:`socket.on('end', () => socket.end())`}}]:[{zone:`outcome`,node:`socket`,ownerNode:`socket`,owner:`net.Socket`,title:`'error' ECONNRESET`,explanation:`libuv reports UV_ECONNRESET. The socket emits 'error' then 'close'. Without an 'error' listener this would crash the process.`,socketState:`CLOSED (reset)`,queue:[],handlerState:`error handled`,code:{file:`handler.ts`,snippet:`socket.on('error', (e) => log(e.code))`}}];return c(`nodejs`,n,[...o,...s])}function m(e,t,n){let{body:r,valid:i}=u(e,n),a=JSON.stringify(e),o=`thread_0`,s=[...l(n,e,{name:`Blocked accept() returns`,code:`client, src, err := net.accept_tcp(listener)`,file:`core:net`}),{zone:`runtime`,node:`listener`,ownerNode:`listener`,owner:`main thread`,title:`Listener FD`,explanation:`main.odin bound and listened on port ${n.port}. core:net is a thin wrapper over the OS socket API — explicit, but not zero-abstraction.`,socketState:`LISTEN`,queue:[`accept queue: 1`],handlerState:`not started`,code:{file:`server.odin`,snippet:`listener := net.listen_tcp({net.IP4_Any, ${n.port}}) or_return`}},{zone:`runtime`,node:`accept_loop`,ownerNode:`accept_loop`,owner:`accept loop (main thread)`,title:`accept_tcp returns a raw fd`,explanation:`The accept loop now holds a TCP_Socket — a distinct integer type over the fd. No GC, no finalizer: whoever holds it must close it.`,socketState:`ESTABLISHED`,queue:[],handlerState:`not started`,code:{file:`server.odin`,snippet:`client, _ := net.accept_tcp(listener) or_continue`}},{zone:`runtime`,node:o,ownerNode:o,owner:`worker thread 0`,title:`Hand fd to worker thread (pool of ${n.acceptors})`,explanation:`Ownership is explicit: the fd is moved into a thread-pool task. The accept loop must not touch it again.`,socketState:`ESTABLISHED`,queue:[`task queue: [client fd]`],handlerState:`spawned`,code:{file:`main.odin`,snippet:`thread.pool_add_task(&pool, context.allocator, handle_client, rawptr(uintptr(client)))`}},{zone:`handler`,node:`handler_0`,ownerNode:`handler_0`,owner:`handle_client (thread 0)`,title:`Blocking recv on the worker`,explanation:`The worker blocks in recv_tcp(). The kernel parks the OS thread until bytes arrive — simple and predictable, one thread per in-flight connection.`,socketState:`ESTABLISHED`,queue:[`buf: [1024]u8`],handlerState:`defer net.close(client)`,code:{file:`handler.odin`,snippet:`defer net.close(client)
n, err := net.recv_tcp(client, buf[:])`}}],d=t===`frame`?[{zone:`handler`,node:`handler_0`,ownerNode:`handler_0`,owner:`handle_client (thread 0)`,title:`recv returns bytes`,explanation:`recv copied ${a} from sk_receive_queue into the stack buffer.`,socketState:`ESTABLISHED`,queue:[`buf[:n] = ${a}`],handlerState:`parsing`,code:{file:`handler.odin`,snippet:`frame := string(buf[:n])`}},i?{zone:`outcome`,node:`handler_0`,ownerNode:`handler_0`,owner:`handle_client (thread 0)`,title:`Frame parsed and echoed`,explanation:`Body ${JSON.stringify(r)} sent with send_tcp. Short writes must be looped manually.`,socketState:`ESTABLISHED`,queue:[],handlerState:`replied`,code:{file:`protocol.odin`,snippet:`if strings.has_prefix(frame, "${n.prefix}") { ... }`}}:{zone:`outcome`,node:`handler_0`,ownerNode:`handler_0`,owner:`handle_client (thread 0)`,title:`Frame rejected`,explanation:`parse_frame returns .Bad_Frame; handler sends ERR.`,socketState:`ESTABLISHED`,queue:[],handlerState:`replied ERR`,code:{file:`protocol.odin`,snippet:`return {}, .Bad_Frame`}}]:t===`close`?[{zone:`outcome`,node:`handler_0`,ownerNode:`handler_0`,owner:`handle_client (thread 0)`,title:`recv returns 0`,explanation:`Zero bytes = orderly shutdown. The proc returns, the deferred net.close releases the fd, and the thread goes back to the pool.`,socketState:`CLOSE_WAIT → CLOSED`,queue:[],handlerState:`returned · fd closed`,code:{file:`handler.odin`,snippet:`if n == 0 do return`}}]:[{zone:`outcome`,node:`handler_0`,ownerNode:`handler_0`,owner:`handle_client (thread 0)`,title:`recv error: Connection_Reset`,explanation:`recv returns an error enum. Odin has no exceptions — the handler checks err, returns, and defer closes the fd.`,socketState:`CLOSED (reset)`,queue:[],handlerState:`returned with error`,code:{file:`handler.odin`,snippet:`if err != nil { log.warn(err); return }`}}];return c(`odin`,n,[...s,...d])}function h(e,t,n){let{body:r,valid:i}=u(e,n),a=JSON.stringify(e),o=`handler`,s=[...l(n,e,{name:`epoll_wait returns to selectors`,code:`events = self._selector.select(timeout)`,file:`asyncio/base_events.py`}),{zone:`runtime`,node:`loop`,ownerNode:`server`,owner:`asyncio.Server`,title:`Event loop iteration`,explanation:`The single-threaded loop's _run_once() got the listen FD back from the selector and schedules its reader callback via call_soon.`,socketState:`LISTEN`,queue:[`ready: [_accept_connection]`],handlerState:`not started`,code:{file:`event_loop.py`,snippet:`self._ready.append(handle)`}},{zone:`runtime`,node:`server`,ownerNode:`server`,owner:`asyncio.Server`,title:`sock.accept() — non-blocking`,explanation:`Server calls accept() up to backlog (${n.acceptors}) times per wakeup, sets the new socket non-blocking, and wraps it in a transport.`,socketState:`ESTABLISHED`,queue:[],handlerState:`not started`,code:{file:`server.py`,snippet:`await asyncio.start_server(handle, port=${n.port}, backlog=${n.acceptors})`}},{zone:`runtime`,node:`transport`,ownerNode:`transport`,owner:`_SelectorSocketTransport`,title:`Transport + StreamReader`,explanation:`The transport owns the FD and registers it for EVENT_READ. A StreamReaderProtocol buffers incoming bytes for coroutines.`,socketState:`ESTABLISHED · registered EVENT_READ`,queue:[`StreamReader buffer: b''`],handlerState:`not started`,code:{file:`event_loop.py`,snippet:`selector.register(fd, EVENT_READ, (reader, None))`}},{zone:o,node:`task`,ownerNode:`transport`,owner:`Task(handle)`,title:`Handler Task created`,explanation:`client_connected_cb is wrapped in a Task. The coroutine runs until its first await, then yields back to the loop.`,socketState:`ESTABLISHED`,queue:[`ready: [Task.__step]`],handlerState:`awaiting reader.readline()`,code:{file:`handler.py`,snippet:`line = await reader.readline()`}}],d=t===`frame`?[{zone:o,node:`task`,ownerNode:`transport`,owner:`Task(handle)`,title:`Bytes fed to StreamReader`,explanation:`Selector reports the client FD readable; transport recv()s ${a}, feed_data() wakes the Future the Task awaits.`,socketState:`ESTABLISHED`,queue:[`buffer: ${a}`],handlerState:`resumed`,code:{file:`event_loop.py`,snippet:`self._protocol.data_received(data)`}},i?{zone:`outcome`,node:`task`,ownerNode:`transport`,owner:`Task(handle)`,title:`Frame parsed and echoed`,explanation:`Body ${JSON.stringify(r)} is written back; await writer.drain() applies backpressure.`,socketState:`ESTABLISHED`,queue:[],handlerState:`replied`,code:{file:`protocol.py`,snippet:`if line.startswith(b"${n.prefix}") and body: ...`}}:{zone:`outcome`,node:`task`,ownerNode:`transport`,owner:`Task(handle)`,title:`Frame rejected`,explanation:`Payload lacks ${JSON.stringify(n.prefix)} + body; protocol raises ValueError, handler writes an error line.`,socketState:`ESTABLISHED`,queue:[],handlerState:`replied ERR`,code:{file:`protocol.py`,snippet:`raise ValueError("bad frame")`}}]:t===`close`?[{zone:`outcome`,node:`task`,ownerNode:`transport`,owner:`Task(handle)`,title:`EOF → readline() returns b''`,explanation:`recv() returned 0 bytes. feed_eof() completes the read with empty bytes; the handler closes the writer and the Task finishes.`,socketState:`CLOSE_WAIT → CLOSED`,queue:[],handlerState:`done`,code:{file:`handler.py`,snippet:`if not line: writer.close(); await writer.wait_closed()`}}]:[{zone:`outcome`,node:`task`,ownerNode:`transport`,owner:`Task(handle)`,title:`ConnectionResetError`,explanation:`recv() raised ECONNRESET. The transport calls connection_lost(exc); the awaiting readline() raises inside the Task, which logs and exits. The loop keeps running.`,socketState:`CLOSED (reset)`,queue:[],handlerState:`raised ConnectionResetError`,code:{file:`handler.py`,snippet:`except ConnectionResetError: log.warning(...)`}}];return c(`python`,n,[...s,...d])}var g=[{id:`elixir`,label:`Elixir`,runtime:`Thousand Island · BEAM`},{id:`python`,label:`Python`,runtime:`asyncio · selectors`},{id:`nodejs`,label:`Node.js`,runtime:`V8 · libuv`},{id:`odin`,label:`Odin`,runtime:`native sockets · OS threads`}],_=[`frame`,`close`,`error`],v={elixir:f,python:h,nodejs:p,odin:m};function y(e,t,n,r){return v[e](o(t),n,s(r))}function b(e,t){try{let n=Object.values(t??{}).filter(e=>typeof e==`string`).join(`
`),r=e=>{let t=n.match(e);return t?a(t[1]):i.acceptors},o=(e,t)=>n.match(e)?.[1]??t,s=Number.parseInt(o(/\bPORT\s*(?:=|::)\s*(\d+)|port:\s*(\d+)/i,`4000`),10)||4e3;switch(e){case`elixir`:{let e=n.match(/active:\s*(:once|true|false)/)?.[1];return{acceptors:r(/num_acceptors:\s*(\d+)/),prefix:o(/@prefix\s+"([^"]*)"/,i.prefix),activeMode:e===`true`?`true`:e===`false`?`false`:`once`,handoff:/controlling_process/.test(n),requireBody:/body\s*!=\s*""/.test(n),port:Number.parseInt(n.match(/port:\s*(\d+)/)?.[1]??`4000`,10)}}case`python`:return{...i,acceptors:r(/BACKLOG\s*=\s*(\d+)/),prefix:o(/PREFIX\s*=\s*"([^"]*)"/,i.prefix),port:s};case`nodejs`:return{...i,acceptors:r(/maxConnections\s*=\s*(\d+)/),prefix:o(/PREFIX\s*=\s*"([^"]*)"/,i.prefix),port:s};case`odin`:return{...i,acceptors:r(/THREADS\s*::\s*(\d+)/),prefix:o(/PREFIX\s*::\s*"([^"]*)"/,i.prefix),port:s}}}catch{}return{...i}}var x={elixir:{"main.exs":`defmodule Demo do
  def parse("ECHO " <> body) when body != "", do: {:ok, body}
  def parse(_), do: {:error, :bad_frame}
end

IO.inspect(Demo.parse("ECHO ping"))
IO.inspect(Demo.parse("ECHO "))
`,"application.ex":`defmodule WireIngest.Application do
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
`,"handler.ex":`defmodule WireIngest.Handler do
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
`,"protocol.ex":`defmodule WireIngest.Protocol do
  @prefix "ECHO "

  def parse(@prefix <> body) when body != "", do: {:ok, body}
  def parse(_), do: {:error, :bad_frame}
end
`,"supervision_tree.ex":`# Conceptual tree (ThousandIsland internals)
#
# WireIngest.Supervisor
# └── ThousandIsland.Server
#     ├── ThousandIsland.Listener        (owns listen socket)
#     └── ThousandIsland.AcceptorPoolSupervisor
#         └── AcceptorSupervisor × num_acceptors
#             ├── Acceptor               (loops on :gen_tcp.accept)
#             └── DynamicSupervisor      (starts :temporary handlers)
#                 └── WireIngest.Handler
`},python:{"server.py":`import asyncio
from handler import handle

PORT = 4000
BACKLOG = 100

async def main():
    server = await asyncio.start_server(handle, port=PORT, backlog=BACKLOG)
    async with server:
        await server.serve_forever()

asyncio.run(main())
`,"event_loop.py":`# How asyncio's loop sees readiness (simplified)
#
# while True:
#     events = selector.select(timeout)     # epoll_wait
#     for key, mask in events:
#         self._ready.append(key.data)      # reader callback
#     for handle in ready: handle._run()   # accept / data_received
`,"handler.py":`import asyncio, logging
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
`,"protocol.py":`PREFIX = "ECHO "

def parse(line: bytes) -> bytes:
    text = line.decode().rstrip("\\n")
    if text.startswith(PREFIX) and text[len(PREFIX):]:
        return text[len(PREFIX):].encode()
    raise ValueError("bad frame")
`},nodejs:{"server.ts":`import net from "node:net";
import { onConnection } from "./handler";

const PORT = 4000;
const server = net.createServer(onConnection);
server.maxConnections = 100;
server.listen(PORT);
`,"event_loop.ts":`// libuv loop phases (per iteration)
// timers → pending → idle/prepare → POLL → check → close
//
// TCP accept/read readiness is handled in POLL on the main thread.
// The libuv threadpool is only for fs, dns.lookup, crypto, zlib.
// After each JS callback, V8 drains the microtask queue.
`,"handler.ts":`import type { Socket } from "node:net";
import { parseFrame } from "./protocol";

export function onConnection(socket: Socket) {
  socket.on("data", (chunk: Buffer) => {
    const r = parseFrame(chunk.toString());
    socket.write(r.ok ? r.body : "ERR bad_frame\\n");
  });
  socket.on("end", () => socket.end());
  socket.on("error", (e) => console.warn(e.message));
}
`,"protocol.ts":`export const PREFIX = "ECHO ";

export function parseFrame(line: string) {
  if (line.startsWith(PREFIX) && line.length > PREFIX.length) {
    return { ok: true as const, body: line.slice(PREFIX.length) };
  }
  return { ok: false as const, error: "bad_frame" };
}
`},odin:{"main.odin":`package wire_ingest

import "core:thread"

THREADS :: 8

main :: proc() {
    pool: thread.Pool
    thread.pool_init(&pool, context.allocator, THREADS)
    thread.pool_start(&pool)
    serve(&pool)
}
`,"server.odin":`package wire_ingest

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
`,"handler.odin":`package wire_ingest

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
`,"protocol.odin":`package wire_ingest

import "core:strings"

PREFIX :: "ECHO "

Frame_Error :: enum { None, Bad_Frame }

parse_frame :: proc(s: string) -> (string, Frame_Error) {
    if strings.has_prefix(s, PREFIX) && len(s) > len(PREFIX) {
        return s[len(PREFIX):], .None
    }
    return "", .Bad_Frame
}
`}},S=`thousand-island-source-config`,C=`thousand-island-source-updated`,w=e=>`${S}:${e}`,T=/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;function E(){try{let e=localStorage.getItem(S);e!==null&&(localStorage.getItem(w(`elixir`))===null&&localStorage.setItem(w(`elixir`),e),localStorage.removeItem(S))}catch{}}function D(e){let t=x[e];if(typeof window>`u`)return t;E();try{let n=localStorage.getItem(w(e));if(!n)return t;let r=JSON.parse(n);if(!r||typeof r!=`object`)return t;let i={...t};for(let[e,t]of Object.entries(r))T.test(e)&&typeof t==`string`&&(i[e]=t);return i}catch{return t}}function O(e,t){localStorage.setItem(w(e),JSON.stringify(t)),window.dispatchEvent(new CustomEvent(C,{detail:{language:e}}))}function k(e){localStorage.removeItem(w(e)),window.dispatchEvent(new CustomEvent(C,{detail:{language:e}}))}var A={language:`elixir`,payload:`ECHO ping`,outcome:`frame`},j=`wire-ingest-lab:session`,M=A,N=!1,P=new Set;function F(){if(!(N||typeof window>`u`)){N=!0;try{let e=JSON.parse(localStorage.getItem(j)??`null`);if(e&&typeof e==`object`){let t=e,n=t.language,r=t.outcome;M={...A,payload:typeof t.payload==`string`?t.payload:A.payload,language:n===`elixir`||n===`python`||n===`nodejs`||n===`odin`?n:A.language,outcome:r===`frame`||r===`close`||r===`error`?r:A.outcome}}}catch{}}}function I(e){M={...M,...e};try{localStorage.setItem(j,JSON.stringify(M))}catch{}P.forEach(e=>e())}function L(){return(0,r.useSyncExternalStore)(e=>(P.add(e),()=>P.delete(e)),()=>(F(),M),()=>A)}function R(e){let[t,n]=(0,r.useState)(x[e]);return(0,r.useEffect)(()=>{let t=()=>n(D(e));t();let r=n=>{n.key===w(e)&&t()};return window.addEventListener(C,t),window.addEventListener(`storage`,r),()=>{window.removeEventListener(C,t),window.removeEventListener(`storage`,r)}},[e]),t}function z(){let e=L(),t=R(e.language),n=(0,r.useMemo)(()=>b(e.language,t),[e.language,t]),i=(0,r.useMemo)(()=>y(e.language,e.payload,e.outcome,n),[e,n]),[a,o]=(0,r.useState)(0),[s,c]=(0,r.useState)(!1),[l,u]=(0,r.useState)(1),d=(0,r.useRef)(void 0);(0,r.useEffect)(()=>{o(0),c(!1)},[i]),(0,r.useEffect)(()=>{if(s)return d.current=window.setTimeout(()=>{o(e=>e>=i.length-1?(c(!1),e):e+1)},1400/l),()=>window.clearTimeout(d.current)},[s,a,l,i.length]);let f=(0,r.useCallback)(e=>{c(!1),o(t=>Math.max(0,Math.min(i.length-1,t+e)))},[i.length]),p=(0,r.useCallback)(()=>{c(e=>(!e&&a>=i.length-1&&o(0),!e))},[a,i.length]),m=(0,r.useCallback)(()=>{c(!1),o(0)},[]);return{lab:e,config:n,steps:i,index:a,current:i[Math.min(a,i.length-1)],setIndex:o,playing:s,toggle:p,step:f,reset:m,speed:l,setSpeed:u}}var B=n();function V({value:e,onChange:t}){return(0,B.jsx)(`div`,{role:`radiogroup`,"aria-label":`Language`,className:`seg`,children:g.map(n=>(0,B.jsx)(`button`,{role:`radio`,"aria-checked":e===n.id,className:`seg-item`,onClick:()=>(t??(e=>I({language:e})))(n.id),children:n.label},n.id))})}function H({payload:e,outcome:t}){return(0,B.jsxs)(`div`,{className:`flex flex-wrap items-end gap-3`,children:[(0,B.jsxs)(`label`,{className:`flex min-w-0 flex-1 flex-col gap-1`,children:[(0,B.jsx)(`span`,{className:`eyebrow`,children:`Payload`}),(0,B.jsx)(`input`,{className:`field font-mono`,value:e,maxLength:256,onChange:e=>I({payload:e.target.value}),spellCheck:!1})]}),(0,B.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,B.jsx)(`span`,{className:`eyebrow`,children:`Outcome`}),(0,B.jsx)(`div`,{role:`radiogroup`,"aria-label":`Outcome`,className:`seg`,children:_.map(e=>(0,B.jsx)(`button`,{role:`radio`,"aria-checked":t===e,className:`seg-item`,onClick:()=>I({outcome:e}),children:e},e))})]})]})}function U({sim:e}){return(0,B.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,B.jsx)(`button`,{className:`btn-ghost`,onClick:()=>e.step(-1),disabled:e.index===0,"aria-label":`Back`,children:`◂ Back`}),(0,B.jsx)(`button`,{className:`btn-primary`,onClick:e.toggle,children:e.playing?`Pause`:`Run`}),(0,B.jsx)(`button`,{className:`btn-ghost`,onClick:()=>e.step(1),disabled:e.index>=e.steps.length-1,"aria-label":`Step`,children:`Step ▸`}),(0,B.jsx)(`button`,{className:`btn-ghost`,onClick:e.reset,children:`Reset`}),(0,B.jsxs)(`label`,{className:`ml-1 flex items-center gap-2 font-mono text-xs text-muted-foreground`,children:[`speed`,(0,B.jsx)(`select`,{className:`field py-1`,value:e.speed,onChange:t=>e.setSpeed(Number(t.target.value)),children:[.5,1,2,4].map(e=>(0,B.jsxs)(`option`,{value:e,children:[e,`×`]},e))})]}),(0,B.jsxs)(`span`,{className:`ml-auto font-mono text-xs text-muted-foreground`,children:[e.index+1,`/`,e.steps.length]})]})}function W({sim:e}){return(0,B.jsx)(`ol`,{className:`timeline`,"aria-label":`Lifecycle timeline`,children:e.steps.map((t,n)=>(0,B.jsx)(`li`,{className:`flex-1`,children:(0,B.jsx)(`button`,{className:`tl-dot zone-${t.zone} ${n===e.index?`is-current`:``} ${n<e.index?`is-done`:``}`,onClick:()=>e.setIndex(n),"aria-label":`Step ${n+1}: ${t.title}`,"aria-current":n===e.index?`step`:void 0,title:t.title})},t.id))})}function G({step:e}){let t=[[`owner`,e.owner],[`socket`,e.socketState],[`handler`,e.handlerState],[e.language===`elixir`?`acceptors`:e.language===`odin`?`threads`:e.language===`python`?`backlog`:`max conns`,String(e.acceptors)]];return(0,B.jsxs)(`article`,{className:`space-y-4`,"aria-live":`polite`,children:[(0,B.jsxs)(`header`,{children:[(0,B.jsx)(`p`,{className:`eyebrow zone-text-${e.zone}`,children:e.zone}),(0,B.jsx)(`h2`,{className:`mt-1 text-xl font-semibold tracking-tight text-foreground`,children:e.title}),(0,B.jsx)(`p`,{className:`mt-2 text-sm leading-relaxed text-muted-foreground`,children:e.explanation})]}),(0,B.jsxs)(`dl`,{className:`grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs`,children:[t.map(([e,t])=>(0,B.jsxs)(r.Fragment,{children:[(0,B.jsx)(`dt`,{className:`text-muted-foreground`,children:e}),(0,B.jsx)(`dd`,{className:`text-foreground`,children:t})]},e)),(0,B.jsx)(`dt`,{className:`text-muted-foreground`,children:e.language===`elixir`?`mailbox`:`queue`}),(0,B.jsx)(`dd`,{className:`text-foreground`,children:e.queue.length?e.queue.join(` · `):`—`})]}),(0,B.jsxs)(`figure`,{className:`code-block`,children:[(0,B.jsx)(`figcaption`,{children:e.code.file}),(0,B.jsx)(`pre`,{children:(0,B.jsx)(`code`,{children:e.code.snippet||`—`})})]})]})}export{U as a,R as c,O as d,b as f,W as i,z as l,H as n,I as o,g as p,G as r,L as s,V as t,k as u};