export interface IReportIdeaPayload {
  reason:
    | "SPAM"
    | "ABUSE"
    | "MISINFORMATION"
    | "INAPPROPRIATE"
    | "COPYRIGHT"
    | "OTHER";
  note?: string;
}

export interface IReportCommentPayload {
  reason:
    | "SPAM"
    | "ABUSE"
    | "MISINFORMATION"
    | "INAPPROPRIATE"
    | "COPYRIGHT"
    | "OTHER";
  note?: string;
}

export interface IReviewReportPayload {
  status: "APPROVED" | "REJECTED";
  note?: string;
}

export interface IReviewFeedbackPayload {
  feedbackType?: "REVIEW" | "REJECTION" | "IMPROVEMENT";
  title?: string;
  message: string;
  isVisibleToAuthor?: boolean;
}

export interface IReviewIdeaPayload {
  action: "APPROVED" | "REJECTED" | "ARCHIVED";
  note?: string;
  rejectionFeedback?: string;
}

export interface IModerationCommentActionPayload {
  note?: string;
}
