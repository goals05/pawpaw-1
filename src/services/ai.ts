import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function verifyPetImage(base64Image: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `You are a pet verification AI for "PawPaw".  
  Analyze the image and determine if it contains a LIVING PET.
  
  CRITICAL INSTRUCTION:
  - You MUST be extremely inclusive. A clear photo of a dog, cat, or any pet is a 100% PASS (passed: true).
  - Even if there are people or objects around, if a pet is visible, it passes.
  - Parts of pets (ears, paws, etc.) also pass.
  
  Decision Guide:
  1. PASS (passed: true, canSkip: true): Recognizable pet presence.
  2. FAIL BUT ALLOW SKIP (passed: false, canSkip: true): Blurry, dark, or generic textures that MIGHT be a pet but aren't clear. 
  3. REJECT & BLOCK (passed: false, canSkip: false): 
     - ONLY human(s) with no pet.
     - Offensive, sexual, or violent content.
     - Generic UI, text-only, or stock landscape with no animals.
  
  Return a JSON object:
  {
    "passed": boolean,
    "canSkip": boolean,
    "category": "dog" | "cat" | "etc",
    "reason": "Brief explanation in Korean if failed."
  }`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "{}";
    const result = JSON.parse(resultText);
    return {
      passed: result.passed ?? true,
      canSkip: result.canSkip ?? true,
      category: result.category || "etc",
      reason: result.reason || null
    };
  } catch (error: any) {
    console.error("Gemini Image Verification Error:", error);
    // Be lenient on errors - allow skip
    return { 
      passed: false, 
      canSkip: true, 
      reason: `AI 검사 중 연결 오류가 발생했습니다. (네트워크 상태를 확인해 주세요)` 
    };
  }
}

export async function getPetHealthAdvice(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `You are "PawPaw Care AI", a specialized pet health consultant.
  Your expertise is strictly limited to:
  1. Pet health symptoms and general advice.
  2. Emergency first-aid (e.g., "My dog ate chocolate", "Heatstroke treatment").
  3. Nutrition: What pets can and cannot eat.
  4. Hospital/Veterinary clinic guidance (remind them to find local clinics if urgent).

  Guidelines:
  - ALWAYS prioritize suggesting a veterinary visit for serious symptoms.
  - Be concise, accurate, and empathetic.
  - If a question is NOT about pets or pet health, politely refuse to answer and redirect to pet care.
  - Use Markdown for formatting.`;

  try {
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction
      },
      history
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Gemini Health Advice Error:", error);
    return "죄송합니다. AI 서비스에 일시적인 문제가 발생했습니다.";
  }
}
