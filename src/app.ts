import express, { Application, Request, Response } from "express";
import cors from "cors";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import IndexRoutes from "./routes";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { envVars } from "./config";
import { getAuthNodeHandler } from "./lib/auth";
import { CommerceController } from "./modules/Commerce/commerce.controller";
import { getAllowedOrigins } from "./utils/origin";

const app: Application = express();

const allowedOrigins = getAllowedOrigins(
  envVars.FRONTEND_URL,
  envVars.BETTER_AUTH_URL,
  envVars.STRIPE_SUCCESS_URL,
  envVars.STRIPE_CANCEL_URL,
  "http://localhost:3000",
  "http://localhost:5000",
);

const resolveViewsPath = () => {
  const candidates = [
    path.resolve(process.cwd(), "src", "shared", "templates"),
    path.resolve(process.cwd(), "src", "templates"),
    path.resolve(process.cwd(), "shared", "templates"),
    path.resolve(process.cwd(), "templates"),
    path.resolve(process.cwd(), "dist", "shared", "templates"),
    path.resolve(process.cwd(), "dist", "templates"),
    path.resolve(process.cwd(), ".dist", "shared", "templates"),
    path.resolve(process.cwd(), ".dist", "templates"),
  ];

  return (
    candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0]
  );
};

app.set("view engine", "ejs");
app.set("views", resolveViewsPath());
app.post(
  "/api/v1/commerce/payments/webhook/stripe",
  express.raw({ type: "application/json" }),
  CommerceController.stripeWebhook,
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/auth", async (req, res, next) => {
  try {
    const authHandler = await getAuthNodeHandler();
    await authHandler(req, res);
    return;
  } catch (error) {
    return next(error);
  }
});

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(cookieParser());

// application routes
// app.use('/api/v1', router);

app.use("/api/v1", IndexRoutes);
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Apollo Gears World!");
});
app.use(globalErrorHandler);
app.use(notFound);

export default app;
