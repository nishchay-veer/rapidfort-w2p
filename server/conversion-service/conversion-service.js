const express = require("express");
const multer = require("multer");
const libre = require("libreoffice-convert");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const FormData = require("form-data");

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ dest: "uploads/" });
const convertAsync = promisify(libre.convert);

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// MongoDB connection with error handling
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Document Schema
const DocumentSchema = new mongoose.Schema({
  originalName: String,
  fileId: String,
  convertedUrl: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
  password: String,
});

const Document = mongoose.model("Document", DocumentSchema);

// Helper function to clean up files
const cleanupFiles = async (...filePaths) => {
  for (const filePath of filePaths) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }
};

app.post("/convert", upload.single("file"), async (req, res) => {
  const inputPath = req.file?.path;
  const fileId = uuidv4();
  const outputPath = path.join("uploads", `${fileId}.pdf`);

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Create document record first
    const doc = new Document({
      originalName: req.file.originalname,
      fileId,
      status: "processing",
      password: req.body.password,
    });
    await doc.save();

    // Read input file
    const docxBuf = await fs.promises.readFile(inputPath);

    // Convert to PDF
    console.log("Starting conversion to PDF...");
    const pdfBuf = await convertAsync(docxBuf, ".pdf", undefined);
    await fs.promises.writeFile(outputPath, pdfBuf);
    console.log("PDF conversion completed");

    // Update status to uploading
    doc.status = "uploading";
    await doc.save();

    // Prepare form data for storage service
    const formData = new FormData();
    formData.append("file", fs.createReadStream(outputPath));
    formData.append("fileId", fileId);
    if (req.body.password) {
      formData.append("password", req.body.password);
    }

    // Get form data headers safely
    const formDataHeaders = formData.getHeaders ? formData.getHeaders() : {};
    const headers = {
      ...formDataHeaders,
      "Content-Type": `multipart/form-data; boundary=${formData.getBoundary()}`,
      ...(formData.getCustomHeaders?.() || {}),
    };

    // Upload to storage service
    console.log("Uploading to storage service...");
    const storageResponse = await axios.post(
      `${process.env.STORAGE_SERVICE_URL}/upload`,
      formData,
      { headers }
    );

    // Update document record with success
    doc.convertedUrl = storageResponse.data.url;
    doc.status = "completed";
    await doc.save();

    // Clean up files
    await cleanupFiles(inputPath, outputPath);

    res.json({
      message: "Conversion successful",
      fileId: fileId,
      storageUrl: storageResponse.data.url,
    });
  } catch (error) {
    console.error("Conversion error:", error);

    // Update document status to failed
    if (fileId) {
      try {
        await Document.findOneAndUpdate({ fileId }, { status: "failed" });
      } catch (dbError) {
        console.error("Error updating document status:", dbError);
      }
    }

    // Clean up files in case of error
    await cleanupFiles(inputPath, outputPath);

    // Send appropriate error response
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage =
        error.response?.data?.error || "Storage service error";
      res.status(statusCode).json({ error: errorMessage });
    } else {
      res.status(500).json({
        error: "Conversion failed",
        details: error.message,
      });
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Conversion service running on port ${PORT}`);
});
