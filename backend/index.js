import "dotenv/config";
import db from "./db/db.config.js";
import express from "express";
import cors from "cors";
import mainRouter from "./src/api/main.route.js";
import { ErrorHandler } from "./src/middleware/error.handler.js";
const app = express();
app.use(
  cors({
    origin: 'http://localhost:5173'
  }),
);

app.use(express.json()); //is use to parse the given json file
app.use("/api", mainRouter);
app.use(ErrorHandler);
async function startServer() {
  try {
    const connection = await db.getConnection();
    connection.release();
    app.listen(3788, (err) => {
      if (err) {
        throw err;
      }
      console.log("server listening on port http://localhost:3788");
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
  }
}

startServer();
