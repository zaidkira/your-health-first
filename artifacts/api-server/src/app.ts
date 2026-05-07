import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

// Initialize default admin user
async function initAdmin() {
  try {
    const email = "admin@health.com";
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    
    if (!existing) {
      await db.insert(usersTable).values({
        name: "Super Admin",
        email: email,
        passwordHash: hashPassword("admin123"),
        role: "admin",
        wilaya: "Algiers"
      });
      logger.info("Default admin user created: admin@health.com / admin123");
    } else if (existing.role !== "admin") {
      await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, existing.id));
      logger.info("Existing user promoted to admin: admin@health.com");
    }
  } catch (err) {
    logger.error({ err }, "Failed to initialize admin user");
  }
}

initAdmin();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api", router);

// Serve static files in production
const publicDir = path.resolve(__dirname, "../../my-health-first/dist/public");
app.use(express.static(publicDir));
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.sendFile(path.resolve(publicDir, "index.html"));
  } else {
    next();
  }
});

export default app;
