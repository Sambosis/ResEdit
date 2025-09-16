import { GoogleGenAI, Type } from "@google/genai";

export interface ParsedResumeSection {
  title: string;
  snippets: string[];
}

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
    description: "An improved version of the resume bullet point.",
  },
  description: "An array of 3 improved resume bullet points.",
};

const parsingInstructions = `Parse the following resume text into JSON. Return an array of sections, where each section has a "title" and an array of "snippets". Follow these rules:\n- Always include a "Header" section even if the resume does not label one. The first snippet in the header must be the candidate's full name. Additional header snippets should capture contact information (email, phone, location, portfolio links) or other header details, using " | " between items when appropriate.\n- Use clear, professional section titles such as "Work Experience", "Education", or "Skills".\n- Each snippet should correspond to a single bullet point or statement from the resume. Remove duplicate or empty snippets.\n- Preserve important punctuation and internal line breaks, but trim leading and trailing whitespace.\n- Only include information present in the resume text.\nResume text:\n\n`;

export const parseResumeWithAI = async (resumeText: string): Promise<ParsedResumeSection[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `${parsingInstructions}${resumeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
      },
    });

    const jsonString = response.text;
    const parsedJson = JSON.parse(jsonString);

    if (Array.isArray(parsedJson)) {
      return parsedJson as ParsedResumeSection[];
    }

    // Sometimes the API might wrap the array in an object, e.g. { "data": [...] }
    const key = Object.keys(parsedJson)[0];
    if (key && Array.isArray(parsedJson[key])) {
      return parsedJson[key] as ParsedResumeSection[];
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
      model: "gemini-2.5-pro",
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
