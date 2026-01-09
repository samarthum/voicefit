import { GoogleGenAI } from "@google/genai";

export const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
