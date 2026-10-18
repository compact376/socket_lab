import type { Language, SourceConfig, Step, Zone } from "./types";

export const MAX_ACCEPTORS = 100;

export const DEFAULT_CONFIG: SourceConfig = {
  acceptors: 10,
  prefix: "ECHO ",
  activeMode: "once",
  handoff: true,
  requireBody: true,
  port: 4000,
};

export function clampCount(value: unknown, fallback = DEFAULT_CONFIG.acceptors): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return Math.min(MAX_ACCEPTORS, Math.max(1, Math.trunc(n)));
}

export function sanitizePayload(raw: string): string {
  // Strip control chars except tab; bound length.
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").slice(0, 256);
}

export function withConfig(cfg?: Partial<SourceConfig>): SourceConfig {
  return { ...DEFAULT_CONFIG, ...cfg, acceptors: clampCount(cfg?.acceptors) };
}

export const KERNEL_NODES = ["nic", "dma", "irq", "napi", "skb", "sock", "fdt", "accept_q", "poll"] as const;

type Draft = Omit<Step, "id" | "language" | "path" | "acceptors"> & { id?: string };

export function build(language: Language, cfg: SourceConfig, drafts: Draft[]): Step[] {
  const path: string[] = [];
  return drafts.map((d, i) => {
    if (!path.includes(d.node)) path.push(d.node);
    return {
      ...d,
      id: d.id ?? `${language}-${i}`,
      language,
      acceptors: cfg.acceptors,
      path: [...path],
    };
  });
}

export function kernelSteps(cfg: SourceConfig, payload: string, wake: { name: string; code: string; file: string }): Draft[] {
  const bytes = new TextEncoder().encode(payload).length + 40;
  const k = (zone: Zone, node: string, title: string, explanation: string, socketState: string, queue: string[] = [], snippet = "", file = "linux/net"): Draft => ({
    zone,
    node,
    ownerNode: node,
    title,
    explanation,
    owner: zone === "hardware" ? "NIC hardware" : "Linux kernel",
    socketState,
    queue,
    handlerState: "not started",
    code: { file, snippet },
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
    { ...k("kernel", "poll", wake.name, "The readiness notifier (epoll on Linux, kqueue on BSD/macOS) marks the FD ready and wakes whatever is blocked waiting on it.", "ESTABLISHED", ["ready list: fd"], wake.code, wake.file), owner: "Linux kernel → runtime" },
  ];
}

export function outcomeTail(payload: string, cfg: SourceConfig) {
  const body = payload.startsWith(cfg.prefix) ? payload.slice(cfg.prefix.length) : null;
  const valid = body !== null && (!cfg.requireBody || body.trim().length > 0);
  return { body, valid };
}
