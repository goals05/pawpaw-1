import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function verifyPetImage(base64Image: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `You are a pet verification AI for a community called "PawPaw". 
  Analyze the provided image and decide if it's suitable for a "Cute" pet community.
  
  Verification Rules (Strict but inclusive of partial views):
  1. The image MUST contain a genuine pet (dog, cat, hamster, rabbit, bird, etc.).
  2. The pet parts (e.g., head, paws, tail, fur texture, ears, nose) are SUFFICIENT to identify it as a pet. 
  3. Even if the full body is not visible, if the features clearly belong to a living pet, it passes.
  4. Humans are allowed ONLY if they are holding or interacting with the pet (the pet remains the focus).
  5. NO screenshots, drawings, toys, or non-living items.
  6. NO offensive/violent content.
  
  Return a JSON object:
  {
    "passed": boolean,
    "category": string (e.g., "dog", "cat", "other"),
    "reason": string (brief explanation if failed, in Korean. e.g., "반려동물의 특징이 명확하지 않습니다.")
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

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Gemini Image Verification Error:", error);
    return { passed: false, reason: "AI verification failed." };
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
