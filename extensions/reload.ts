import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // Tools do not receive the command-only ctx.reload() API.
  // Follow the host's reload-runtime example: queue a command instead.
  pi.registerCommand("agent-reload-runtime", {
    description: "Reload the Pi runtime (internal bridge for reload_runtime)",
    handler: async (_args, ctx) => {
      await ctx.reload();
      // Reload invalidates this runtime. Do not use ctx or pi afterward.
      return;
    },
  });

  pi.registerTool({
    name: "reload_runtime",
    label: "Reload Pi",
    description:
      "Request the equivalent of Pi /reload: reload extensions, skills, prompts, themes, and context files. " +
      "Queues a follow-up command; this result confirms scheduling, not completion. " +
      "Use after changing Pi resources when a reload is needed, not repeatedly.",
    parameters: Type.Object({}, { additionalProperties: false }),
    async execute() {
      pi.sendUserMessage("/agent-reload-runtime", { deliverAs: "followUp" });
      return {
        content: [{
          type: "text",
          text: "Pi runtime reload queued as a follow-up command. Reload has not completed yet.",
        }],
        details: { queued: true },
      };
    },
  });
}
