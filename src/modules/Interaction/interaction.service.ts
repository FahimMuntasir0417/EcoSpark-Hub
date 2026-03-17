export interface IVotePayload {
  type: "UP" | "DOWN";
}

export interface ICommentPayload {
  content: string;
}

export interface IUpdateCommentPayload {
  content: string;
}
