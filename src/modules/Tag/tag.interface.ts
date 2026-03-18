export interface ICreateTagPayload {
  name: string;
  slug: string;
}

export interface IUpdateTagPayload extends Partial<ICreateTagPayload> {}
