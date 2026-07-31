/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { LLMConfig, UserProfile } from "./src/types";

// Standard prompt for food evaluation
const NUTRITION_PROMPT_TEMPLATE = `You are a nutrition analyst AI. Analyze the food described and estimate its macronutrient values: calories (kcal), protein (g), carbs (g), and fat (g).
Return ONLY a valid JSON object matching the schema below. No markdown formatting, no explanatory text, just raw JSON.

Output JSON Schema:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "confidence": number (rating from 0.0 to 1.0 of how confident you are in this nutrition estimation)
}

Food statement: "%FOOD_STATEMENT%"`;

// Helper to extract JSON from raw response text (handles markdown blocks if any exist)
function extractJson(text: string): any {
  let clean = text.trim();
  // Remove markdown code block wrappers if present
  if (clean.includes("```")) {
    const lines = clean.split("\n");
    const filtered = lines.filter(line => !line.trim().startsWith("```"));
    clean = filtered.join("\n").trim();
  }
  // Try to find the first '{' and last '}'
  const startIdx = clean.indexOf("{");
  const endIdx = clean.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    clean = clean.substring(startIdx, endIdx + 1);
  }
  
  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error("Failed to parse JSON from LLM response:", text);
    throw new Error("Invalid JSON format in LLM response");
  }
}

// 1. Core Nutrition Estimation Call
export async function estimateNutrition(
  description: string,
  config: LLMConfig
): Promise<{ calories: number; protein: number; carbs: number; fat: number; confidence: number }> {
  const prompt = NUTRITION_PROMPT_TEMPLATE.replace("%FOOD_STATEMENT%", description);

  // Gemini API flow (Injected serverkey)
  if (config.provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please enter a key in Settings > Secrets.");
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER, description: "Calories in kcal" },
              protein: { type: Type.NUMBER, description: "Protein in grams" },
              carbs: { type: Type.NUMBER, description: "Carbohydrates in grams" },
              fat: { type: Type.NUMBER, description: "Fats in grams" },
              confidence: { type: Type.NUMBER, description: "Confidence rating from 0.0 to 1.0" },
            },
            required: ["calories", "protein", "carbs", "fat", "confidence"],
          }
        }
      });

      const text = response.text || "{}";
      const result = extractJson(text);
      return {
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
        confidence: Number(result.confidence) || 0.5,
      };
    } catch (e: any) {
      console.error("Gemini nutrition estimation failed, falling back to local simulation.", e);
      throw new Error(`Gemini Error: ${e.message}`);
    }
  }

  // Ollama
  if (config.provider === 'ollama') {
    const baseUrl = config.endpoint || 'http://localhost:11434';
    const model = config.model || 'llama3';
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json',
        }),
      });

      if (!res.ok) throw new Error(`Ollama responded with status ${res.status}`);
      const data: any = await res.json();
      const content = data.message?.content || '{}';
      const result = extractJson(content);
      return {
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
        confidence: Number(result.confidence) || 0.5,
      };
    } catch (err: any) {
      throw new Error(`Ollama connecting to ${baseUrl} failed: ${err.message}. Make sure Ollama is running.`);
    }
  }

  // llama.cpp
  if (config.provider === 'llamacpp') {
    const baseUrl = config.endpoint || 'http://localhost:8080';
    try {
      // llama.cpp has either /completion or OpenAI-like /v1/chat/completions. Let's try /completion first.
      const res = await fetch(`${baseUrl}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          n_predict: 256,
          temperature: 0.1,
        }),
      });

      if (!res.ok) throw new Error(`llama.cpp responded with status ${res.status}`);
      const data: any = await res.json();
      const content = data.content || '{}';
      const result = extractJson(content);
      return {
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
        confidence: Number(result.confidence) || 0.5,
      };
    } catch (err: any) {
      throw new Error(`llama.cpp connection to ${baseUrl} failed: ${err.message}. Make sure llama.cpp server is running.`);
    }
  }

  // OpenAI compatible local api
  if (config.provider === 'openai_compatible') {
    const baseUrl = config.endpoint || 'http://localhost:1234';
    const model = config.model || 'local_model';
    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });

      if (!res.ok) throw new Error(`OpenAI compatible local endpoint responded with status ${res.status}`);
      const data: any = await res.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const result = extractJson(content);
      return {
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
        confidence: Number(result.confidence) || 0.5,
      };
    } catch (err: any) {
      throw new Error(`Local OpenAI endpoint at ${baseUrl} failed: ${err.message}. Check your local model client.`);
    }
  }

  throw new Error("Unsupported LLM Provider configured.");
}

// 1b. Food Photo Analysis Call
export async function estimateNutritionFromImage(
  imageB64: string,
  mimeType: string,
  config: LLMConfig
): Promise<{ description: string; calories: number; protein: number; carbs: number; fat: number; confidence: number }> {
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please enter a key in Settings > Secrets to use photo analysis.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const textPart = {
    text: `You are a professional nutrition analyst and expert visual food identifier.
Analyze the provided food image, identify the dishes/items shown, describe what they are collectively in a clean text statement (be precise, e.g., "Two fried eggs with sourdough toast and avocado slices"), and estimate the total macronutrient values: calories (kcal), protein (g), carbs (g), and fat (g).

Response MUST be a valid JSON object matching the detailed schema below. No markdown formatting, no explanatory text, just raw JSON.

Output JSON Schema:
{
  "description": "Short collective statement describing identified food name or foods visible in the image",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "confidence": number (rating from 0.0 to 1.0 of your confidence in this estimation)
}`
  };

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: imageB64
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        textPart,
        imagePart
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "A concise identification of the food item or dish" },
            calories: { type: Type.NUMBER, description: "Total estimated calories in kcal" },
            protein: { type: Type.NUMBER, description: "Total estimated protein in grams" },
            carbs: { type: Type.NUMBER, description: "Total estimated carbohydrate in grams" },
            fat: { type: Type.NUMBER, description: "Total estimated fats in grams" },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0" }
          },
          required: ["description", "calories", "protein", "carbs", "fat", "confidence"]
        }
      }
    });

    const text = response.text || "{}";
    const result = extractJson(text);
    return {
      description: result.description || "Identified Meal",
      calories: Number(result.calories) || 0,
      protein: Number(result.protein) || 0,
      carbs: Number(result.carbs) || 0,
      fat: Number(result.fat) || 0,
      confidence: Number(result.confidence) || 0.5,
    };
  } catch (e: any) {
    console.error("Gemini food photo analysis failed:", e);
    throw new Error(`Gemini Vision Error: ${e.message}`);
  }
}

// 2. AI Coach Service Call
export async function askAiCoach(
  userQuery: string,
  user: UserProfile,
  weightLogs: any[],
  foodLogs: any[],
  config: LLMConfig
): Promise<string> {
  // Format log trends
  const weightStr = weightLogs
    .slice(-14)
    .map(w => `- ${w.date}: ${w.weight} kg`)
    .join("\n");

  // Sum daily logs
  const foodsByDate: { [key: string]: string[] } = {};
  foodLogs.slice(-30).forEach(f => {
    if (!foodsByDate[f.date]) foodsByDate[f.date] = [];
    foodsByDate[f.date].push(`${f.description} (${f.calories} kcal, P: ${f.protein}g)`);
  });
  const foodStr = Object.entries(foodsByDate)
    .map(([d, items]) => `- ${d}:\n  ` + items.join("\n  "))
    .join("\n");

  const prompt = `You are Cut Tracker's professional, friendly, and science-driven AI weight loss and nutrition coach.
You are helping the user track their weight loss progress, manage calories and protein, and stay motivated.

User Profile:
- Name: ${user.name}
- Age: ${user.age}
- Sex: ${user.sex}
- Height: ${user.height} cm
- Weight: ${user.weight} kg (Current start)
- Goal Weight: ${user.goalWeight} kg
- Activity Level: ${user.activityLevel}
- Maintenance Calories: ${user.maintenanceCalories} kcal
- Daily Calorie Target: ${user.calorieTarget} kcal
- Daily Protein Target: ${user.proteinTarget} g

Latest Weight Log History (Previous weeks):
${weightStr || "No weight logs entered yet."}

Latest Food and Calorie Consumption:
${foodStr || "No foods logged in the previous few days."}

Coach Guideline:
Provide a concise, highly informational and scientific answer under 250 words. Focus strictly on their logged nutrition data, rate of loss, and weight trend. Reassure them about water variations/sodium changes for weight fluctuations. Highlight if their protein levels are too low compared to their targets.

User Question: "${userQuery}"

AI Coach Response:`;

  if (config.provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please enter a key in Settings > Secrets.");
    }
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      return response.text || "Coach was unable to formulate a response.";
    } catch (e: any) {
      throw new Error(`Gemini Coach Error: ${e.message}`);
    }
  }

  // Ollama
  if (config.provider === 'ollama') {
    const baseUrl = config.endpoint || 'http://localhost:11434';
    const model = config.model || 'llama3';
    try {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`Ollama responded with status ${res.status}`);
      const data: any = await res.json();
      return data.message?.content || "Coach was unable to formulate a response.";
    } catch (err: any) {
      throw new Error(`Ollama Coach connection failed: ${err.message}`);
    }
  }

  // llama.cpp
  if (config.provider === 'llamacpp') {
    const baseUrl = config.endpoint || 'http://localhost:8080';
    try {
      const res = await fetch(`${baseUrl}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          n_predict: 512,
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error(`llama.cpp responded with status ${res.status}`);
      const data: any = await res.json();
      return data.content || "Coach was unable to formulate a response.";
    } catch (err: any) {
      throw new Error(`llama.cpp Coach connection failed: ${err.message}`);
    }
  }

  // OpenAI local api
  if (config.provider === 'openai_compatible') {
    const baseUrl = config.endpoint || 'http://localhost:1234';
    const model = config.model || 'local_model';
    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI compatible local responded with status ${res.status}`);
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content || "Coach was unable to formulate a response.";
    } catch (err: any) {
      throw new Error(`Local OpenAI Coach connection failed: ${err.message}`);
    }
  }

  throw new Error("Coach is not configured.");
}
