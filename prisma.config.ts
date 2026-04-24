import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (defineConfig as any)({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.POSTGRES_PRISMA_URL!,
  },
  adapter: () => new PrismaNeon({ connectionString: process.env.POSTGRES_PRISMA_URL! }),
});
