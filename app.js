import express from "express";
import { requestLogger } from "./middlewares/requestLogger.js";
import snippetRoutes from "./routes/snippetRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({
    message: "Mini Pastebin / Secure Snippet API",
    endpoints: {
      snippets: "/api/snippets",
      maintenance: "/api/maintenance",
    },
  });
});

app.use("/api/snippets", snippetRoutes);
app.use("/api/maintenance", maintenanceRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }
  const status = error.status || 500;
  res.status(status).json({
    message: error.message || "Internal server error.",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

export default app;
