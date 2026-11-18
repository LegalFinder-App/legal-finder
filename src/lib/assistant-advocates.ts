/** Client-safe advocate card shape for Counsellor AI recommendations. */

export type CounsellorAdvocate = {
  id: string;
  fullName: string;
  headline: string | null;
  photoUrl: string | null;
  verified: boolean;
  city: string | null;
  county: string | null;
  practiceAreas: string[];
  languages: string[];
  href: string;
};
