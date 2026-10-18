import { n as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/monaco-editor__react+react.mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/LabControls-AesVRdjq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var DEFAULT_CONFIG = {
	acceptors: 10,
	prefix: "ECHO ",
	activeMode: "once",
	handoff: true,
	requireBody: true,
	port: 4e3
};
function clampCount(value, fallback = DEFAULT_CONFIG.acceptors) {
	const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
	if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
	return Math.min(100, Math.max(1, Math.trunc(n)));
}
function sanitizePayload(raw) {
	return raw.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").slice(0, 256);
}
function withConfig(cfg) {
	return {
		...DEFAULT_CONFIG,
		...cfg,
		acceptors: clampCount(cfg?.acceptors)
	};
}
function build(language, cfg, drafts) {
	const path = [];
	return drafts.map((d, i) => {
		if (!path.includes(d.node)) path.push(d.node);
		return {
			...d,
			id: d.id ?? `${language}-${i}`,
			language,
			acceptors: cfg.acceptors,
			path: [...path]
		};
	});
}
function kernelSteps(cfg, payload, wake) {
	const bytes = new TextEncoder().encode(payload).length + 40;
	const k = (zone, node, title, explanation, socketState, queue = [], snippet = "", file = "linux/net") => ({
		zone,
		node,
		ownerNode: node,
		title,
		explanation,
		owner: zone === "hardware" ? "NIC hardware" : "Linux kernel",
		socketState,
		queue,
		handlerState: "not started",
		code: {
			file,
			snippet
		}
	});
	return [
		k("hardware", "nic", "Frame arrives at the NIC", `An Ethernet frame carrying a TCP segment (~${bytes} bytes incl. headers) for port ${cfg.port} lands in the NIC's RX FIFO. The MAC verifies the FCS checksum.`, "SYN_RECV → ESTABLISHED (handshake done)", [], "rx_ring[head] = frame;", "drivers/net/ethernet"),
		k("hardware", "dma", "DMA into the RX ring", "The NIC writes the frame straight into a pre-allocated ring buffer in RAM by DMA — no CPU copy — and advances the descriptor head.", "ESTABLISHED", ["rx_desc[n]"], "dma_map_single(dev, buf, len, DMA_FROM_DEVICE);", "drivers/net/ethernet"),
		k("kernel", "irq", "Hardware interrupt (IRQ)", "The NIC raises an MSI-X interrupt. The top-half handler does almost nothing: it masks further IRQs and schedules NAPI polling.", "ESTABLISHED", ["rx_desc[n]"], "napi_schedule(&q->napi);", "drivers/net/ethernet"),
		k("kernel", "napi", "SoftIRQ / NAPI poll", "NET_RX_SOFTIRQ runs the driver's poll() in a batch, draining descriptors with interrupts still masked — this is how Linux avoids interrupt storms.", "ESTABLISHED", ["rx_desc[n]"], "work = napi->poll(napi, budget);", "net/core/dev.c"),
		k("kernel", "skb", "sk_buff built", "Each frame becomes a struct sk_buff. GRO may coalesce segments; the IP and TCP layers validate headers and look up the socket by 4-tuple.", "ESTABLISHED", ["skb"], "sk = __inet_lookup_skb(&tcp_hashinfo, skb, ...);", "net/ipv4/tcp_ipv4.c"),
		k("kernel", "sock", "Queued on struct sock", `The connection's struct sock is found. For a new connection the completed child socket sits in the listener's accept queue; payload bytes go to sk_receive_queue.`, "ESTABLISHED", ["sk_receive_queue: skb"], "tcp_queue_rcv(sk, skb, &fragstolen);", "net/ipv4/tcp_input.c"),
		k("kernel", "fdt", "File-descriptor table", "accept() installs the child socket into the process FD table. From here user space only ever sees a small integer.", "ESTABLISHED · fd allocated", ["accept queue: 1"], "fd_install(newfd, newfile);", "net/socket.c"),
		k("kernel", "accept_q", "Accept queue ready", "The listening socket is now readable: its accept queue holds a completed connection waiting for the runtime.", "LISTEN (listener) · ESTABLISHED (child)", ["accept queue: 1"], "sk->sk_data_ready(sk);", "net/ipv4/inet_connection_sock.c"),
		{
			...k("kernel", "poll", wake.name, "The readiness notifier (epoll on Linux, kqueue on BSD/macOS) marks the FD ready and wakes whatever is blocked waiting on it.", "ESTABLISHED", ["ready list: fd"], wake.code, wake.file),
			owner: "Linux kernel → runtime"
		}
	];
}
function outcomeTail(payload, cfg) {
	const body = payload.startsWith(cfg.prefix) ? payload.slice(cfg.prefix.length) : null;
	return {
		body,
		valid: body !== null && (!cfg.requireBody || body.trim().length > 0)
	};
}
function activeAcceptor(payload, acceptors) {
	let h = 0;
	for (const c of payload) h = h * 31 + c.charCodeAt(0) >>> 0;
	return h % Math.max(1, acceptors);
}
function elixirSteps(payload, outcome, cfg) {
	const a = activeAcceptor(payload, cfg.acceptors);
	const acc = `acceptor_${a}`;
	const hnd = `handler_${a}`;
	const { body, valid } = outcomeTail(payload, cfg);
	const R = "runtime";
	const base = (node, ownerNode, owner) => ({
		node,
		ownerNode,
		owner
	});
	const runtime = [
		{
			...base("listener", "listener", "Listener (port owner)"),
			zone: R,
			title: "Listener holds the listen socket",
			explanation: `ThousandIsland.Listener opened :gen_tcp.listen(${cfg.port}) at boot and owns the listen socket. It shares it with every acceptor; it never accepts itself.`,
			socketState: "LISTEN",
			queue: ["accept queue: 1"],
			handlerState: "not started",
			code: {
				file: "application.ex",
				snippet: `{ThousandIsland, port: ${cfg.port}, handler_module: WireIngest.Handler}`
			}
		},
		{
			...base(acc, "accept_q", `Acceptor ${a} (blocked in accept)`),
			zone: R,
			title: `Acceptor ${a} wakes from :gen_tcp.accept/1`,
			explanation: `${cfg.acceptors} acceptor processes all block in accept on the same listen socket. BEAM's :inet driver registered the FD with epoll; the wakeup lands on one scheduler and acceptor ${a} wins the race.`,
			socketState: "ESTABLISHED",
			queue: ["mailbox: []"],
			handlerState: "not started",
			code: {
				file: "supervision_tree.ex",
				snippet: `num_acceptors: ${cfg.acceptors}`
			}
		},
		{
			...base(acc, acc, `Acceptor ${a}`),
			zone: R,
			title: "Port created; acceptor owns socket",
			explanation: "accept returns a port (the BEAM's wrapper around the FD). The process that called accept is the controlling process — messages from the socket go to its mailbox.",
			socketState: "ESTABLISHED · passive",
			queue: ["mailbox: []"],
			handlerState: "not started",
			code: {
				file: "handler.ex",
				snippet: "{:ok, socket} = :gen_tcp.accept(listen_socket)"
			}
		},
		{
			...base(`dyn_sup_${a}`, acc, `Acceptor ${a}`),
			zone: R,
			title: "DynamicSupervisor starts a handler",
			explanation: `The acceptor asks its sibling DynamicSupervisor to start a :temporary handler GenServer, so a crashing connection never takes down the acceptor pool.`,
			socketState: "ESTABLISHED · passive",
			queue: ["mailbox: []"],
			handlerState: "starting (init/1)",
			code: {
				file: "supervision_tree.ex",
				snippet: "DynamicSupervisor.start_child(sup, {Handler, socket})"
			}
		},
		cfg.handoff ? {
			...base(hnd, hnd, `Handler ${a}`),
			zone: "handler",
			title: "Ownership handoff",
			explanation: "The acceptor transfers control so the socket's messages go to the handler's mailbox, then loops back to accept the next connection.",
			socketState: "ESTABLISHED · passive",
			queue: ["mailbox: []"],
			handlerState: "running",
			code: {
				file: "handler.ex",
				snippet: ":gen_tcp.controlling_process(socket, handler_pid)"
			}
		} : {
			...base(hnd, acc, `Acceptor ${a} (no handoff!)`),
			zone: "handler",
			title: "Missing ownership handoff",
			explanation: "Your saved source has no controlling_process/2 call. Socket messages still go to the acceptor's mailbox — the handler will never see data, and the acceptor is stuck serving one client.",
			socketState: "ESTABLISHED · passive",
			queue: ["acceptor mailbox"],
			handlerState: "running · starved",
			code: {
				file: "handler.ex",
				snippet: "# controlling_process/2 not found"
			}
		},
		{
			...base(hnd, cfg.handoff ? hnd : acc, cfg.handoff ? `Handler ${a}` : `Acceptor ${a}`),
			zone: "handler",
			title: `Arm active: ${cfg.activeMode}`,
			explanation: cfg.activeMode === "once" ? "active: :once delivers exactly one {:tcp, socket, data} message, then flips back to passive. Built-in backpressure: the handler re-arms only when ready." : cfg.activeMode === "true" ? "active: true streams every packet into the mailbox as fast as it arrives — no backpressure, the mailbox can grow without bound." : "Passive mode: the handler must call :gen_tcp.recv/2 explicitly and block.",
			socketState: `ESTABLISHED · active=${cfg.activeMode}`,
			queue: [],
			handlerState: "waiting for data",
			code: {
				file: "handler.ex",
				snippet: `:inet.setopts(socket, active: :${cfg.activeMode === "false" ? "false" : cfg.activeMode})`
			}
		}
	];
	const ownerNode = cfg.handoff ? hnd : acc;
	const msg = JSON.stringify(payload);
	const tail = outcome === "frame" ? [{
		node: hnd,
		ownerNode,
		owner: `Handler ${a}`,
		zone: "handler",
		title: "{:tcp, socket, data} in mailbox",
		explanation: `The port driver read the bytes from sk_receive_queue and sent a message: {:tcp, #Port<>, ${msg}}.`,
		socketState: "ESTABLISHED · passive (once consumed)",
		queue: [`{:tcp, port, ${msg}}`],
		handlerState: "handle_info/2",
		code: {
			file: "handler.ex",
			snippet: "def handle_info({:tcp, socket, data}, state)"
		}
	}, valid ? {
		node: hnd,
		ownerNode,
		owner: `Handler ${a}`,
		zone: "outcome",
		title: "Frame parsed and echoed",
		explanation: `Protocol matched prefix ${JSON.stringify(cfg.prefix)} with body ${JSON.stringify(body)}. Handler replies with :gen_tcp.send/2 and re-arms active: :once.`,
		socketState: "ESTABLISHED",
		queue: [],
		handlerState: "replied · re-armed",
		code: {
			file: "protocol.ex",
			snippet: `def parse("${cfg.prefix}" <> body) when body != "", do: {:ok, body}`
		}
	} : {
		node: hnd,
		ownerNode,
		owner: `Handler ${a}`,
		zone: "outcome",
		title: "Frame rejected",
		explanation: `Payload does not match ${JSON.stringify(cfg.prefix)} + non-empty body. Handler sends an error line and keeps the connection.`,
		socketState: "ESTABLISHED",
		queue: [],
		handlerState: "replied {:error, :bad_frame}",
		code: {
			file: "protocol.ex",
			snippet: "def parse(_), do: {:error, :bad_frame}"
		}
	}] : outcome === "close" ? [{
		node: hnd,
		ownerNode,
		owner: `Handler ${a}`,
		zone: "outcome",
		title: "{:tcp_closed, socket}",
		explanation: "Peer sent FIN. The port driver delivers :tcp_closed; the handler returns {:stop, :normal, state}. Being :temporary, it is not restarted.",
		socketState: "CLOSE_WAIT → CLOSED",
		queue: ["{:tcp_closed, port}"],
		handlerState: "terminated :normal",
		code: {
			file: "handler.ex",
			snippet: "def handle_info({:tcp_closed, _}, s), do: {:stop, :normal, s}"
		}
	}] : [{
		node: hnd,
		ownerNode,
		owner: `Handler ${a}`,
		zone: "outcome",
		title: "{:tcp_error, socket, :econnreset}",
		explanation: "Peer sent RST. The handler stops with the reason; the DynamicSupervisor logs it but the acceptor pool is untouched — let it crash, contained.",
		socketState: "CLOSED (reset)",
		queue: ["{:tcp_error, port, :econnreset}"],
		handlerState: "terminated {:error, :econnreset}",
		code: {
			file: "handler.ex",
			snippet: "def handle_info({:tcp_error, _, r}, s), do: {:stop, r, s}"
		}
	}];
	return build("elixir", cfg, [
		...kernelSteps(cfg, payload, {
			name: "epoll wakes BEAM's :inet poller",
			code: "erts_check_io() → epoll_wait(...)",
			file: "erts/emulator/sys/common/erl_poll.c"
		}),
		...runtime,
		...tail
	]);
}
function nodejsSteps(payload, outcome, cfg) {
	const { body, valid } = outcomeTail(payload, cfg);
	const msg = JSON.stringify(payload);
	const H = "handler";
	const drafts = [
		...kernelSteps(cfg, payload, {
			name: "epoll wakes libuv poll phase",
			code: "uv__io_poll(loop, timeout) → epoll_wait",
			file: "deps/uv/src/unix/linux.c"
		}),
		{
			zone: "runtime",
			node: "uv_poll",
			ownerNode: "server",
			owner: "uv_tcp_t (server)",
			title: "libuv poll phase",
			explanation: "The main thread's event loop is in the poll phase. TCP readiness is handled right here on the loop thread — not in the libuv threadpool, which is for fs/dns/crypto.",
			socketState: "LISTEN",
			queue: ["io watchers: listen fd"],
			handlerState: "not started",
			code: {
				file: "event_loop.ts",
				snippet: "// poll phase: uv__server_io → accept4()"
			}
		},
		{
			zone: "runtime",
			node: "server",
			ownerNode: "server",
			owner: "net.Server",
			title: "uv_accept → 'connection'",
			explanation: `libuv accept4()s the FD (non-blocking) and wraps it in a uv_tcp_t. Node creates a net.Socket and emits 'connection'. maxConnections = ${cfg.acceptors}.`,
			socketState: "ESTABLISHED",
			queue: [],
			handlerState: "not started",
			code: {
				file: "server.ts",
				snippet: `server.maxConnections = ${cfg.acceptors}; server.listen(${cfg.port})`
			}
		},
		{
			zone: "runtime",
			node: "callbacks",
			ownerNode: "socket",
			owner: "net.Socket",
			title: "V8 runs the JS callback",
			explanation: "The C++ binding calls into V8 with the socket object. Your connection listener runs to completion; then microtasks (Promises) drain before libuv continues.",
			socketState: "ESTABLISHED · reading",
			queue: ["microtasks: []"],
			handlerState: "registered 'data'/'end'/'error'",
			code: {
				file: "handler.ts",
				snippet: "socket.on('data', onData)"
			}
		}
	];
	const tail = outcome === "frame" ? [{
		zone: H,
		node: "socket",
		ownerNode: "socket",
		owner: "net.Socket",
		title: "'data' event",
		explanation: `libuv read ${msg} into a buffer; the stream emits a Buffer to the 'data' listener on the next callback turn.`,
		socketState: "ESTABLISHED",
		queue: [`Buffer<${msg}>`],
		handlerState: "onData()",
		code: {
			file: "handler.ts",
			snippet: "function onData(chunk: Buffer) {"
		}
	}, valid ? {
		zone: "outcome",
		node: "socket",
		ownerNode: "socket",
		owner: "net.Socket",
		title: "Frame parsed and echoed",
		explanation: `Body ${JSON.stringify(body)} is written; socket.write() returns false if the kernel send buffer is full — wait for 'drain'.`,
		socketState: "ESTABLISHED",
		queue: ["microtasks: []"],
		handlerState: "replied",
		code: {
			file: "protocol.ts",
			snippet: `if (line.startsWith("${cfg.prefix}") && body) socket.write(body)`
		}
	} : {
		zone: "outcome",
		node: "socket",
		ownerNode: "socket",
		owner: "net.Socket",
		title: "Frame rejected",
		explanation: `Payload lacks ${JSON.stringify(cfg.prefix)} + body; parseFrame returns an error result and the handler writes ERR.`,
		socketState: "ESTABLISHED",
		queue: [],
		handlerState: "replied ERR",
		code: {
			file: "protocol.ts",
			snippet: "return { ok: false, error: 'bad_frame' }"
		}
	}] : outcome === "close" ? [{
		zone: "outcome",
		node: "socket",
		ownerNode: "socket",
		owner: "net.Socket",
		title: "'end' then 'close'",
		explanation: "read() returned 0 (FIN). The stream emits 'end'; with allowHalfOpen=false Node ends its side too, then emits 'close' and the uv handle is freed.",
		socketState: "CLOSE_WAIT → CLOSED",
		queue: [],
		handlerState: "closed",
		code: {
			file: "handler.ts",
			snippet: "socket.on('end', () => socket.end())"
		}
	}] : [{
		zone: "outcome",
		node: "socket",
		ownerNode: "socket",
		owner: "net.Socket",
		title: "'error' ECONNRESET",
		explanation: "libuv reports UV_ECONNRESET. The socket emits 'error' then 'close'. Without an 'error' listener this would crash the process.",
		socketState: "CLOSED (reset)",
		queue: [],
		handlerState: "error handled",
		code: {
			file: "handler.ts",
			snippet: "socket.on('error', (e) => log(e.code))"
		}
	}];
	return build("nodejs", cfg, [...drafts, ...tail]);
}
function odinSteps(payload, outcome, cfg) {
	const { body, valid } = outcomeTail(payload, cfg);
	const msg = JSON.stringify(payload);
	const t = 0;
	const thread = `thread_${t}`;
	const drafts = [
		...kernelSteps(cfg, payload, {
			name: "Blocked accept() returns",
			code: "client, src, err := net.accept_tcp(listener)",
			file: "core:net"
		}),
		{
			zone: "runtime",
			node: "listener",
			ownerNode: "listener",
			owner: "main thread",
			title: "Listener FD",
			explanation: `main.odin bound and listened on port ${cfg.port}. core:net is a thin wrapper over the OS socket API — explicit, but not zero-abstraction.`,
			socketState: "LISTEN",
			queue: ["accept queue: 1"],
			handlerState: "not started",
			code: {
				file: "server.odin",
				snippet: `listener := net.listen_tcp({net.IP4_Any, ${cfg.port}}) or_return`
			}
		},
		{
			zone: "runtime",
			node: "accept_loop",
			ownerNode: "accept_loop",
			owner: "accept loop (main thread)",
			title: "accept_tcp returns a raw fd",
			explanation: "The accept loop now holds a TCP_Socket — a distinct integer type over the fd. No GC, no finalizer: whoever holds it must close it.",
			socketState: "ESTABLISHED",
			queue: [],
			handlerState: "not started",
			code: {
				file: "server.odin",
				snippet: "client, _ := net.accept_tcp(listener) or_continue"
			}
		},
		{
			zone: "runtime",
			node: thread,
			ownerNode: thread,
			owner: `worker thread ${t}`,
			title: `Hand fd to worker thread (pool of ${cfg.acceptors})`,
			explanation: "Ownership is explicit: the fd is moved into a thread-pool task. The accept loop must not touch it again.",
			socketState: "ESTABLISHED",
			queue: [`task queue: [client fd]`],
			handlerState: "spawned",
			code: {
				file: "main.odin",
				snippet: `thread.pool_add_task(&pool, context.allocator, handle_client, rawptr(uintptr(client)))`
			}
		},
		{
			zone: "handler",
			node: `handler_${t}`,
			ownerNode: `handler_${t}`,
			owner: `handle_client (thread ${t})`,
			title: "Blocking recv on the worker",
			explanation: "The worker blocks in recv_tcp(). The kernel parks the OS thread until bytes arrive — simple and predictable, one thread per in-flight connection.",
			socketState: "ESTABLISHED",
			queue: ["buf: [1024]u8"],
			handlerState: "defer net.close(client)",
			code: {
				file: "handler.odin",
				snippet: "defer net.close(client)\nn, err := net.recv_tcp(client, buf[:])"
			}
		}
	];
	const tail = outcome === "frame" ? [{
		zone: "handler",
		node: `handler_${t}`,
		ownerNode: `handler_${t}`,
		owner: `handle_client (thread ${t})`,
		title: "recv returns bytes",
		explanation: `recv copied ${msg} from sk_receive_queue into the stack buffer.`,
		socketState: "ESTABLISHED",
		queue: [`buf[:n] = ${msg}`],
		handlerState: "parsing",
		code: {
			file: "handler.odin",
			snippet: "frame := string(buf[:n])"
		}
	}, valid ? {
		zone: "outcome",
		node: `handler_${t}`,
		ownerNode: `handler_${t}`,
		owner: `handle_client (thread ${t})`,
		title: "Frame parsed and echoed",
		explanation: `Body ${JSON.stringify(body)} sent with send_tcp. Short writes must be looped manually.`,
		socketState: "ESTABLISHED",
		queue: [],
		handlerState: "replied",
		code: {
			file: "protocol.odin",
			snippet: `if strings.has_prefix(frame, "${cfg.prefix}") { ... }`
		}
	} : {
		zone: "outcome",
		node: `handler_${t}`,
		ownerNode: `handler_${t}`,
		owner: `handle_client (thread ${t})`,
		title: "Frame rejected",
		explanation: "parse_frame returns .Bad_Frame; handler sends ERR.",
		socketState: "ESTABLISHED",
		queue: [],
		handlerState: "replied ERR",
		code: {
			file: "protocol.odin",
			snippet: "return {}, .Bad_Frame"
		}
	}] : outcome === "close" ? [{
		zone: "outcome",
		node: `handler_${t}`,
		ownerNode: `handler_${t}`,
		owner: `handle_client (thread ${t})`,
		title: "recv returns 0",
		explanation: "Zero bytes = orderly shutdown. The proc returns, the deferred net.close releases the fd, and the thread goes back to the pool.",
		socketState: "CLOSE_WAIT → CLOSED",
		queue: [],
		handlerState: "returned · fd closed",
		code: {
			file: "handler.odin",
			snippet: "if n == 0 do return"
		}
	}] : [{
		zone: "outcome",
		node: `handler_${t}`,
		ownerNode: `handler_${t}`,
		owner: `handle_client (thread ${t})`,
		title: "recv error: Connection_Reset",
		explanation: "recv returns an error enum. Odin has no exceptions — the handler checks err, returns, and defer closes the fd.",
		socketState: "CLOSED (reset)",
		queue: [],
		handlerState: "returned with error",
		code: {
			file: "handler.odin",
			snippet: "if err != nil { log.warn(err); return }"
		}
	}];
	return build("odin", cfg, [...drafts, ...tail]);
}
function pythonSteps(payload, outcome, cfg) {
	const { body, valid } = outcomeTail(payload, cfg);
	const msg = JSON.stringify(payload);
	const H = "handler";
	const drafts = [
		...kernelSteps(cfg, payload, {
			name: "epoll_wait returns to selectors",
			code: "events = self._selector.select(timeout)",
			file: "asyncio/base_events.py"
		}),
		{
			zone: "runtime",
			node: "loop",
			ownerNode: "server",
			owner: "asyncio.Server",
			title: "Event loop iteration",
			explanation: "The single-threaded loop's _run_once() got the listen FD back from the selector and schedules its reader callback via call_soon.",
			socketState: "LISTEN",
			queue: ["ready: [_accept_connection]"],
			handlerState: "not started",
			code: {
				file: "event_loop.py",
				snippet: "self._ready.append(handle)"
			}
		},
		{
			zone: "runtime",
			node: "server",
			ownerNode: "server",
			owner: "asyncio.Server",
			title: "sock.accept() — non-blocking",
			explanation: `Server calls accept() up to backlog (${cfg.acceptors}) times per wakeup, sets the new socket non-blocking, and wraps it in a transport.`,
			socketState: "ESTABLISHED",
			queue: [],
			handlerState: "not started",
			code: {
				file: "server.py",
				snippet: `await asyncio.start_server(handle, port=${cfg.port}, backlog=${cfg.acceptors})`
			}
		},
		{
			zone: "runtime",
			node: "transport",
			ownerNode: "transport",
			owner: "_SelectorSocketTransport",
			title: "Transport + StreamReader",
			explanation: "The transport owns the FD and registers it for EVENT_READ. A StreamReaderProtocol buffers incoming bytes for coroutines.",
			socketState: "ESTABLISHED · registered EVENT_READ",
			queue: ["StreamReader buffer: b''"],
			handlerState: "not started",
			code: {
				file: "event_loop.py",
				snippet: "selector.register(fd, EVENT_READ, (reader, None))"
			}
		},
		{
			zone: H,
			node: "task",
			ownerNode: "transport",
			owner: "Task(handle)",
			title: "Handler Task created",
			explanation: "client_connected_cb is wrapped in a Task. The coroutine runs until its first await, then yields back to the loop.",
			socketState: "ESTABLISHED",
			queue: ["ready: [Task.__step]"],
			handlerState: "awaiting reader.readline()",
			code: {
				file: "handler.py",
				snippet: "line = await reader.readline()"
			}
		}
	];
	const tail = outcome === "frame" ? [{
		zone: H,
		node: "task",
		ownerNode: "transport",
		owner: "Task(handle)",
		title: "Bytes fed to StreamReader",
		explanation: `Selector reports the client FD readable; transport recv()s ${msg}, feed_data() wakes the Future the Task awaits.`,
		socketState: "ESTABLISHED",
		queue: [`buffer: ${msg}`],
		handlerState: "resumed",
		code: {
			file: "event_loop.py",
			snippet: "self._protocol.data_received(data)"
		}
	}, valid ? {
		zone: "outcome",
		node: "task",
		ownerNode: "transport",
		owner: "Task(handle)",
		title: "Frame parsed and echoed",
		explanation: `Body ${JSON.stringify(body)} is written back; await writer.drain() applies backpressure.`,
		socketState: "ESTABLISHED",
		queue: [],
		handlerState: "replied",
		code: {
			file: "protocol.py",
			snippet: `if line.startswith(b"${cfg.prefix}") and body: ...`
		}
	} : {
		zone: "outcome",
		node: "task",
		ownerNode: "transport",
		owner: "Task(handle)",
		title: "Frame rejected",
		explanation: `Payload lacks ${JSON.stringify(cfg.prefix)} + body; protocol raises ValueError, handler writes an error line.`,
		socketState: "ESTABLISHED",
		queue: [],
		handlerState: "replied ERR",
		code: {
			file: "protocol.py",
			snippet: "raise ValueError(\"bad frame\")"
		}
	}] : outcome === "close" ? [{
		zone: "outcome",
		node: "task",
		ownerNode: "transport",
		owner: "Task(handle)",
		title: "EOF → readline() returns b''",
		explanation: "recv() returned 0 bytes. feed_eof() completes the read with empty bytes; the handler closes the writer and the Task finishes.",
		socketState: "CLOSE_WAIT → CLOSED",
		queue: [],
		handlerState: "done",
		code: {
			file: "handler.py",
			snippet: "if not line: writer.close(); await writer.wait_closed()"
		}
	}] : [{
		zone: "outcome",
		node: "task",
		ownerNode: "transport",
		owner: "Task(handle)",
		title: "ConnectionResetError",
		explanation: "recv() raised ECONNRESET. The transport calls connection_lost(exc); the awaiting readline() raises inside the Task, which logs and exits. The loop keeps running.",
		socketState: "CLOSED (reset)",
		queue: [],
		handlerState: "raised ConnectionResetError",
		code: {
			file: "handler.py",
			snippet: "except ConnectionResetError: log.warning(...)"
		}
	}];
	return build("python", cfg, [...drafts, ...tail]);
}
var LANGUAGES = [
	{
		id: "elixir",
		label: "Elixir",
		runtime: "Thousand Island · BEAM"
	},
	{
		id: "python",
		label: "Python",
		runtime: "asyncio · selectors"
	},
	{
		id: "nodejs",
		label: "Node.js",
		runtime: "V8 · libuv"
	},
	{
		id: "odin",
		label: "Odin",
		runtime: "native sockets · OS threads"
	}
];
var OUTCOMES = [
	"frame",
	"close",
	"error"
];
var DISPATCH = {
	elixir: elixirSteps,
	python: pythonSteps,
	nodejs: nodejsSteps,
	odin: odinSteps
};
function stepsForLanguage(language, payload, outcome, sourceConfig) {
	return DISPATCH[language](sanitizePayload(payload), outcome, withConfig(sourceConfig));
}
/** The only source → config heuristic boundary. Never throws. */
function parseSource(language, files) {
	try {
		const all = Object.values(files ?? {}).filter((v) => typeof v === "string").join("\n");
		const num = (re) => {
			const m = all.match(re);
			return m ? clampCount(m[1]) : DEFAULT_CONFIG.acceptors;
		};
		const str = (re, fb) => all.match(re)?.[1] ?? fb;
		const port = Number.parseInt(str(/\bPORT\s*(?:=|::)\s*(\d+)|port:\s*(\d+)/i, "4000"), 10) || 4e3;
		switch (language) {
			case "elixir": {
				const active = all.match(/active:\s*(:once|true|false)/)?.[1];
				return {
					acceptors: num(/num_acceptors:\s*(\d+)/),
					prefix: str(/@prefix\s+"([^"]*)"/, DEFAULT_CONFIG.prefix),
					activeMode: active === "true" ? "true" : active === "false" ? "false" : "once",
					handoff: /controlling_process/.test(all),
					requireBody: /body\s*!=\s*""/.test(all),
					port: Number.parseInt(all.match(/port:\s*(\d+)/)?.[1] ?? "4000", 10)
				};
			}
			case "python": return {
				...DEFAULT_CONFIG,
				acceptors: num(/BACKLOG\s*=\s*(\d+)/),
				prefix: str(/PREFIX\s*=\s*"([^"]*)"/, DEFAULT_CONFIG.prefix),
				port
			};
			case "nodejs": return {
				...DEFAULT_CONFIG,
				acceptors: num(/maxConnections\s*=\s*(\d+)/),
				prefix: str(/PREFIX\s*=\s*"([^"]*)"/, DEFAULT_CONFIG.prefix),
				port
			};
			case "odin": return {
				...DEFAULT_CONFIG,
				acceptors: num(/THREADS\s*::\s*(\d+)/),
				prefix: str(/PREFIX\s*::\s*"([^"]*)"/, DEFAULT_CONFIG.prefix),
				port
			};
		}
	} catch {}
	return { ...DEFAULT_CONFIG };
}
var DEFAULT_SOURCES = {
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
`
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
`
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
`
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
`
	}
};
var LEGACY_KEY = "thousand-island-source-config";
var SOURCE_UPDATED_EVENT = "thousand-island-source-updated";
var storageKey = (l) => `${LEGACY_KEY}:${l}`;
var validFileName = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
function migrate() {
	try {
		const legacy = localStorage.getItem(LEGACY_KEY);
		if (legacy !== null) {
			if (localStorage.getItem(storageKey("elixir")) === null) localStorage.setItem(storageKey("elixir"), legacy);
			localStorage.removeItem(LEGACY_KEY);
		}
	} catch {}
}
function loadSaved(language) {
	const defaults = DEFAULT_SOURCES[language];
	if (typeof window === "undefined") return defaults;
	migrate();
	try {
		const raw = localStorage.getItem(storageKey(language));
		if (!raw) return defaults;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return defaults;
		const out = { ...defaults };
		for (const [k, v] of Object.entries(parsed)) if (validFileName.test(k) && typeof v === "string") out[k] = v;
		return out;
	} catch {
		return defaults;
	}
}
function saveSource(language, files) {
	localStorage.setItem(storageKey(language), JSON.stringify(files));
	window.dispatchEvent(new CustomEvent(SOURCE_UPDATED_EVENT, { detail: { language } }));
}
function resetSource(language) {
	localStorage.removeItem(storageKey(language));
	window.dispatchEvent(new CustomEvent(SOURCE_UPDATED_EVENT, { detail: { language } }));
}
var DEFAULT = {
	language: "elixir",
	payload: "ECHO ping",
	outcome: "frame"
};
var KEY = "wire-ingest-lab:session";
var state = DEFAULT;
var loaded = false;
var subs = /* @__PURE__ */ new Set();
function ensure() {
	if (loaded || typeof window === "undefined") return;
	loaded = true;
	try {
		const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
		if (s && typeof s === "object") {
			const saved = s;
			const language = saved.language;
			const outcome = saved.outcome;
			state = {
				...DEFAULT,
				payload: typeof saved.payload === "string" ? saved.payload : DEFAULT.payload,
				language: language === "elixir" || language === "python" || language === "nodejs" || language === "odin" ? language : DEFAULT.language,
				outcome: outcome === "frame" || outcome === "close" || outcome === "error" ? outcome : DEFAULT.outcome
			};
		}
	} catch {}
}
function setLab(patch) {
	state = {
		...state,
		...patch
	};
	try {
		localStorage.setItem(KEY, JSON.stringify(state));
	} catch {}
	subs.forEach((f) => f());
}
function useLab() {
	return (0, import_react.useSyncExternalStore)((cb) => {
		subs.add(cb);
		return () => subs.delete(cb);
	}, () => {
		ensure();
		return state;
	}, () => DEFAULT);
}
/** Saved source for a language, synced across this tab and other tabs. */
function useSavedSource(language) {
	const [files, setFiles] = (0, import_react.useState)(DEFAULT_SOURCES[language]);
	(0, import_react.useEffect)(() => {
		const refresh = () => setFiles(loadSaved(language));
		refresh();
		const onStorage = (e) => {
			if (e.key === storageKey(language)) refresh();
		};
		window.addEventListener(SOURCE_UPDATED_EVENT, refresh);
		window.addEventListener("storage", onStorage);
		return () => {
			window.removeEventListener(SOURCE_UPDATED_EVENT, refresh);
			window.removeEventListener("storage", onStorage);
		};
	}, [language]);
	return files;
}
function useSimulation() {
	const lab = useLab();
	const files = useSavedSource(lab.language);
	const config = (0, import_react.useMemo)(() => parseSource(lab.language, files), [lab.language, files]);
	const steps = (0, import_react.useMemo)(() => stepsForLanguage(lab.language, lab.payload, lab.outcome, config), [lab, config]);
	const [index, setIndex] = (0, import_react.useState)(0);
	const [playing, setPlaying] = (0, import_react.useState)(false);
	const [speed, setSpeed] = (0, import_react.useState)(1);
	const timer = (0, import_react.useRef)(void 0);
	(0, import_react.useEffect)(() => {
		setIndex(0);
		setPlaying(false);
	}, [steps]);
	(0, import_react.useEffect)(() => {
		if (!playing) return;
		timer.current = window.setTimeout(() => {
			setIndex((i) => {
				if (i >= steps.length - 1) {
					setPlaying(false);
					return i;
				}
				return i + 1;
			});
		}, 1400 / speed);
		return () => window.clearTimeout(timer.current);
	}, [
		playing,
		index,
		speed,
		steps.length
	]);
	const step = (0, import_react.useCallback)((d) => {
		setPlaying(false);
		setIndex((i) => Math.max(0, Math.min(steps.length - 1, i + d)));
	}, [steps.length]);
	const toggle = (0, import_react.useCallback)(() => {
		setPlaying((p) => {
			if (!p && index >= steps.length - 1) setIndex(0);
			return !p;
		});
	}, [index, steps.length]);
	const reset = (0, import_react.useCallback)(() => {
		setPlaying(false);
		setIndex(0);
	}, []);
	return {
		lab,
		config,
		steps,
		index,
		current: steps[Math.min(index, steps.length - 1)],
		setIndex,
		playing,
		toggle,
		step,
		reset,
		speed,
		setSpeed
	};
}
function LanguageSelect({ value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "radiogroup",
		"aria-label": "Language",
		className: "seg",
		children: LANGUAGES.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			role: "radio",
			"aria-checked": value === l.id,
			className: "seg-item",
			onClick: () => (onChange ?? ((x) => setLab({ language: x })))(l.id),
			children: l.label
		}, l.id))
	});
}
function PayloadOutcome({ payload, outcome }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-end gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
			className: "flex min-w-0 flex-1 flex-col gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "eyebrow",
				children: "Payload"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: "field font-mono",
				value: payload,
				maxLength: 256,
				onChange: (e) => setLab({ payload: e.target.value }),
				spellCheck: false
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col gap-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "eyebrow",
				children: "Outcome"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				role: "radiogroup",
				"aria-label": "Outcome",
				className: "seg",
				children: OUTCOMES.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					role: "radio",
					"aria-checked": outcome === o,
					className: "seg-item",
					onClick: () => setLab({ outcome: o }),
					children: o
				}, o))
			})]
		})]
	});
}
function Transport({ sim }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "btn-ghost",
				onClick: () => sim.step(-1),
				disabled: sim.index === 0,
				"aria-label": "Back",
				children: "◂ Back"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "btn-primary",
				onClick: sim.toggle,
				children: sim.playing ? "Pause" : "Run"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "btn-ghost",
				onClick: () => sim.step(1),
				disabled: sim.index >= sim.steps.length - 1,
				"aria-label": "Step",
				children: "Step ▸"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "btn-ghost",
				onClick: sim.reset,
				children: "Reset"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "ml-1 flex items-center gap-2 font-mono text-xs text-muted-foreground",
				children: ["speed", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
					className: "field py-1",
					value: sim.speed,
					onChange: (e) => sim.setSpeed(Number(e.target.value)),
					children: [
						.5,
						1,
						2,
						4
					].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
						value: s,
						children: [s, "×"]
					}, s))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "ml-auto font-mono text-xs text-muted-foreground",
				children: [
					sim.index + 1,
					"/",
					sim.steps.length
				]
			})
		]
	});
}
function Timeline({ sim }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "timeline",
		"aria-label": "Lifecycle timeline",
		children: sim.steps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
			className: "flex-1",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: `tl-dot zone-${s.zone} ${i === sim.index ? "is-current" : ""} ${i < sim.index ? "is-done" : ""}`,
				onClick: () => sim.setIndex(i),
				"aria-label": `Step ${i + 1}: ${s.title}`,
				"aria-current": i === sim.index ? "step" : void 0,
				title: s.title
			})
		}, s.id))
	});
}
function StepDetail({ step }) {
	const rows = [
		["owner", step.owner],
		["socket", step.socketState],
		["handler", step.handlerState],
		[step.language === "elixir" ? "acceptors" : step.language === "odin" ? "threads" : step.language === "python" ? "backlog" : "max conns", String(step.acceptors)]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "space-y-4",
		"aria-live": "polite",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: `eyebrow zone-text-${step.zone}`,
					children: step.zone
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-semibold tracking-tight text-foreground",
					children: step.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm leading-relaxed text-muted-foreground",
					children: step.explanation
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs",
				children: [
					rows.map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-muted-foreground",
						children: k
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-foreground",
						children: v
					})] }, k)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-muted-foreground",
						children: step.language === "elixir" ? "mailbox" : "queue"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-foreground",
						children: step.queue.length ? step.queue.join(" · ") : "—"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("figure", {
				className: "code-block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("figcaption", { children: step.code.file }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: step.code.snippet || "—" }) })]
			})
		]
	});
}
//#endregion
export { Timeline as a, resetSource as c, useLab as d, useSavedSource as f, StepDetail as i, saveSource as l, LanguageSelect as n, Transport as o, useSimulation as p, PayloadOutcome as r, parseSource as s, LANGUAGES as t, setLab as u };
