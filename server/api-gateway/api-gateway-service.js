const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/convert", async (req, res) => {
  try {
    const { file, password } = req.body;

    // Forward to conversion service
    const conversionResponse = await axios.post(
      `${process.env.CONVERSION_SERVICE_URL}/convert`,
      { file, password }
    );

    res.json(conversionResponse.data);
  } catch (error) {
    res.status(500).json({ error: "Conversion failed" });
  }
});

app.post("/test/convert", async (req, res) => {
  try {
    const testFile = Buffer.from("test content");
    const response = await axios.post(
      `${process.env.CONVERSION_SERVICE_URL}/convert`,
      { file: testFile, password: "test123" }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Test conversion failed" });
  }
});

app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});
