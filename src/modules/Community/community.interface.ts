export interface ICreateExperienceReportPayload {
  ideaId: string;
  title: string;
  summary: string;
  outcome: string;
  challenges?: string;
  measurableResult?: string;
  adoptedScale?: string;
  location?: string;
  effectivenessRating: number;
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export interface IUpdateExperienceReportPayload extends Partial<
  Omit<ICreateExperienceReportPayload, "ideaId">
> {}

export interface ISubscribeNewsletterPayload {
  email: string;
  source?: string;
}

export interface IUnsubscribeNewsletterPayload {
  email: string;
}
