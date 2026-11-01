import assert from "node:assert/strict";
import { test } from "node:test";
import extension from "../extensions/reload.ts";

function setup() {
  const commands = new Map();
  const tools = [];
  const messages = [];
  extension({
    registerCommand: (name, command) => commands.set(name, command),
    registerTool: (tool) => tools.push(tool),
    sendUserMessage: (...args) => messages.push(args),
  });
  return { commands, tools, messages };
}

test("exposes exactly one reload tool and one command bridge", () => {
  const { commands, tools, messages } = setup();
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, "reload_runtime");
  assert.deepEqual(tools[0].parameters.properties, {});
  assert.equal(tools[0].parameters.additionalProperties, false);
  assert.deepEqual([...commands.keys()], ["agent-reload-runtime"]);
  assert.deepEqual(messages, []);
});

test("tool schedules a follow-up, without claiming reload is complete", async () => {
  const { tools, messages } = setup();
  const result = await tools[0].execute();
  assert.deepEqual(messages, [
    ["/agent-reload-runtime", { deliverAs: "followUp" }],
  ]);
  assert.deepEqual(result.details, { queued: true });
  assert.match(result.content[0].text, /not completed yet/);
});

test("queued bridge calls and awaits ctx.reload exactly once", async () => {
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

test("queue errors propagate instead of returning a queued result", async () => {
  let tool;
  extension({
    registerCommand() {},
    registerTool: (value) => { tool = value; },
    sendUserMessage: () => { throw new Error("queue failed"); },
  });
  await assert.rejects(tool.execute(), /queue failed/);
});
