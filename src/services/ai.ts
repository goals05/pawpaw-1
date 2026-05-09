import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function verifyPetImage(base64Image: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `You are a pet verification AI for "PawPaw".  
  Your mission is to check if an image contains a LIVING PET.
  
  CRITICAL: You MUST be extremely lenient. If there is ANY indication of a pet, you MUST pass it.
  
  Verification Rules:
  1. PASS if you see a pet or parts of a pet.
  2. ALLOW SKIP (canSkip: true) ONLY IF the image is blurry, has poor lighting, or contains ambiguous textures that LOOK like a pet but aren't 100% clear.
  3. REJECT & BLOCK SKIP (canSkip: false) IF:
     - The image is ONLY a human face/body with no pet.
     - The image is a generic landscape or object with no animals.
     - The image contains inappropriate, sexual, or violent content.
     - The image is a screenshot of text/UI.
  
  Return a JSON object:
  {
    "passed": boolean (true if clearly a pet),
    "canSkip": boolean (true ONLY if it might be a pet but is unclear. false if it's explicitly prohibited content),
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
