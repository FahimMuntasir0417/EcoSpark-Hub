export interface IChatPayload {
  message: string;
}

export interface IIdeaFormSuggestionPayload {
  title?: string;
  problemStatement?: string;
  proposedSolution?: string;
  description?: string;
  targetAudience?: string;
  categoryId?: string;
  tagIds?: string[];
}

export interface IAiSuggestion {
  type: "IDEA" | "CATEGORY" | "TAG";
  label: string;
  value: string;
  href: string;
}

export interface IAiAction {
  title: string;
  reason: string;
  link: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
}

export interface IAiInsight {
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING";
}

export interface IAiAlert {
  type: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
}
