import { defineChannel, GET } from "eve/channels";

// Stands in for an identity provider and for the API behind the connection.
export default defineChannel({
  routes: [
    GET("/fake-idp/authorize", async (request) => {
      const redirect = new URL(request.url).searchParams.get("redirect");
      if (redirect === null) return new Response("missing redirect", { status: 400 });
      const target = new URL(redirect);
      target.searchParams.set("code", "fake-code");
      return Response.redirect(target.toString(), 302);
    }),
    GET("/fake-api/ping", async () => Response.json({ pong: true })),
  ],
});
