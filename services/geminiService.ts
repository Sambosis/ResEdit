import { GoogleGenAI, Type } from "@google/genai";
import { ParsedSection } from "../types";

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

const looksLikeSectionArray = (value: unknown): value is unknown[] => {
  return (
    Array.isArray(value) &&
    value.every(item => typeof item === 'object' && item !== null && ('title' in (item as Record<string, unknown>) || 'snippets' in (item as Record<string, unknown>)))
  );
};

const findSectionArray = (value: unknown): unknown[] | null => {
  if (looksLikeSectionArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const nested = findSectionArray((value as Record<string, unknown>)[key]);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

const coerceToParsedSections = (value: unknown): ParsedSection[] => {
  const sectionArray = findSectionArray(value);

  if (!sectionArray) {
    return [];
  }

  return sectionArray
    .map(item => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const title = typeof (item as Record<string, unknown>).title === 'string'
        ? (item as Record<string, unknown>).title
        : '';

      const snippetsRaw = Array.isArray((item as Record<string, unknown>).snippets)
        ? (item as Record<string, unknown>).snippets
        : [];

      const snippets = snippetsRaw
        .map(snippet => (typeof snippet === 'string' ? snippet : ''))
        .filter(snippet => snippet.trim().length > 0);

      if (!title.trim() || snippets.length === 0) {
        return null;
      }

      return {
        title,
        snippets,
      } satisfies ParsedSection;
    })
    .filter((section): section is ParsedSection => Boolean(section));
};

export const parseResumeWithAI = async (resumeText: string): Promise<ParsedSection[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `You are an assistant that extracts the content of resumes into structured JSON.\n\nRequirements:\n1. Return only JSON with no additional narration.\n2. The JSON must be an array where each object has a \"title\" (section name) and \"snippets\" (array of bullet strings).\n3. Keep each bullet point as a separate string without leading bullet characters.\n4. Group related bullets under consistent resume section titles (e.g., Header, Summary, Skills, Work Experience, Education).\n5. Always include a section titled \"Header\" as the first entry containing the candidate's name and any available contact details.\n6. Do not invent information. If data is missing, omit the snippet instead of fabricating details.\n\nResume text:\n${resumeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeSchema,
      },
    });

    const jsonString = response.text;

    if (!jsonString) {
      return [];
    }

    const parsedJson = JSON.parse(jsonString);
    const sections = coerceToParsedSections(parsedJson);

    if (sections.length === 0) {
      throw new Error("Parsed JSON is not in the expected section format.");
    }

    return sections;
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
