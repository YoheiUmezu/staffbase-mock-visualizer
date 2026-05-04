import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "../../_core/context";
import { mockRouter } from "../../_core/mock";
import { router } from "../../_core/router";

const appRouter = router({
  mock: mockRouter,
});

export type AppRouter = typeof appRouter;

export const onRequest = async (ctx: any) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: ctx.request,
    router: appRouter,
    createContext: ({ req }) =>
      createContext({
        req,
        resHeaders: new Headers(),
        env: ctx.env,
      }),
  });
};
