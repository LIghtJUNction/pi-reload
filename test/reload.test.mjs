import assert from "node:assert/strict";
import { test } from "node:test";
import extension from "../extensions/reload.ts";

function setup() {
  const commands = new Map();
  const tools = [];
  const messages = [];
  const events = new Map();
  extension({
    registerCommand: (name, command) => commands.set(name, command),
    registerTool: (tool) => tools.push(tool),
    on: (name, handler) => events.set(name, handler),
    sendUserMessage: (...args) => messages.push(args),
  });
  return { commands, tools, messages, events };
}

const settle = (fixture, aborted = false) => fixture.events.get("agent_settled")({ aborted });

test("exposes exactly one reload tool and one command bridge", () => {
  const { commands, tools, messages } = setup();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, "reload_runtime");
  assert.deepEqual(tools[0].parameters.properties, {});
  assert.equal(tools[0].parameters.additionalProperties, false);
  assert.deepEqual([...commands.keys()], ["agent-reload-runtime"]);
  assert.deepEqual(messages, []);
});

test("tool schedules reload without dispatching a command during the run", async () => {
  const f = setup();
  const result = await f.tools[0].execute();
  assert.deepEqual(f.messages, []);
  assert.deepEqual(result.details, { queued: true });
  assert.match(result.content[0].text, /not completed yet/);
});

test("settled boundary explicitly dispatches the extension command", async () => {
  const f = setup();
  await f.tools[0].execute();
  settle(f);
  assert.deepEqual(f.messages, [
    ["/agent-reload-runtime", { expandPromptTemplates: true }],
  ]);
});

test("idle sessions do not reload without a request", () => {
  const f = setup();
  settle(f);
  assert.deepEqual(f.messages, []);
});

test("multiple requests coalesce and later settled events do not loop", async () => {
  const f = setup();
  await f.tools[0].execute();
  await f.tools[0].execute();
  settle(f);
  settle(f);
  assert.equal(f.messages.length, 1);
});

test("aborting the run cancels the pending reload", async () => {
  const f = setup();
  await f.tools[0].execute();
  settle(f, true);
  settle(f);
  assert.deepEqual(f.messages, []);
  await f.tools[0].execute();
  settle(f);
  assert.equal(f.messages.length, 1);
});

test("command bridge calls and awaits ctx.reload exactly once", async () => {
  const { commands } = setup();
  let calls = 0;
  let release;
  let finished = false;
  const pending = commands.get("agent-reload-runtime").handler("", {
    reload: () => {
      calls++;
      return new Promise((resolve) => { release = resolve; });
    },
  }).then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(finished, false);
  release();
  await pending;
  assert.equal(finished, true);
});

test("reload errors propagate instead of reporting success", async () => {
  const { commands } = setup();
  await assert.rejects(
    commands.get("agent-reload-runtime").handler("", {
      reload: async () => { throw new Error("reload failed"); },
    }),
    /reload failed/,
  );
});
