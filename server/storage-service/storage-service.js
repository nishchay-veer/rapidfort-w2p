const express = require("express");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
const port = 3002;

app.use(express.json());

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const FileSchema = new mongoose.Schema({
  fileName: String,
  s3Key: String,
  isPasswordProtected: Boolean,
  createdAt: { type: Date, default: Date.now },
});

const File = mongoose.model("File", FileSchema);

app.post("/store", async (req, res) => {
  try {
    const { file, fileName } = req.body;
    if (!file || !fileName) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const s3Key = `${crypto.randomBytes(8).toString("hex")}/${fileName}`;

    // Upload to S3
    await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: Buffer.from(file, "base64"), // Decode base64 file data
        ContentType: "application/pdf",
      })
      .promise();

    // Save metadata to MongoDB
    await File.create({
      fileName,
      s3Key,
      isPasswordProtected: false,
    });

    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    res.json({ success: true, fileName, s3Url });
  } catch (error) {
    console.error("Storage error:", error);
    res.status(500).json({ error: "Storage failed" });
  }
});

app.get("/download/:fileName", async (req, res) => {
  try {
    const file = await File.findOne({ fileName: req.params.fileName });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const s3Object = await s3
      .getObject({
        Bucket: process.env.S3_BUCKET,
        Key: file.s3Key,
      })
      .promise();

    res.setHeader("Content-Type", "application/pdf");
    res.send(s3Object.Body);
  } catch (error) {
    res.status(500).json({ error: "Download failed" });
  }
});

app.listen(port, () => {
  console.log(`Storage service running on port ${port}`);
});
