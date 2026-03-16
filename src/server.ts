import app from "./app";
import { envVars } from "./config";

async function main() {
  const port = Number(envVars.PORT) || 5000;

  try {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
}

main();
