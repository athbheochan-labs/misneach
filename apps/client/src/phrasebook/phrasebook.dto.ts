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
  category?: string;
  groupName?: string;
  categoryId?: number;
  groupId?: number;
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
  category?: string;
  groupName?: string;
  categoryId?: number;
  groupId?: number;
  autoTranslate?: boolean;
  source?: string;
  inPractice?: boolean;
  inFlashcards?: boolean;
}
