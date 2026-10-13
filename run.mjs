// Drives one turn against a running `eve dev --no-ui` server on port 2000
// and prints the stream events a user-facing channel would see, in order.
const base = process.env.EVE_URL ?? "http://127.0.0.1:2000";
const skip = new Set(["session.started", "turn.started", "message.received", "step.started"]);

const created = await fetch(`${base}/eve/v1/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message: "ping" }),
}).then((r) => r.json());
const sessionId = created.sessionId;

const show = (event) => {
  if (skip.has(event.type)) return;
  const d = event.data ?? {};
  const pick = {};
  for (const k of ["authorization", "outcome", "reason", "connectionName", "name", "toolName", "code", "message", "text", "delta", "output", "wait"]) {
    if (d[k] !== undefined) pick[k] = d[k];
  }
  if (d.details?.message) pick.message = d.details.message;
  console.log(event.type, JSON.stringify(pick));
};

let challengeUrl;
for await (const event of stream()) {
  show(event);
  if (event.type === "authorization.required") challengeUrl = event.data.authorization?.url;
  if (event.type === "turn.waiting" || event.type === "session.waiting") break;
}
if (challengeUrl === undefined) {
  console.log("no sign-in prompt arrived");
  process.exit(1);
}
console.log(`>> user opens ${challengeUrl}`);
const page = await fetch(challengeUrl, { redirect: "follow" });
console.log(`>> callback answered ${page.status} ${page.headers.get("content-type") ?? ""}`);
for await (const event of stream()) {
  show(event);
  if (event.type === "session.waiting" || event.type === "turn.failed") break;
}

async function* stream() {
  const res = await fetch(`${base}/eve/v1/session/${sessionId}/stream`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line === "") continue;
      try { yield JSON.parse(line); } catch { console.log("raw:", line.slice(0, 200)); }
    }
  }
}
