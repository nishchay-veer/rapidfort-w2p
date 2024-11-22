const express = require("express");
const multer = require("multer");
const docxToPDF = require("docx-pdf");
const PDFDocument = require("pdf-lib").PDFDocument;
const crypto = require("crypto");
const axios = require("axios");
const Bull = require("bull");

const app = express();
const port = 3001;

const conversionQueue = new Bull("pdf-conversion", process.env.REDIS_URL);

const storage = multer.memoryStorage();
const upload = multer({ storage });

async function addPasswordToPDF(pdfBuffer, password) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const encryptedPdf = await pdfDoc.save({
    password,
    permissions: {
      printing: "highResolution",
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: false,
    },
  });
  return encryptedPdf;
}

conversionQueue.process(async (job) => {
  const { file, password } = job.data;

  const pdfBuffer = await new Promise((resolve, reject) => {
    docxToPDF(file, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });

  const finalPdf = password
    ? await addPasswordToPDF(pdfBuffer, password)
    : pdfBuffer;

  const fileName = `${crypto.randomBytes(16).toString("hex")}.pdf`;
  await axios.post(`${process.env.STORAGE_SERVICE_URL}/store`, {
    file: finalPdf,
    fileName,
  });

  return { fileName };
});

app.post("/convert", upload.single("file"), async (req, res) => {
  try {
    const password = req.body.password || null;
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    // Add job to the queue
    const job = await conversionQueue.add({
      file: req.file.buffer,
      password,
    });

    // Wait for the job to finish
    const result = await job.finished();

    // Generate a direct S3 URL for download
    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${result.fileName}`;

    res.json({
      success: true,
      fileName: result.fileName,
      storageURL: s3Url,
    });
  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).json({ error: "Conversion or storage failed" });
  }
});

app.listen(port, () => {
  console.log(`Conversion service running on port ${port}`);
});
