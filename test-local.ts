import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testGemini() {
  console.log("Found key?", !!process.env.GEMINI_API_KEY);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "hei" }] }]
      })
    });
    const text = await res.text();
    console.log("RESPONSE HTTP", res.status);
    console.log("RESPONSE BODY", text);
  } catch (e) {
    console.error(e);
  }
}
testGemini();
