import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  let reloadRequested = false;

  pi.registerCommand("agent-reload-runtime", {
    description: "Reload the Pi runtime (internal bridge for reload_runtime)",
    handler: async (_args, ctx) => {
      await ctx.reload();
      // Reload invalidates this runtime. Do not use ctx or pi afterward.
      return;
    },
  });

  pi.on("agent_settled", (event) => {
    if (!reloadRequested) return;
    reloadRequested = false;
    if (event.aborted) return;
    // Pi defers messages sent in agent_settled until its handlers have returned.
    // Explicit command dispatch is essential: the default treats /commands as text.
    pi.sendUserMessage("/agent-reload-runtime", { expandPromptTemplates: true });
  });

  pi.registerTool({
    name: "reload_runtime",
    label: "Reload Pi",
    description:
      "Request the equivalent of Pi /reload: reload extensions, skills, prompts, themes, and context files. " +
      "Schedules a command after the agent settles; this result confirms scheduling, not completion. " +
      "Finish your response to let reload run. An aborted run cancels the request. " +
      "Use after changing Pi resources when a reload is needed, not repeatedly.",
    parameters: Type.Object({}, { additionalProperties: false }),
    async execute() {
      reloadRequested = true;
      return {
        content: [{
          type: "text",
          text: "Pi runtime reload scheduled for after the agent settles. Finish this response to allow it to run. Reload has not completed yet.",
        }],
        details: { queued: true },
      };
    },
  });
}
