const processes = [
  Bun.spawn(["bun", "run", "dev"], { stdout: "inherit", stderr: "inherit" }),
  Bun.spawn(["bun", "run", "editor-server"], { stdout: "inherit", stderr: "inherit" }),
];

export {};

const stopChildren = () => {
  for (const child of processes) child.kill();
};

process.on("SIGINT", stopChildren);
process.on("SIGTERM", stopChildren);

const exitCodes = await Promise.all(processes.map((child) => child.exited));
stopChildren();

const failed = exitCodes.find((code) => code !== 0);
process.exit(failed ?? 0);
