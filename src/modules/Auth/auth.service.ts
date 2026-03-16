import { auth } from "../../lib/auth";
import { IRegisterPatientPayload } from "./auth.interface";

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const data = await auth.api.signUpEmail({
    body: {
      email: payload.email,
      password: payload.password,
      name: payload.name,
    },
  });
  return {
    ...data,
  };
};

export const AuthService = {
  registerPatient,
  // Add service methods here
};
