import { GoogleGenAI, Type } from "@google/genai";
import { Project, StoryVariable, GenerateBlueprintResponse, GeneratePageResponse } from "../types";

// Instantiate dynamically to ensure the latest API key is used
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = 'gemini-3-flash-preview';

// Default to Pro, but allow fallback
let currentImageModel = 'gemini-3-pro-image-preview';

type ProgressLogger = (message: string) => void;

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
};

export const setImageModelTier = (tier: 'pro' | 'standard') => {
    currentImageModel = tier === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
};

export const getImageModelTier = () => {
    return currentImageModel === 'gemini-3-pro-image-preview' ? 'pro' : 'standard';
};

/**
 * Phase 1: Architect - Generate or Refine Blueprint
 */
export const generateBlueprint = async (
  seed: string,
  currentContext: string,
  currentVariables: StoryVariable[],
  isContextLocked: boolean,
  currentArtStyle: string,
  isArtStyleLocked: boolean
): Promise<GenerateBlueprintResponse> => {
  const ai = getAi();
  
  const lockedVars = currentVariables.filter(v => v.isLocked);
  
  let systemInstruction = `You are the "Architect" of StoryEngine AI. Your goal is to create a story blueprint based on a seed idea. 
  A blueprint consists of a narrative SYNOPSIS (the global arc), an ART STYLE description, and a list of variables (questions).
  Return a JSON object with 'context', 'artStyle', and 'variables'.`;

  let userPrompt = `Seed Idea: "${seed}"\n`;

  // --- Synopsis Logic ---
  if (isContextLocked) {
    userPrompt += `
    CONSTRAINT: The user has LOCKED the following synopsis. You MUST NOT change the synopsis.
    LOCKED SYNOPSIS: """${currentContext}"""
    `;
  } else {
     userPrompt += `
    TASK: Create a compelling synopsis (narrative arc) based on the seed.
    `;
  }

  // --- Art Style Logic ---
  if (isArtStyleLocked) {
    userPrompt += `
    CONSTRAINT: The user has LOCKED the following art style. You MUST NOT change it.
    LOCKED ART STYLE: """${currentArtStyle}"""
    `;
  } else {
    userPrompt += `
    TASK: Suggest a visual Art Style that perfectly fits the mood of the story. 
    IMPORTANT: Since text will be integrated into the image, suggest styles that allow for text placement (e.g., 'Comic book style with panels', 'Storybook illustration with negative space', 'Vintage poster style').
    `;
  }

  // --- Variable Logic ---
  if (lockedVars.length > 0) {
      userPrompt += `
      CONSTRAINT: Keep these locked variables: ${lockedVars.map(v => `- ${v.question} (${v.placeholder})`).join('\n')}
      Generate new variables if needed to fit the (potentially new) context.
      `;
  } else {
      userPrompt += `
      TASK: Generate 3-6 interesting variables (questions) to personalize the story.
      `;
  }

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          context: { type: Type.STRING, description: "The synopsis or narrative arc." },
          artStyle: { type: Type.STRING, description: "The visual art style description." },
          variables: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                placeholder: { type: Type.STRING },
              },
              required: ["question", "placeholder"]
            },
          },
        },
        required: ["context", "artStyle", "variables"],
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as GenerateBlueprintResponse;
  }
  
  throw new Error("Failed to generate blueprint");
};

/**
 * Phase 2: Oracle - Inspire Answers
 */
export const inspireAnswers = async (
  project: Project
): Promise<Record<string, string>> => {
  const ai = getAi();
  
  const emptyVars = project.variables.filter(v => !v.value.trim());
  if (emptyVars.length === 0) return {};

  const prompt = `
  Synopsis: "${project.context}"
  
  Provide creative answers for these missing variables to complete the story setup:
  ${emptyVars.map(v => `- ${v.question} (ID: ${v.id})`).join('\n')}
  
  Return JSON keys as variable IDs.
  `;

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: emptyVars.reduce((acc, v) => {
          acc[v.id] = { type: Type.STRING };
          return acc;
        }, {} as Record<string, any>),
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  return {};
};

/**
 * Helper: Generate Image with Reference
 */
const generateImage = async (
  prompt: string,
  referenceImageBase64?: string,
  logProgress?: ProgressLogger
): Promise<string | undefined> => {
  const ai = getAi();
  try {
    const parts: any[] = [];

    // Add reference image for consistency if provided
    if (referenceImageBase64) {
        // Strip data prefix if present to get just the base64 string
        const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
        parts.push({
            inlineData: {
                mimeType: 'image/png', // Assuming PNG for simplicity from canvas/previous output
                data: base64Data
            }
        });
        
        // Add instruction to use the reference
        parts.push({
            text: "Reference image provided above. Maintain strictly consistent character design, color palette, and art style from this reference image. "
        });
    }

    // Add the main prompt
    parts.push({ text: prompt });

    logProgress?.(`Calling image model: ${currentImageModel}`);

    const response = await ai.models.generateContent({
      model: currentImageModel,
      contents: {
        parts: parts,
      },
      config: {
         // Vertical Aspect Ratio for A4-ish feel
         imageConfig: {
             aspectRatio: "3:4" 
         }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        logProgress?.("Image model returned inline image data.");
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    logProgress?.("Image model returned no inline image data.");
    return undefined;
  } catch (error) {
    const message = formatErrorMessage(error);
    console.error("Image generation failed:", error);
    throw new Error(`Image generation failed: ${message}`);
  }
};

/**
 * Phase 3: Synthesis - Generate A Single Page (Daisy Chain) with Integrated Text
 */
export const generateStoryPage = async (
  project: Project,
  pageNumber: number,
  previousPageText: string,
  previousPageImage?: string, // New parameter for visual consistency
  logProgress?: ProgressLogger
): Promise<{ text: string; imagePrompt: string; imageUrl?: string }> => {
  const ai = getAi();
  const variablesMap = project.variables.map(v => `${v.question}: ${v.value}`).join('\n');

  // 1. Generate Content & Layout Instructions
  const textPrompt = `
  You are an expert Graphic Novelist and Typesetter.

  PROJECT CONFIG:
  - Global Synopsis: "${project.context}"
  - User Details: \n${variablesMap}
  - Art Direction: "${project.artStyle}"
  - Total Pages: ${project.pageCount}
  
  CURRENT TASK:
  Design Page ${pageNumber} of ${project.pageCount}.
  
  PREVIOUS PAGE TEXT (Context):
  "${previousPageText || "(This is the first page. Start the story introduction.)"}"

  INSTRUCTIONS:
  1. Write the narrative text for this page. KEEP IT SHORT (maximum 2 sentences). It must be legible when drawn on the image.
  2. Create a highly detailed Image Prompt that includes explicit instructions to RENDER the text onto the image.
  
  The Image Prompt must follow this structure:
  "A vertical A4 illustration in [Art Style]. [Detailed Scene Description]. The text '${pageNumber === 1 ? "Title..." : "..."}' is elegantly integrated into the composition [e.g., inside a text box, floating in negative space, on a sign, as a comic caption]."

  Return JSON with 'text' (raw text) and 'image_prompt' (the full instruction for the image model).
  `;

  logProgress?.("Calling text model: gemini-3-pro-preview");

  const textResponse = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: textPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          image_prompt: { type: Type.STRING },
        },
        required: ["text", "image_prompt"]
      },
    },
  });

  if (!textResponse.text) throw new Error(`Failed to generate text for page ${pageNumber}: empty text response`);
  
  const parsed = JSON.parse(textResponse.text) as GeneratePageResponse;
  logProgress?.("Text model returned page copy and image prompt.");

  // 2. Generate Image using the prompt + previous image reference
  // We feed the previous generated image (if any) to maintain consistency
  const imageUrl = await generateImage(parsed.image_prompt, previousPageImage, logProgress);

  return {
    text: parsed.text,
    imagePrompt: parsed.image_prompt,
    imageUrl: imageUrl
  };
};
