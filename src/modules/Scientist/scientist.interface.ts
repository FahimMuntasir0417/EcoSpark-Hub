export interface ICreateScientistPayload {
  userId: string;
  scientist: {
    profilePhoto?: string;
    contactNumber?: string;
    address?: string;
    institution?: string;
    department?: string;
    specialization?: string;
    researchInterests?: string;
    yearsOfExperience?: number;
    qualification?: string;
    linkedinUrl?: string;
    googleScholarUrl?: string;
    orcid?: string;
  };
  specialtyIds?: string[];
}

export interface IUpdateScientistPayload {
  profilePhoto?: string;
  contactNumber?: string;
  address?: string;
  institution?: string;
  department?: string;
  specialization?: string;
  researchInterests?: string;
  yearsOfExperience?: number;
  qualification?: string;
  linkedinUrl?: string;
  googleScholarUrl?: string;
  orcid?: string;
}

export interface IAssignScientistSpecialtiesPayload {
  specialtyIds: string[];
}

export interface IVerifyScientistPayload {
  verified: boolean;
}
