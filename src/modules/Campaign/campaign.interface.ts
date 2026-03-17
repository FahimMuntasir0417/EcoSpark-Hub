export interface ICreateCampaignPayload {
  title: string;
  slug: string;
  description: string;
  bannerImage?: string;
  isActive?: boolean;
  isPublic?: boolean;
  startDate: string;
  endDate: string;
  goalText?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface IUpdateCampaignPayload extends Partial<ICreateCampaignPayload> {}

export interface IUpdateCampaignStatusPayload {
  isActive?: boolean;
  isPublic?: boolean;
}
