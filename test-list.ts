import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function testGemini() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`, {
      method: 'GET',
    });
    const data = await res.json();
    console.log("RESPONSE HTTP", res.status);
    console.log("RAW DATA:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
testGemini();
