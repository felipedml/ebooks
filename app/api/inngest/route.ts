import { inngest } from "@/app/src/inngest/client";
import { serve } from "inngest/next";
import { runFlowFn } from "@/app/src/inngest/functions/flow-steps";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    runFlowFn
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
  servePath: "/api/inngest",
  // Configurações para desenvolvimento
  ...(process.env.NODE_ENV === 'development' && {
    logLevel: 'warn', // Reduz logs em desenvolvimento
    streaming: 'allow', // Permite streaming
  })
});