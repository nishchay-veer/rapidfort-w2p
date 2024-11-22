// storage-service/src/index.js
const express = require("express");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3002;
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);

// File Schema
const FileSchema = new mongoose.Schema({
  fileId: String,
  s3Key: String,
  password: String,
  downloadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const File = mongoose.model("File", FileSchema);

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { fileId, password } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Generate unique S3 key
    const s3Key = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.pdf`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: "application/pdf",
      })
    );

    // Create signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Save file metadata
    const fileDoc = new File({
      fileId,
      s3Key,
      password,
    });
    await fileDoc.save();

    res.json({ url });
  } catch (error) {
    console.error("Storage error:", error);
    res.status(500).json({ error: "Storage operation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Storage service running on port ${PORT}`);
});
