export interface ICreateScientistPayload {
  password: string;
  specialties: string[];
  scientist: {
    name: string;
    email: string;
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
}

export interface IUpdateScientistPayload {
  name?: string;
  email?: string;
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
  verifiedById?: string;
}

export interface IAssignScientistSpecialtiesPayload {
  specialtyIds: string[];
}
