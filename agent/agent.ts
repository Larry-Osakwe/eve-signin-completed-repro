import { defineAgent } from "eve";
import { MockLanguageModelV3 } from "ai/test";

// A scripted model, so the repro needs no provider key. On the first
// model call it calls the connection tool; on every later call it
// reports the last tool result as text.
const model = new MockLanguageModelV3({
  provider: "mock",
  modelId: "scripted",
  doStream: async ({ prompt }) => {
    const last = prompt[prompt.length - 1];
    const toolResult =
      last?.role === "tool"
        ? JSON.stringify(last.content.map((part) => ("output" in part ? part.output : part)))
        : undefined;
    const parts =
      toolResult === undefined
        ? [
            {
              type: "tool-call" as const,
              toolCallId: "call_1",
              toolName: "eve__tool",
              input: JSON.stringify({ name: "rejected__ping", input: {} }),
            },
          ]
        : [
            { type: "text-start" as const, id: "t1" },
            { type: "text-delta" as const, id: "t1", delta: `tool result: ${toolResult}` },
            { type: "text-end" as const, id: "t1" },
          ];
    return {
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          for (const part of parts) controller.enqueue(part);
          controller.enqueue({
            type: "finish",
            finishReason: {
              unified: toolResult === undefined ? ("tool-calls" as const) : ("stop" as const),
              raw: undefined,
            },
            usage: {
              inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 0, text: 0, reasoning: 0 },
            },
          });
          controller.close();
        },
      }),
    };
  },
});

export default defineAgent({ model, modelContextWindowTokens: 128_000 });
