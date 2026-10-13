import { eveChannel } from "eve/channels/eve";
import { vercelOidc } from "eve/channels/auth";

// Interactive connection auth needs a user principal. localDev() only
// authenticates a synthetic local-dev principal, so the local dev server
// gets a fixed user instead.
export default eveChannel({
  auth: [
    vercelOidc(),
    () =>
      process.env.EVE_DEV === "1"
        ? { attributes: {}, authenticator: "repro", principalId: "alice", principalType: "user" }
        : null,
  ],
});
