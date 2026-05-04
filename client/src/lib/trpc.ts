import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../functions/api/trpc/[[trpc]]";

export const trpc = createTRPCReact<AppRouter>();
