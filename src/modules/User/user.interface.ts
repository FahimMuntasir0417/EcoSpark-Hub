export interface ICreateMyVotePayload {
  ideaId: string;
  type: "UP" | "DOWN";
}

export interface IUpdateMyVotePayload {
  type: "UP" | "DOWN";
}

export interface ICreateMyCommentPayload {
  ideaId?: string;
  parentId?: string;
  content: string;
}

export interface IUpdateMyCommentPayload {
  content: string;
}
