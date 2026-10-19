import type { Language, SourceConfig } from "@/lib/pipeline/types";

export type NodeKind = "hw" | "kernel" | "sup" | "worker" | "loop" | "handler" | "queue";
export interface GraphNode { id: string; label: string; kind: NodeKind; detail: string; children?: GraphNode[] | undefined }

const n = (id: string, label: string, kind: NodeKind, detail: string, children?: GraphNode[]): GraphNode => ({ id, label, kind, detail, children });

/** Kernel chain as a nested path so d3.tree lays it out left→right. */
export function kernelBranch(runtime: GraphNode): GraphNode {
  const chain: [string, string, NodeKind, string][] = [
    ["nic", "NIC", "hw", "Network interface card: receives frames, verifies FCS."],
    ["dma", "DMA ring", "hw", "Descriptor ring in RAM filled by the NIC without CPU copies."],
    ["irq", "IRQ", "kernel", "MSI-X interrupt; top half schedules NAPI."],
    ["napi", "SoftIRQ/NAPI", "kernel", "Batched polling of the RX ring in NET_RX_SOFTIRQ."],
    ["skb", "sk_buff", "kernel", "Kernel packet buffer; IP/TCP processing and socket lookup."],
    ["sock", "struct sock", "kernel", "Per-connection kernel socket with receive queue."],
    ["fdt", "FD table", "kernel", "Process file-descriptor table; user space sees an int."],
    ["accept_q", "accept queue", "queue", "Completed connections waiting for accept()."],
    ["poll", "epoll/kqueue", "kernel", "Readiness notification that wakes the runtime."],
  ];
  let node: GraphNode = runtime;
  for (let i = chain.length - 1; i >= 0; i--) {
    const [id, label, kind, detail] = chain[i]!;
    node = n(id, label, kind, detail, [node]);
  }
  return node;
}

function elixir(cfg: SourceConfig): GraphNode {
  const accs = Array.from({ length: cfg.acceptors }, (_, i) =>
    n(`acc_sup_${i}`, `AcceptorSup ${i}`, "sup", "Supervises one acceptor and its DynamicSupervisor (rest_for_one).", [
      n(`acceptor_${i}`, `Acceptor ${i}`, "worker", "Loops on :gen_tcp.accept/1 against the shared listen socket."),
      n(`dyn_sup_${i}`, `DynSup ${i}`, "sup", "DynamicSupervisor that starts :temporary connection handlers.", [
        n(`handler_${i}`, `Handler ${i}`, "handler", "GenServer that owns the socket after controlling_process/2."),
      ]),
    ]),
  );
  return n("app", "WireIngest.App", "sup", "OTP application root supervisor (one_for_one).", [
    n("server", "TI.Server", "sup", "ThousandIsland.Server supervisor.", [
      n("listener", "Listener", "worker", `Owns the listen socket on port ${cfg.port}.`),
      n("pool_sup", "AcceptorPoolSup", "sup", `Starts ${cfg.acceptors} acceptor supervisors.`, accs),
    ]),
  ]);
}

function python(cfg: SourceConfig): GraphNode {
  return n("loop", "asyncio loop", "loop", "Single-threaded event loop; _run_once drives selector + ready queue.", [
    n("selector", "selector", "kernel", "selectors.EpollSelector wrapping epoll."),
    n("server", "asyncio.Server", "worker", `Listening socket, backlog ${cfg.acceptors}.`, [
      n("transport", "Transport", "worker", "_SelectorSocketTransport owning the client FD.", [
        n("task", "Task(handle)", "handler", "Coroutine awaiting StreamReader.readline()."),
      ]),
    ]),
    n("ready", "ready queue", "queue", "Callbacks scheduled with call_soon."),
  ]);
}

function nodejs(cfg: SourceConfig): GraphNode {
  return n("uv_loop", "libuv loop", "loop", "Main-thread event loop (timers → poll → check → close).", [
    n("uv_poll", "poll phase", "kernel", "epoll_wait on the loop thread — TCP readiness lives here."),
    n("server", "net.Server", "worker", `uv_tcp_t listener, maxConnections ${cfg.acceptors}.`, [
      n("callbacks", "V8 callback", "loop", "JS listener invoked via C++ binding; microtasks drain after.", [
        n("socket", "net.Socket", "handler", "Duplex stream emitting data / end / error."),
      ]),
    ]),
    n("threadpool", "threadpool", "queue", "fs/dns/crypto only — not used for TCP reads."),
  ]);
}

function bun(cfg: SourceConfig): GraphNode {
  return n("bun_runtime", "Bun runtime", "loop", "JavaScriptCore runtime with Bun's evented network server.", [
    n("bun_poll", "I/O event loop", "kernel", "Bun dispatches ready network events without blocking the JavaScript thread."),
    n("server", "Bun.serve", "worker", `HTTP/TCP server listening on port ${cfg.port}.`, [
      n("callbacks", "fetch callback", "loop", "Bun invokes the request handler and drains pending promises.", [
        n("socket", "Request", "handler", "Per-connection request data handled by the application."),
      ]),
    ]),
  ]);
}

function odin(cfg: SourceConfig): GraphNode {
  const threads = Array.from({ length: cfg.acceptors }, (_, i) =>
    n(`thread_${i}`, `OS thread ${i}`, "worker", "Pool worker thread blocking in recv.", [
      n(`handler_${i}`, `handle_client`, "handler", "Owns the raw fd; defer net.close."),
    ]),
  );
  return n("process", "process", "sup", "Native process; no runtime scheduler.", [
    n("listener", "listener fd", "worker", `TCP_Socket listening on ${cfg.port}.`, [n("accept_loop", "accept loop", "loop", "Main thread blocking in accept_tcp.")]),
    n("pool", "thread.Pool", "sup", `${cfg.acceptors} OS threads.`, threads),
  ]);
}

const LAYOUTS: Record<Language, (c: SourceConfig) => GraphNode> = { elixir, python, nodejs, bun, odin };

export function buildGraph(language: Language, cfg: SourceConfig): GraphNode {
  return kernelBranch(LAYOUTS[language](cfg));
}
