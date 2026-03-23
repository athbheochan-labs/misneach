export interface PhrasebookInteraction {
  type: string;
  timestamp?: number;
}

export interface PhrasebookChanges {
  text?: string;
  translation?: string;
  pronunciation?: string;
  example?: string;
  notes?: string;
  source?: string;
  inPractice?: boolean;
  inFlashcards?: boolean;
}

export class UpdatePhraseDto {
  text?: string;
  translation?: string;
  pronunciation?: string;
  example?: string;
  notes?: string;
  autoTranslate?: boolean;
  source?: string;
  inPractice?: boolean;
  inFlashcards?: boolean;
}
