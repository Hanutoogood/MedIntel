
import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";

const MODEL_NAME = 'gemini-3-pro-preview';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeDocument(content: string, useThinking: boolean = false): Promise<string> {
    const config: any = {};
    if (useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const prompt = `
      You are an expert medical records analyst. Your task is to interpret the following raw medical record data into plain language for a patient.
      - Maintain technical accuracy but use accessible language.
      - Identify key findings, potential concerns, and suggested questions for the doctor.
      
      Raw Data:
      ${content}
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config
      });
      return response.text || "I'm sorry, I couldn't process this document.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "An error occurred while analyzing the document.";
    }
  }

  async extractMedications(content: string): Promise<any[]> {
    const prompt = `
      Extract medication details from this prescription text. 
      For each medicine, identify:
      1. Medication Name
      2. Dosage Per Intake (how much to take at once, e.g., '500mg', '1 tablet')
      3. Times Per Day (how many times it should be taken in 24 hours, e.g., '3 times')
      4. General Frequency Description (e.g., 'Every 8 hours', 'Once daily after food')
      5. Purpose of the medicine
      
      Prescription text:
      ${content}
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              medications: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dosagePerIntake: { type: Type.STRING },
                    timesPerDay: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    purpose: { type: Type.STRING }
                  },
                  required: ["name", "dosagePerIntake", "timesPerDay", "frequency"]
                }
              }
            }
          }
        }
      });
      
      const result = JSON.parse(response.text || '{"medications": []}');
      return result.medications;
    } catch (error) {
      console.error("Gemini Extraction Error:", error);
      return [];
    }
  }

  createHealthChat(systemInstruction: string): Chat {
    return this.ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction + " You are a helpful medical record assistant. You never give definitive medical advice, but you help explain records and organize information. Always suggest seeing a professional.",
      }
    });
  }
}

export const geminiService = new GeminiService();
