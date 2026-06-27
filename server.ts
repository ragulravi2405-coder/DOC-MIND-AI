import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import dotenv from "dotenv";
import { PDFParse } from "pdf-parse";

dotenv.config();

// Helper to retry Gemini operations under temporary 503/429/UNAVAILABLE spikes
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isRetryable = 
        error?.status === "UNAVAILABLE" || 
        error?.code === 503 ||
        error?.status === 503 ||
        error?.message?.includes("503") ||
        error?.message?.includes("UNAVAILABLE") ||
        error?.message?.includes("high demand") ||
        error?.message?.includes("resource exhausted") ||
        error?.message?.includes("429") ||
        error?.status === "RESOURCE_EXHAUSTED";

      if (isRetryable && attempt <= retries) {
        console.warn(`[Gemini SDK] Temporary high load/503 (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
        continue;
      }
      throw error;
    }
  }
}

const app = express();
const PORT = 3000;

// Body parsing with safe sizing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy-loaded Gemini AI client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        "GEMINI_API_KEY environment variable is missing. Please define it in the Secrets panel."
      );
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// 1. Process Document API
app.post("/api/documents/process", async (req, res) => {
  try {
    const { fileName, fileType, base64 } = req.body;
    if (!fileName || !fileType || !base64) {
      res.status(400).json({ error: "Missing required parameters: fileName, fileType, base64" });
      return;
    }

    const ai = getGeminiClient();
    let promptPartText = "";
    let inlineDataPart: any = null;

    // Handle extraction depending on file type
    if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      const decodedText = Buffer.from(base64, "base64").toString("utf-8");
      promptPartText = `Analyze this text content and construct the knowledge base:\n\n${decodedText}`;
    } else if (
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      const buffer = Buffer.from(base64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      promptPartText = `Analyze this DOCX text content and construct the knowledge base:\n\n${result.value}`;
    } else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      let parser: PDFParse | null = null;
      try {
        const buffer = Buffer.from(base64, "base64");
        parser = new PDFParse({ data: new Uint8Array(buffer) });
        const textResult = await parser.getText();
        const extractedText = textResult.text || "";
        if (extractedText.trim().length > 0) {
          promptPartText = `Analyze this PDF text content and construct the knowledge base:\n\n${extractedText}`;
        } else {
          // Fallback to inlineData for scanned or image-only PDFs
          inlineDataPart = {
            inlineData: {
              data: base64,
              mimeType: "application/pdf",
            },
          };
          promptPartText = "Analyze this PDF document and construct the knowledge base.";
        }
      } catch (pdfErr) {
        console.warn("PDFParse failed, falling back to inlineData:", pdfErr);
        // Fallback to inlineData if parsing fails
        inlineDataPart = {
          inlineData: {
            data: base64,
            mimeType: "application/pdf",
          },
        };
        promptPartText = "Analyze this PDF document and construct the knowledge base.";
      } finally {
        if (parser) {
          try {
            await parser.destroy();
          } catch (destroyErr) {
            console.error("Failed to destroy PDFParse:", destroyErr);
          }
        }
      }
    } else if (fileType.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(fileName)) {
      const mime = fileType.startsWith("image/") ? fileType : "image/jpeg";
      inlineDataPart = {
        inlineData: {
          data: base64,
          mimeType: mime,
        },
      };
      promptPartText = "Analyze this image content and construct the knowledge base.";
    } else {
      // Default to text recovery or send as text
      try {
        const text = Buffer.from(base64, "base64").toString("utf-8");
        promptPartText = `Analyze this document content:\n\n${text}`;
      } catch (err) {
        res.status(400).json({ error: "Unsupported file type. Please upload TXT, DOCX, PDF or PNG/JPG images." });
        return;
      }
    }

    // Build parts array
    const parts: any[] = [];
    if (inlineDataPart) {
      parts.push(inlineDataPart);
    }
    parts.push({
      text: `${promptPartText}
      
      You are an expert AI Learning & Assessment Generator. Your task is to analyze the content provided and generate a complete study bundle containing:
      1. A thorough markdown Summary.
      2. A markdown list of Important Topics.
      3. A set of standard Revision Notes.
      4. An array of exact Keywords with definitions.
      5. An array of Flashcards with questions and answers.
      6. A balanced mock exam package with 10 questions of different types:
         - Types: 'mcq' (Multiple Choice), 'boolean' (True/False), 'fill' (Fill in the blanks), 'short' (Short Answer), 'long' (Long Answer).
         - Difficulties: 'easy', 'medium', 'hard'.
         - Include options list for MCQ types.
      7. A comprehensive Mock Interview package with 10 interview questions of different levels:
         - Types: 'technical', 'hr', 'viva'.
         - Modes: 'beginner', 'intermediate', 'advanced'.
         - Provide a brief description of 'targetCriteria' for evaluation.

      Strict Constraint: Respond with a single, highly structured JSON object. Do not include any markdown wrapper or backticks. Follow this exact JSON output schema:
      {
        "extractedText": "Brief extracted plain text representative of the file (first 500 characters)",
        "summary": "Detailed markdown formatted summary",
        "importantTopics": "Detailed markdown list of topics, key points, or formula sheets where applicable",
        "revisionNotes": "Compact revision notes or cheat sheets",
        "keywords": [
          { "term": "Keyword/Term", "definition": "Definition or explanation" }
        ],
        "flashcards": [
          { "question": "Question?", "answer": "Answer" }
        ],
        "examQuestions": [
          { "id": "q1", "type": "mcq", "question": "Question content?", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "Option A", "difficulty": "easy" }
        ],
        "interviewQuestions": [
          { "id": "int1", "type": "technical", "mode": "beginner", "question": "Interview question?", "targetCriteria": "Target evaluation keywords or focus areas" }
        ]
      }
      `,
    });

    // Generate indexing bundle
    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
        },
      })
    );

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Processing document error:", error);
    res.status(500).json({ error: error.message || "Failed to process and index the document." });
  }
});

// 2. Chat API (Grounded strictly to document text)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, documentText, documentSummary, language } = req.body;
    if (!message) {
      res.status(400).json({ error: "Missing message parameter" });
      return;
    }

    const ai = getGeminiClient();
    const systemInstruction = `You are EduMind AI, a premium intelligent document learning coach.
    Your absolute golden rule: You MUST generate answers and responses ONLY from the uploaded document content provided below.
    If the answer or information is not found in the document content, you must clearly and humbly state: "I'm sorry, but that information is not available in the uploaded document." Do not hallucinate or pull outside knowledge.
    
    Answer the user in their selected language: ${language || "English"}.
    
    Document Summary:
    ${documentSummary || "N/A"}
    
    Document Content:
    ${documentText ? documentText.slice(0, 80000) : "No full content available"}
    `;

    // Map history to part format
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
        },
      })
    );

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat error:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response." });
  }
});

// 3. Answer Evaluation API (Exams or Interviews)
app.post("/api/gemini/evaluate", async (req, res) => {
  try {
    const { question, userAnswer, targetCriteria, type, language } = req.body;
    if (!question) {
      res.status(400).json({ error: "Missing question" });
      return;
    }

    const ai = getGeminiClient();
    const evaluationPrompt = `
    You are an AI assessment auditor. Evaluate the student's answer to the following question.
    
    Question: "${question}"
    Expected/Target Criteria: "${targetCriteria || "Accuracy and comprehension"}"
    Student's Answer: "${userAnswer || "[No answer provided]"}"
    Assessment Type: "${type || "exam"}"
    
    Evaluate the response and output a score from 0 to 100 based on accuracy, alignment with the question content, and quality.
    Provide constructive feedback, identify core strengths, weaknesses, and clear actionable recommendations for improvement.
    The response MUST be written in the user's preferred language: ${language || "English"}.

    Strict Constraint: Respond with a single, highly structured JSON object. Do not include markdown wraps or backticks. Follow this exact JSON format:
    {
      "score": 85,
      "feedback": "Detailed feedback explanation in requested language",
      "strengths": ["Strength A", "Strength B"],
      "weaknesses": ["Weakness A"],
      "suggestions": ["Improvement suggestion A", "Improvement suggestion B"]
    }
    `;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: evaluationPrompt,
        config: {
          responseMimeType: "application/json",
        },
      })
    );

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: error.message || "Failed to evaluate response." });
  }
});

// Start function handling dev/prod server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
