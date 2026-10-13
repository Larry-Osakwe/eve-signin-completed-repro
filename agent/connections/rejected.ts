import {
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  defineOpenAPIConnection,
} from "eve/connections";

// A connection whose sign-in always fails at the completion step.
// startAuthorization sends the browser to a local route that redirects
// straight back to eve's callback with a code (no real provider), and
// completeAuthorization rejects that code every time.
export default defineOpenAPIConnection({
  spec: {
    openapi: "3.0.0",
    info: { title: "Ping", version: "1.0.0" },
    paths: {
      "/fake-api/ping": {
        get: { operationId: "ping", summary: "Returns pong.", responses: { "200": { description: "ok" } } },
      },
    },
  },
  baseUrl: "http://localhost:2000",
  description: "Ping service. Call ping to get pong.",
  auth: defineInteractiveAuthorization({
    getToken: async () => {
      throw new ConnectionAuthorizationRequiredError("rejected");
    },
    startAuthorization: async ({ callbackUrl }) => ({
      challenge: {
        url: `http://localhost:2000/fake-idp/authorize?redirect=${encodeURIComponent(callbackUrl)}`,
      },
    }),
    completeAuthorization: async () => {
      throw new Error("sign-in rejected");
    },
  }),
});
