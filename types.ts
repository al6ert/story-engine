export enum AppPhase {
  ARCHITECT = 'ARCHITECT',
  ORACLE = 'ORACLE',
  DELIVERY = 'DELIVERY',
}

export interface StoryVariable {
  id: string;
  question: string;
  placeholder: string; // e.g. {{hero_name}}
  value: string; // The user's answer
  isLocked: boolean;
}

export interface StoryPage {
  id: number;
  text: string;
  imagePrompt: string;
  imageUrl?: string; // Base64 data uri
}

export interface Project {
  id: string;
  name: string;
  seed: string; // The initial prompt/idea
  
  // Architect - Context
  context: string; // Synopsis/Global Arc
  isContextLocked: boolean;
  
  // Architect - Visuals & Structure
  pageCount: number;
  artStyle: string;
  isArtStyleLocked: boolean;

  variables: StoryVariable[];
  
  // Delivery
  finalStory: StoryPage[] | null;
  lastModified: number;
}

export interface GenerateBlueprintResponse {
  context: string;
  artStyle: string;
  variables: {
    question: string;
    placeholder: string;
  }[];
}

export interface GeneratePageResponse {
  text: string;
  image_prompt: string;
}
