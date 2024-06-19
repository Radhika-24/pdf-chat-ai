"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const { GoogleGenerativeAI } = require("@google/generative-ai");
dotenv_1.default.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
mongoose_1.default.connect(process.env.MONGO_URI || "");
const pdfSchema = new mongoose_1.default.Schema({
    content: String,
});
const PDF = mongoose_1.default.model("PDF", pdfSchema);
const upload = (0, multer_1.default)({ dest: "uploads/" });
app.post("/upload", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let dataBuffer = fs_1.default.readFileSync(((_a = req === null || req === void 0 ? void 0 : req.file) === null || _a === void 0 ? void 0 : _a.path) || "");
        const data = yield (0, pdf_parse_1.default)(dataBuffer);
        const pdf = new PDF({ content: data.text });
        yield pdf.save();
        res.json({ message: "File uploaded successfully", pdfId: pdf._id });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to process PDF" });
    }
}));
app.post("/ask", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { question, pdfId } = req.body;
    try {
        const pdf = yield PDF.findById(pdfId);
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
        const result = yield chat.sendMessage(question);
        const response = yield result.response;
        const text = response.text();
        res.json({ answer: text });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Failed to get response from Gemini API" });
    }
}));
app.use(express_1.default.static(path_1.default.join(__dirname, "../chat-ui/build")));
app.get("*", (req, res) => {
    res.sendFile(path_1.default.resolve(__dirname, "chat-ui", "build", "index.html"));
});
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
