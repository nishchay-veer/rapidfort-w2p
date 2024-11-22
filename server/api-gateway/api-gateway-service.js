const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const morgan = require("morgan");
const fs = require("fs");
const FormData = require("form-data");

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });

// Middleware order is important
app.use(morgan("dev")); // Logging first
app.use(cors()); // Then CORS
app.use(express.json()); // JSON parsing for regular requests

// Log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Explicit POST route for conversion
app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    console.log("Received file conversion request");

    if (!req.file) {
      console.log("No file received");
      return res.status(400).json({ error: "No file provided" });
    }

    console.log("File details:", {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    const conversionServiceUrl =
      process.env.CONVERSION_SERVICE_URL || "http://conversion-service:3001";

    // Forward the file and any additional fields to the conversion service
    const formData = new FormData();
    formData.append(
      "file",
      req.file.buffer || fs.createReadStream(req.file.path),
      {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      }
    );

    if (req.body.password) {
      formData.append("password", req.body.password);
    }

    console.log("Forwarding to conversion service:", conversionServiceUrl);

    // Get the headers from FormData and merge with additional required headers
    const formDataHeaders = formData.getHeaders ? formData.getHeaders() : {};
    const headers = {
      ...formDataHeaders,
      "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
      ...(formData.getCustomHeaders?.() || {}),
    };

    const response = await axios.post(
      `${conversionServiceUrl}/convert`,
      formData,
      { headers }
    );

    console.log("Received response from conversion service");

    // Clean up uploaded file
    if (req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temporary file:", err);
      });
    }

    res.json(response.data);
  } catch (error) {
    console.error("Error in /convert route:", error);

    // Clean up uploaded file in case of error
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temporary file:", err);
      });
    }

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage =
        error.response?.data?.error || "Conversion service error";
      res.status(statusCode).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// 404 handler for undefined routes
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
