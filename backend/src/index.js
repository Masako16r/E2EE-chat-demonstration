const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../swagger.json");

const app = express();
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));



app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
  console.log("Swagger on http://localhost:4000/api-docs");
});
