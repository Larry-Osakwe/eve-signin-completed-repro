# eve: "authorized" sign-in event before completeAuthorization runs

Minimal repro for eve 0.79.0. When a user finishes an interactive sign-in for a connection, eve emits `authorization.completed` with `outcome: "authorized"` as soon as the callback arrives. The connection's `completeAuthorization` runs later, inside the tool's workflow step. If it throws, the user has already been told the sign-in succeeded, and the failure shows up only as the tool call failing.

No model key is needed: `agent/agent.ts` uses a scripted `MockLanguageModelV3` from `ai/test` that calls the connection tool and then repeats the tool result. No real OAuth provider is involved: `agent/channels/fake-idp.ts` redirects straight back to eve's callback with a code, and `agent/connections/rejected.ts` has a `completeAuthorization` that always throws `Error("sign-in rejected")`.

## Run

```sh
npm install
npm exec -- eve dev --no-ui --port 2000
```

In a second terminal:

```sh
node run.mjs
```

`run.mjs` creates a session with the message `ping`, prints the stream events, opens the sign-in URL from `authorization.required` (which redirects to eve's callback), then prints the rest of the stream.

The stream replays from the start when `run.mjs` reconnects after the callback, so the events before the callback print twice.

## Expected

After the callback, either `authorization.completed` waits for `completeAuthorization` and reports `outcome: "failed"` with the thrown error, or no `authorized` outcome is emitted for a sign-in that did not complete.

## Actual

```
authorization.required   {"name":"rejected","authorization":{"url":"http://localhost:2000/fake-idp/authorize?redirect=..."}}
turn.waiting
>> user opens the sign-in URL; the callback answers 200 with eve's "authorization complete" page
authorization.completed  {"name":"rejected","outcome":"authorized","principalId":"alice"}
actions.requested        rejected__ping
action.result            {"status":"failed","error":{"code":"ACTION_RESULT_FAILED","message":"sign-in rejected"},"result":{"toolName":"rejected__ping","isError":true,"output":"sign-in rejected"}}
message.completed        "tool result: [{\"type\":\"error-text\",\"value\":\"Error: sign-in rejected\"}]"
turn.completed
```

The `authorized` outcome is emitted before `completeAuthorization` runs, and the throw surfaces only as the failed tool call.

## Versions

eve 0.79.0 (pinned), ai 7.0.139, Node 24.15.0, npm 11.12.1, Linux (kernel 5.15).
