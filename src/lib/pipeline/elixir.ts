import { build, kernelSteps, outcomeTail } from "./common";
import type { Outcome, SourceConfig, Step } from "./types";

export function activeAcceptor(payload: string, acceptors: number) {
  let h = 0;
  for (const c of payload) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % Math.max(1, acceptors);
}

export function elixirSteps(payload: string, outcome: Outcome, cfg: SourceConfig): Step[] {
  const a = activeAcceptor(payload, cfg.acceptors);
  const acc = `acceptor_${a}`;
  const hnd = `handler_${a}`;
  const { body, valid } = outcomeTail(payload, cfg);
  const R = "runtime" as const;
  const base = (node: string, ownerNode: string, owner: string) => ({ node, ownerNode, owner });

  const runtime = [
    { ...base("listener", "listener", "Listener (port owner)"), zone: R, title: "Listener holds the listen socket", explanation: `ThousandIsland.Listener opened :gen_tcp.listen(${cfg.port}) at boot and owns the listen socket. It shares it with every acceptor; it never accepts itself.`, socketState: "LISTEN", queue: ["accept queue: 1"], handlerState: "not started", code: { file: "application.ex", snippet: `{ThousandIsland, port: ${cfg.port}, handler_module: WireIngest.Handler}` } },
    { ...base(acc, "accept_q", `Acceptor ${a} (blocked in accept)`), zone: R, title: `Acceptor ${a} wakes from :gen_tcp.accept/1`, explanation: `${cfg.acceptors} acceptor processes all block in accept on the same listen socket. BEAM's :inet driver registered the FD with epoll; the wakeup lands on one scheduler and acceptor ${a} wins the race.`, socketState: "ESTABLISHED", queue: ["mailbox: []"], handlerState: "not started", code: { file: "supervision_tree.ex", snippet: `num_acceptors: ${cfg.acceptors}` } },
    { ...base(acc, acc, `Acceptor ${a}`), zone: R, title: "Port created; acceptor owns socket", explanation: "accept returns a port (the BEAM's wrapper around the FD). The process that called accept is the controlling process — messages from the socket go to its mailbox.", socketState: "ESTABLISHED · passive", queue: ["mailbox: []"], handlerState: "not started", code: { file: "handler.ex", snippet: "{:ok, socket} = :gen_tcp.accept(listen_socket)" } },
    { ...base(`dyn_sup_${a}`, acc, `Acceptor ${a}`), zone: R, title: "DynamicSupervisor starts a handler", explanation: `The acceptor asks its sibling DynamicSupervisor to start a :temporary handler GenServer, so a crashing connection never takes down the acceptor pool.`, socketState: "ESTABLISHED · passive", queue: ["mailbox: []"], handlerState: "starting (init/1)", code: { file: "supervision_tree.ex", snippet: "DynamicSupervisor.start_child(sup, {Handler, socket})" } },
    cfg.handoff
      ? { ...base(hnd, hnd, `Handler ${a}`), zone: "handler" as const, title: "Ownership handoff", explanation: "The acceptor transfers control so the socket's messages go to the handler's mailbox, then loops back to accept the next connection.", socketState: "ESTABLISHED · passive", queue: ["mailbox: []"], handlerState: "running", code: { file: "handler.ex", snippet: ":gen_tcp.controlling_process(socket, handler_pid)" } }
      : { ...base(hnd, acc, `Acceptor ${a} (no handoff!)`), zone: "handler" as const, title: "Missing ownership handoff", explanation: "Your saved source has no controlling_process/2 call. Socket messages still go to the acceptor's mailbox — the handler will never see data, and the acceptor is stuck serving one client.", socketState: "ESTABLISHED · passive", queue: ["acceptor mailbox"], handlerState: "running · starved", code: { file: "handler.ex", snippet: "# controlling_process/2 not found" } },
    { ...base(hnd, cfg.handoff ? hnd : acc, cfg.handoff ? `Handler ${a}` : `Acceptor ${a}`), zone: "handler" as const, title: `Arm active: ${cfg.activeMode}`, explanation: cfg.activeMode === "once" ? "active: :once delivers exactly one {:tcp, socket, data} message, then flips back to passive. Built-in backpressure: the handler re-arms only when ready." : cfg.activeMode === "true" ? "active: true streams every packet into the mailbox as fast as it arrives — no backpressure, the mailbox can grow without bound." : "Passive mode: the handler must call :gen_tcp.recv/2 explicitly and block.", socketState: `ESTABLISHED · active=${cfg.activeMode}`, queue: [], handlerState: "waiting for data", code: { file: "handler.ex", snippet: `:inet.setopts(socket, active: :${cfg.activeMode === "false" ? "false" : cfg.activeMode})` } },
  ];

  const ownerNode = cfg.handoff ? hnd : acc;
  const msg = JSON.stringify(payload);
  const tail =
    outcome === "frame"
      ? [
          { node: hnd, ownerNode, owner: `Handler ${a}`, zone: "handler" as const, title: "{:tcp, socket, data} in mailbox", explanation: `The port driver read the bytes from sk_receive_queue and sent a message: {:tcp, #Port<>, ${msg}}.`, socketState: "ESTABLISHED · passive (once consumed)", queue: [`{:tcp, port, ${msg}}`], handlerState: "handle_info/2", code: { file: "handler.ex", snippet: "def handle_info({:tcp, socket, data}, state)" } },
          valid
            ? { node: hnd, ownerNode, owner: `Handler ${a}`, zone: "outcome" as const, title: "Frame parsed and echoed", explanation: `Protocol matched prefix ${JSON.stringify(cfg.prefix)} with body ${JSON.stringify(body)}. Handler replies with :gen_tcp.send/2 and re-arms active: :once.`, socketState: "ESTABLISHED", queue: [], handlerState: "replied · re-armed", code: { file: "protocol.ex", snippet: `def parse("${cfg.prefix}" <> body) when body != "", do: {:ok, body}` } }
            : { node: hnd, ownerNode, owner: `Handler ${a}`, zone: "outcome" as const, title: "Frame rejected", explanation: `Payload does not match ${JSON.stringify(cfg.prefix)} + non-empty body. Handler sends an error line and keeps the connection.`, socketState: "ESTABLISHED", queue: [], handlerState: "replied {:error, :bad_frame}", code: { file: "protocol.ex", snippet: "def parse(_), do: {:error, :bad_frame}" } },
        ]
      : outcome === "close"
        ? [{ node: hnd, ownerNode, owner: `Handler ${a}`, zone: "outcome" as const, title: "{:tcp_closed, socket}", explanation: "Peer sent FIN. The port driver delivers :tcp_closed; the handler returns {:stop, :normal, state}. Being :temporary, it is not restarted.", socketState: "CLOSE_WAIT → CLOSED", queue: ["{:tcp_closed, port}"], handlerState: "terminated :normal", code: { file: "handler.ex", snippet: "def handle_info({:tcp_closed, _}, s), do: {:stop, :normal, s}" } }]
        : [{ node: hnd, ownerNode, owner: `Handler ${a}`, zone: "outcome" as const, title: "{:tcp_error, socket, :econnreset}", explanation: "Peer sent RST. The handler stops with the reason; the DynamicSupervisor logs it but the acceptor pool is untouched — let it crash, contained.", socketState: "CLOSED (reset)", queue: ["{:tcp_error, port, :econnreset}"], handlerState: "terminated {:error, :econnreset}", code: { file: "handler.ex", snippet: "def handle_info({:tcp_error, _, r}, s), do: {:stop, r, s}" } }];

  return build("elixir", cfg, [
    ...kernelSteps(cfg, payload, { name: "epoll wakes BEAM's :inet poller", code: "erts_check_io() → epoll_wait(...)", file: "erts/emulator/sys/common/erl_poll.c" }),
    ...runtime,
    ...tail,
  ]);
}
