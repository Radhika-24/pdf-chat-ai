const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const dotenv = require("dotenv");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

const pdfSchema = new mongoose.Schema({
  content: String,
});
const PDF = mongoose.model("PDF", pdfSchema);

const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    let dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(dataBuffer);
    const pdf = new PDF({ content: data.text });
    await pdf.save();
    res.json({ message: "File uploaded successfully", pdfId: pdf._id });
  } catch (error) {
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

app.post("/ask", async (req, res) => {
  const { question, pdfId } = req.body;
  try {
    const pdf = await PDF.findById(pdfId);
    if (!pdf) {
      return res.status(404).json({ error: "PDF not found" });
    }
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Context: ${pdf.content}\n\nQuestion: ${question}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 100,
      },
    });

    const result = await chat.sendMessage(question);
    const response = await result.response;
    const text = response.text();
    res.json({ answer: text });
  } catch (error) {
    console.log(error);

    res.status(500).json({ error: "Failed to get response from Gemini API" });
  }
});

app.use(express.static(path.join(__dirname, "chat-ui/build")));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "chat-ui", "build", "index.html"));
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
