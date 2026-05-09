import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function verifyPetImage(base64Image: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `You are a pet verification AI for "PawPaw", a community for pet lovers. 
  Your primary goal is to ensure the image contains a LIVING PET.
  
  Verification Rules (Be generous & inclusive):
  1. PASS if the image contains any part of a genuine living pet (dog, cat, rabbit, hamster, bird, etc.).
  2. Partial views (ears, paws, tail, fur, nose, eyes) are 100% valid as long as they clearly belong to a pet.
  3. Close-up shots of fur or features are valid.
  4. Humans interacting with pets is ALLOWED (pet should be recognizable).
  5. REJECT ONLY IF:
     - No pet parts are visible at all.
     - It's a screenshot/UI of another app.
     - It's a toy, drawing, or non-living object.
     - It's offensive/unsafe.
  
  Decision Guideline: If you are unsure but it looks like it COULD be a pet, FAVOR THE USER and MARK AS PASSED.
  
  Return a JSON object:
  {
    "passed": boolean,
    "category": string (e.g., "dog", "cat", "etc"),
    "reason": string (If failed, explain why in Korean. If passed, you can keep it empty.)
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
