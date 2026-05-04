import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { inferAsyncReturnType } from "@trpc/server";

type EnvShape = {
  CLOUDFLARE_AI_PROXY_URL?: string;
  CLOUDFLARE_AI_PROXY_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
};

export function createContext({
  req,
  env,
}: FetchCreateContextFnOptions & { env?: EnvShape }) {
  return {
    req,
    env: env ?? {},
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
