import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function verifyPetImage(base64Image: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `You are a pet verification AI for a community called "PawPaw". 
  Analyze the provided image and decide if it's suitable for a "Cute" pet community.
  
  Verification Rules:
  1. The image MUST contain a pet (e.g., dog, cat, hamster, rabbit, bird, reptile, etc.).
  2. The pet must be the clear main subject.
  3. NO humans should be prominent in the photo.
  4. NO sexual, violent, or offensive content.
  5. NO screenshots or obvious copyright violations from other platforms.
  
  Return a JSON object:
  {
    "passed": boolean,
    "category": string (e.g., "dog", "cat", "other", or null if failed),
    "reason": string (brief reason why it failed, or null if passed)
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
