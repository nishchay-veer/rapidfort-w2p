const axios = require("axios");

class TestRunner {
  constructor() {
    this.apiUrl = process.env.API_URL;
  }

  async runTests() {
    console.log("Starting tests...");

    const tests = [
      this.testBasicConversion,
      this.testPasswordProtection,
      this.testLargeFile,
      this.testInvalidFile,
    ];

    for (const test of tests) {
      try {
        await test.call(this);
        console.log(`✅ ${test.name} passed`);
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error.message);
      }
    }
  }

  async testBasicConversion() {
    const response = await axios.post(`${this.apiUrl}/test/convert`, {
      file: Buffer.from("test content"),
    });

    if (!response.data.success) {
      throw new Error("Basic conversion failed");
    }
  }

  async testPasswordProtection() {
    const response = await axios.post(`${this.apiUrl}/test/convert`, {
      file: Buffer.from("test content"),
      password: "test123",
    });

    if (!response.data.success) {
      throw new Error("Password protection failed");
    }
  }

  async testLargeFile() {
    const largeContent = Buffer.alloc(1024 * 1024 * 10); // 10MB

    try {
      await axios.post(`${this.apiUrl}/test/convert`, {
        file: largeContent,
      });
      throw new Error("Should have rejected large file");
    } catch (error) {
      if (error.response?.status !== 413) {
        throw new Error("Large file handling failed");
      }
    }
  }

  async testInvalidFile() {
    try {
      await axios.post(`${this.apiUrl}/test/convert`, {
        file: Buffer.from("invalid content"),
      });
      throw new Error("Should have rejected invalid file");
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error("Invalid file handling failed");
      }
    }
  }
}

const runner = new TestRunner();
runner.runTests();
