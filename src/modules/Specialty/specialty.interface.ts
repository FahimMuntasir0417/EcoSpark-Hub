export interface ICreateSpecialtyPayload {
  title: string;
  description?: string;
  icon?: string;
}

export interface IUpdateSpecialtyPayload {
  title?: string;
  description?: string;
  icon?: string;
}
