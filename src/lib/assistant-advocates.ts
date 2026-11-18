/** Client-safe advocate card shape for Counsellor AI recommendations. */

export type CounsellorAdvocate = {
  id: string;
  fullName: string;
  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
  verified: boolean;
  city: string | null;
  county: string | null;
  firm: string | null;
  practiceAreas: string[];
  languages: string[];
  yearsExperience: number;
  consultationFee: number | null;
  rating: number;
  reviewCount: number;
  href: string;
};
