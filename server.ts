import dotenv from "dotenv";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '500mb' }));

// ==========================================
// GEMINI API INTEGRATION
// ==========================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const CHAT_MODEL = "gemma-4-31b-it";
const EMBED_MODEL = "gemini-embedding-2";

app.post("/api/chat", async (req, res) => {
  const { message, file, chatSummary, history, customInstructions, preferredLang } = req.body;
  
  try {
    let prompt = "";
    if (chatSummary && typeof chatSummary === 'string' && chatSummary.trim()) {
      prompt += `📌 [CHAT TOPIC REFERENCE & PROCESS STATUS]:\n${chatSummary.trim()}\n\n`;
    }

    if (history && Array.isArray(history) && history.length > 0) {
      prompt += `💬 [RECENT CONVERSATION HISTORY IN THIS CHAT]:\n`;
      for (const h of history.slice(-6)) {
        prompt += `${h.role === 'user' ? 'User' : 'Jyoti AI'}: ${h.content}\n`;
      }
      prompt += `\n`;
    }

    if (customInstructions && typeof customInstructions === 'string' && customInstructions.trim()) {
      prompt += `⚙️ [USER's CUSTOM PREFERENCES & SYSTEM INSTRUCTIONS]:\n${customInstructions.trim()}\n\n`;
    }

    if (preferredLang && typeof preferredLang === 'string' && preferredLang !== 'auto') {
      prompt += `🌐 [PREFERRED RESPONSE LANGUAGE]: ${preferredLang}\n\n`;
    }
    
    prompt += `👤 [CURRENT USER MESSAGE]: ${message}`;
    if (file && file.type === 'text') {
      const truncatedFile = file.content.length > 25000 
        ? file.content.substring(0, 25000) + "\n...[Content truncated due to size limits]" 
        : file.content;
      prompt += `\n\n📄 [ATTACHED FILE CONTENT]:\n${truncatedFile}`;
    }

    const systemInstruction = `You are Jyoti AI, a highly advanced assistant powered by Hritik AI.
Answer intelligently, accurately, and concisely in Hindi or English as requested. Always respect any USER CUSTOM PREFERENCES if provided.

CRITICAL REQUIREMENT - DYNAMIC TOPIC & PROCESS TRACKING:
You MUST maintain and update the Chat Topic Reference & Process Tracker for this conversation.
Always return your output as a JSON object containing two fields:
1. "response": Your detailed markdown response to the user.
2. "summary": A concise 20 to 30 word reference capturing (a) the main topic of discussion and (b) the current progress/stage reached in the process (e.g., "Topic: Python bug fixing | Progress: Diagnosed IndexError in data processing function, provided patch, awaiting user verification.").`;

    // Attempt generation with retry on primary model and automatic fallback on high demand / 503
    let aiText = "";
    const modelsToTry = [CHAT_MODEL, "gemini-2.5-flash"];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const maxRetries = modelName === CHAT_MODEL ? 3 : 1;
      let delayMs = 1000;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const aiRes = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json"
            }
          });
          aiText = aiRes.text || "";
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          const isTemporary = err?.status === 503 || err?.code === 503 || err?.status === 429 || 
            err?.message?.includes("503") || err?.message?.includes("high demand") || 
            err?.message?.includes("UNAVAILABLE") || err?.message?.includes("Quota");

          console.warn(`[Chat Model Call] ${modelName} attempt ${attempt + 1}/${maxRetries} failed:`, err?.message || err);

          if (isTemporary && attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, delayMs));
            delayMs *= 2;
          } else {
            break;
          }
        }
      }

      if (aiText) break; // Success!
    }

    if (!aiText) {
      throw lastError || new Error("All AI models currently unavailable due to high demand.");
    }

    // Safely parse JSON response and summary
    let responseText = aiText;
    let updatedSummary = chatSummary || "";

    try {
      let cleanText = aiText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      }
      const parsed = JSON.parse(cleanText);
      if (parsed.response) {
        responseText = parsed.response;
      }
      if (parsed.summary) {
        updatedSummary = parsed.summary;
      }
    } catch (e) {
      responseText = aiText;
      if (!updatedSummary && message) {
        updatedSummary = `Topic: ${message.slice(0, 40)}... | Progress: Process started`;
      }
    }

    res.json({ response: responseText, summary: updatedSummary });
  } catch (error: any) {
    console.error("Chat Error:", error);
    let errorMessage = `Error processing request: ${error.message}`;
    
    if (error?.status === 503 || error?.code === 503 || error?.message?.includes("high demand") || error?.message?.includes("UNAVAILABLE")) {
      errorMessage = "⚠️ AI Model High Demand (503).\n\nमॉडल पर अभी काफी ट्रैफिक है। कृपया 5-10 सेकंड बाद दोबारा प्रयास करें।";
    } else if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota exceeded")) {
      errorMessage = "⚠️ API Quota Exceeded (429).\n\nफ्री टियर लिमिट पूरी हो गई है। कृपया 1 मिनट बाद दोबारा पूछें।";
    }
    
    res.status(500).json({ response: errorMessage });
  }
});


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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Setup WebSocket Server for Live API
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: ["AUDIO" as any, "TEXT" as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }, // Female voice
          },
          systemInstruction: "You are Jyoti AI, a highly advanced assistant powered by Gemini. You have a female voice. Speak clearly, warmly, and concisely in Hindi and English. Keep responses brief.",
        },
        callbacks: {
          onmessage: (message: any) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && Array.isArray(parts)) {
              for (const part of parts) {
                if (part.text) {
                  clientWs.send(JSON.stringify({ text: part.text }));
                }
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                }
              }
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch(e) {
          console.error("Live input error:", e);
        }
      });
      
      clientWs.on("close", () => {
        // Handle cleanup
      });

    } catch(e) {
      console.error("Live connection error:", e);
    }
  });
}

startServer();
