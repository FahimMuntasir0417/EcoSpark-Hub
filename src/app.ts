import express, { Application, Request, Response } from "express";
import cors from "cors";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { notFound } from "./middlewares/notFound";
import IndexRoutes from "./routes";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { envVars } from "./config";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { CommerceController } from "./modules/Commerce/commerce.controller";

const app: Application = express();

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
    origin: [
      envVars.FRONTEND_URL,
      envVars.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/auth", toNodeHandler(auth));

// parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(cookieParser());
app.use(cors());

// application routes
// app.use('/api/v1', router);

app.use("/api/v1", IndexRoutes);
app.get("/", (req: Request, res: Response) => {
  res.send("Hello from Apollo Gears World!");
});
app.use(globalErrorHandler);
app.use(notFound);

export default app;
