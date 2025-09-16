import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const baseSectionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    snippets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    subsections: { type: Type.ARRAY, items: {} }, // No deeper recursion
  },
  required: ["title", "snippets"],
};

const subSectionLevel1Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    snippets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    subsections: {
      type: Type.ARRAY,
      items: baseSectionSchema,
    },
  },
  required: ["title", "snippets"],
};

const resumeSchema: any = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "The main title or header of the resume (e.g., the person's name).",
    },
    snippets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Any content directly under the main title, with markdown preserved.",
    },
    subsections: {
      type: Type.ARRAY,
      description: "The main sections of the resume (e.g., 'Work Experience', 'Education').",
      items: subSectionLevel1Schema,
    },
  },
  required: ["title", "subsections"],
};


const suggestionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.STRING,
        description: "An improved version of the resume bullet point."
    },
    description: "An array of 3 improved resume bullet points."
};

export const parseResumeWithAI = async (resumeText: string): Promise<{ title: string, snippets: string[], subsections: any[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse the following resume, which is in Markdown format, into a structured JSON object.
      - The top-level 'title' should be the resume's main header (e.g., the person's name).
      - The 'subsections' array should represent the main sections.
      - Each section and subsection should have a 'title' and a 'snippets' array.
      - The 'snippets' should be an array of strings, where each string is a paragraph or a bullet point from that section.
      - **Crucially, preserve the original Markdown formatting in all 'title' and 'snippet' strings.**
      - Nest subsections where appropriate (e.g., a job title under 'Work Experience').

      Resume text: \n\n${resumeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
      },
    });

    const jsonString = response.text;
    const parsedJson = JSON.parse(jsonString);
    
    // The new schema expects an object, not an array
    if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson) && parsedJson.title && parsedJson.subsections) {
      return parsedJson as { title: string, snippets: string[], subsections: any[] };
    }

    throw new Error("Parsed JSON is not in the expected object format.");

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
