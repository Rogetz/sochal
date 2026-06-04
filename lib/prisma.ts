import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
//for postgres 
//import { PrismaPg } from "@prisma/adapter-pg";


const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = `${process.env.DATABASE_URL}`;
  const adapter = new PrismaBetterSqlite3({ url: connectionString });

  if (connectionString) {
    return new PrismaClient({
      adapter
      //previous for postgres
      /*adapter: new PrismaPg({
        connectionString,
      }),*/
    });
  }

  return new PrismaClient({} as never);
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);

    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;