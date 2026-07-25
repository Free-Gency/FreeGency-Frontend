export interface ClientAccount {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string | null;
  profileImage: string | null;
  bio: string | null;
  averageRating: number;
  ratingCount: number;
  projectsPostedCount: number;
  projectsCompletedCount: number;
  totalSpent: number;
  joinedAt: string;
  isVerified: boolean;
  profileMode: string | null;
}
