
import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const resumeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The title of the resume section (e.g., 'Work Experience', 'Education', 'Skills').",
      },
      snippets: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: "An array of strings, where each string is a single bullet point or entry from that section.",
      },
    },
    required: ["title", "snippets"],
  },
};

const suggestionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.STRING,
        description: "An improved version of the resume bullet point."
    },
    description: "An array of 3 improved resume bullet points."
};

export const parseResumeWithAI = async (resumeText: string): Promise<{ title: string, snippets: string[] }[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse the following resume text into a structured JSON format. Identify logical sections and extract each bullet point or entry as a separate snippet within its section. Resume text: \n\n${resumeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
      },
    });

    const jsonString = response.text;
    const parsedJson = JSON.parse(jsonString);
    
    if (Array.isArray(parsedJson)) {
        return parsedJson as { title: string, snippets: string[] }[];
    }
    
    // Sometimes the API might wrap the array in an object, e.g. { "data": [...] }
    const key = Object.keys(parsedJson)[0];
    if (key && Array.isArray(parsedJson[key])) {
        return parsedJson[key] as { title: string, snippets: string[] }[];
    }

    throw new Error("Parsed JSON is not in the expected array format.");

  } catch (error) {
    console.error("Error calling Gemini API for parsing:", error);
    throw new Error("Failed to parse resume with AI.");
  }
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
