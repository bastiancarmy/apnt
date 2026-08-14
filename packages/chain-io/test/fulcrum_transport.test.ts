import net from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import {
  createFulcrumChainIoProviderV0,
  electrumScripthashForLockingBytecodeV0,
  type ChainIoProviderV0,
} from "../src/index.js";

type StubRequestV0 = Readonly<{
  id: string;
  method: string;
  params: readonly unknown[];
}>;

type StubConnectionV0 = Readonly<{
  index: number;
  socket: net.Socket;
  send: (envelope: unknown) => void;
}>;

type StubServerV0 = Readonly<{
  port: number;
  connectionCount: () => number;
  close: () => Promise<void>;
}>;

const LOCKING_BYTECODES = ["11", "22", "33", "44"].map((byte) => `76a914${byte.repeat(20)}88ac`);
const TXIDS = ["aa", "bb", "cc", "dd"].map((byte) => byte.repeat(32));

function scripthashIndexV0(scripthash: unknown): number {
  const index = LOCKING_BYTECODES.findIndex(
    (lockingBytecode) => electrumScripthashForLockingBytecodeV0(lockingBytecode) === scripthash,
  );
  if (index < 0) throw new Error(`unexpected scripthash ${String(scripthash)}`);
  return index;
}

function listUnspentResultV0(index: number): unknown {
  return [{ tx_hash: TXIDS[index], tx_pos: 0, value: String(1_000 + index), height: 100 + index }];
}

async function startFulcrumStubServerV0(
  handle: (request: StubRequestV0, connection: StubConnectionV0) => void,
): Promise<StubServerV0> {
  let connectionCount = 0;
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    connectionCount += 1;
    const index = connectionCount;
    sockets.add(socket);
    // The stub keeps no event-loop handles of its own, so active-resource
    // assertions below observe only the provider's pooled client socket.
    socket.unref();
    socket.setEncoding("utf8");
    socket.on("error", () => undefined);
    socket.on("close", () => sockets.delete(socket));
    const connection: StubConnectionV0 = Object.freeze({
      index,
      socket,
      send: (envelope: unknown) => {
        if (socket.destroyed) return;
        socket.write(`${JSON.stringify(envelope)}\n`);
      },
    });
    let buffer = "";
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (line.length === 0) continue;
        const parsed = JSON.parse(line) as Readonly<{ id: string; method: string; params: readonly unknown[] }>;
        handle(Object.freeze({ id: parsed.id, method: parsed.method, params: parsed.params }), connection);
      }
    });
  });
  server.unref();
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address !== null ? address.port : 0);
    });
  });
  return Object.freeze({
    port,
    connectionCount: () => connectionCount,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  });
}

function stubProviderV0(port: number, requestTimeoutMs = 2_000): ChainIoProviderV0 {
  return createFulcrumChainIoProviderV0({
    network: "chipnet",
    endpoints: [{ network: "chipnet", host: "127.0.0.1", port, transport: "tcp", label: "stub" }],
    requestTimeoutMs,
  });
}

function lookupV0(provider: ChainIoProviderV0, index: number) {
  return provider.lookupTransparentUtxosByLockingBytecodeEvidence({
    network: "chipnet",
    lockingBytecode: LOCKING_BYTECODES[index] as string,
  });
}

let openServer: StubServerV0 | undefined;

afterEach(async () => {
  await openServer?.close();
  openServer = undefined;
});

describe("Fulcrum persistent pipelined transport v0", () => {
  it("reuses one socket and pipelines concurrent lookups matched by request id", async () => {
    const inFlight: (StubRequestV0 & Readonly<{ connection: StubConnectionV0 }>)[] = [];
    const server = await startFulcrumStubServerV0((request, connection) => {
      inFlight.push(Object.freeze({ ...request, connection }));
      if (inFlight.length < 3) return;
      // Every request reached the server before any answer went back, and the
      // answers go back in reverse order to prove id matching does the routing.
      for (const entry of [...inFlight].reverse()) {
        entry.connection.send({
          jsonrpc: "2.0",
          id: entry.id,
          result: listUnspentResultV0(scripthashIndexV0(entry.params[0])),
        });
      }
    });
    openServer = server;
    const provider = stubProviderV0(server.port);

    const results = await Promise.all([lookupV0(provider, 0), lookupV0(provider, 1), lookupV0(provider, 2)]);
    expect(results.map((entries) => entries[0]?.valueSats)).toEqual(["1000", "1001", "1002"]);
    expect(results.map((entries) => entries[0]?.txid)).toEqual([TXIDS[0], TXIDS[1], TXIDS[2]]);
    expect(inFlight.every((entry) => entry.connection.index === 1)).toBe(true);
    expect(server.connectionCount()).toBe(1);

    // A later sequential lookup keeps riding the same already-open socket.
    const later = await lookupV0(provider, 3);
    expect(later[0]?.valueSats).toBe("1003");
    expect(server.connectionCount()).toBe(1);
  });

  it("times out one pipelined request without disturbing the others on the socket", async () => {
    const server = await startFulcrumStubServerV0((request, connection) => {
      const index = scripthashIndexV0(request.params[0]);
      if (index === 0) return;
      connection.send({ jsonrpc: "2.0", id: request.id, result: listUnspentResultV0(index) });
    });
    openServer = server;
    const provider = stubProviderV0(server.port, 300);

    const abandoned = lookupV0(provider, 0);
    const answered = lookupV0(provider, 1);
    await expect(answered).resolves.toHaveLength(1);
    await expect(abandoned).rejects.toThrow(/timeout calling Fulcrum blockchain\.scripthash\.listunspent/u);
    // The abandoned request never redials: the peer may already have acted on it.
    expect(server.connectionCount()).toBe(1);

    await expect(lookupV0(provider, 2)).resolves.toHaveLength(1);
    expect(server.connectionCount()).toBe(1);
  });

  it("routes a JSON-RPC error only to the request that caused it", async () => {
    const server = await startFulcrumStubServerV0((request, connection) => {
      const index = scripthashIndexV0(request.params[0]);
      if (index === 0) {
        connection.send({ jsonrpc: "2.0", id: request.id, error: { code: 2, message: "stub scripthash rejected" } });
        return;
      }
      connection.send({ jsonrpc: "2.0", id: request.id, result: listUnspentResultV0(index) });
    });
    openServer = server;
    const provider = stubProviderV0(server.port);

    const [failed, succeeded] = await Promise.allSettled([lookupV0(provider, 0), lookupV0(provider, 1)]);
    expect(failed.status).toBe("rejected");
    expect(String((failed as PromiseRejectedResult).reason)).toContain("stub scripthash rejected");
    expect(succeeded.status).toBe("fulfilled");
    expect((succeeded as PromiseFulfilledResult<readonly { valueSats: string }[]>).value[0]?.valueSats).toBe("1001");
    expect(server.connectionCount()).toBe(1);
  });

  it("redials transparently when the pooled socket was dropped by the peer", async () => {
    let firstConnectionRequests = 0;
    const server = await startFulcrumStubServerV0((request, connection) => {
      if (connection.index === 1) {
        firstConnectionRequests += 1;
        // The pooled socket goes stale exactly the way an idle-timed-out
        // Fulcrum connection does: the second request is never answered.
        if (firstConnectionRequests > 1) {
          connection.socket.destroy();
          return;
        }
      }
      connection.send({
        jsonrpc: "2.0",
        id: request.id,
        result: listUnspentResultV0(scripthashIndexV0(request.params[0])),
      });
    });
    openServer = server;
    const provider = stubProviderV0(server.port);

    await expect(lookupV0(provider, 0)).resolves.toHaveLength(1);
    expect(server.connectionCount()).toBe(1);

    const afterDrop = await lookupV0(provider, 1);
    expect(afterDrop[0]?.valueSats).toBe("1001");
    expect(server.connectionCount()).toBe(2);

    // The replacement connection is itself pooled and reused.
    await expect(lookupV0(provider, 2)).resolves.toHaveLength(1);
    expect(server.connectionCount()).toBe(2);
  });

  it("holds the event loop open only while a pooled request is in flight", async () => {
    const server = await startFulcrumStubServerV0((request, connection) => {
      setTimeout(() => {
        connection.send({
          jsonrpc: "2.0",
          id: request.id,
          result: listUnspentResultV0(scripthashIndexV0(request.params[0])),
        });
      }, 40);
    });
    openServer = server;
    const provider = stubProviderV0(server.port);
    const activeSockets = (): number =>
      process.getActiveResourcesInfo().filter((resource) => resource === "TCPSocketWrap").length;

    const baseline = activeSockets();
    const pending = lookupV0(provider, 0);
    // Dialling and awaiting a response must keep the process alive; an unref()ed
    // socket here would let Node exit with the lookup still outstanding.
    expect(activeSockets()).toBe(baseline + 1);
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(activeSockets()).toBe(baseline + 1);

    await expect(pending).resolves.toHaveLength(1);
    // Idle between requests the pooled socket is unref()ed, so a long-lived
    // provider never keeps a CLI process from exiting.
    expect(activeSockets()).toBe(baseline);

    await expect(lookupV0(provider, 1)).resolves.toHaveLength(1);
    expect(server.connectionCount()).toBe(1);
  });

  it("fails closed when the endpoint cannot be dialled at all", async () => {
    const server = await startFulcrumStubServerV0(() => undefined);
    const port = server.port;
    await server.close();
    openServer = undefined;
    const provider = stubProviderV0(port, 500);

    await expect(lookupV0(provider, 0)).rejects.toThrow(/unable to call blockchain\.scripthash\.listunspent/u);
  });
});
