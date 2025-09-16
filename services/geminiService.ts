
import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const suggestionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.STRING,
        description: "An improved version of the resume bullet point."
    },
    description: "An array of 3 improved resume bullet points."
};

export const improveSnippetWithAI = async (snippetText: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the following resume bullet point, generate 3 alternative, more impactful versions. Focus on using action verbs and quantifying achievements where possible. Original snippet: "${snippetText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestionSchema,
            },
        });

        const jsonString = response.text;
        const parsedJson = JSON.parse(jsonString);

        if (Array.isArray(parsedJson) && parsedJson.every(item => typeof item === 'string')) {
            return parsedJson;
        }

        throw new Error("AI response for snippet improvement is not in the expected format.");
    } catch (error) {
        console.error("Error calling Gemini API for snippet improvement:", error);
        throw new Error("Failed to get suggestions from AI.");
    }
};
