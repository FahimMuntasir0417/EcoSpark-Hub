export interface IRegisterMemberPayload {
  name: string;
  email: string;
  password: string;
}

export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface IUpdateMyProfilePayload {
  name?: string;
  image?: string;
  contactNumber?: string;
  address?: string;
}
