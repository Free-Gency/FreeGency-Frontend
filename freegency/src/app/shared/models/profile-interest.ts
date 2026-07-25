export interface ProfileInterest {
  id: string;
  name: string;
  nameEn: string;
  imageCover: string | null;
  specialties: ProfileSpecialty[];
}

export interface ProfileSpecialty {
  id: string;
  nameAr: string;
  nameEn: string;
  skills: Skill[];
}

export interface Skill {
  id: string;
  name: string;
}