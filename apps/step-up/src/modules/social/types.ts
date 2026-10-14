export type ProfileVisibility = "PUBLIC" | "PRIVATE";

export type FollowRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type SocialUserSummary = {
  id: string;
  name: string;
  photoUrl?: string | null;
  role: string;
  profileVisibility?: ProfileVisibility;
};

export type SocialPost = {
  id: string;
  authorId: string;
  caption?: string | null;
  imageUrls: string[];
  repostOfId?: string | null;
  createdAt: string;
  likedByMe: boolean;
  author: SocialUserSummary;
  repostOf?: {
    id: string;
    imageUrls: string[];
    caption?: string | null;
    author: SocialUserSummary;
  } | null;
  _count: {
    likes: number;
    comments: number;
    reposts: number;
  };
};

export type SocialFeedPage = {
  posts: SocialPost[];
  nextCursor: string | null;
};

export type SocialProfile = {
  id: string;
  name: string;
  bio?: string | null;
  photoUrl?: string | null;
  bannerUrl?: string | null;
  coverUrl?: string | null;
  instagramUrl?: string | null;
  styles: string[];
  role: string;
  phone?: string | null;
  profileVisibility: ProfileVisibility;
  studioId?: string | null;
  canViewContent: boolean;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followRequestStatus: FollowRequestStatus | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  posts: SocialPost[];
};

export type SocialComment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  author: SocialUserSummary;
};

export type FollowRequest = {
  id: string;
  status: FollowRequestStatus;
  createdAt: string;
  requester: SocialUserSummary;
};

export type SignedUploadResponse = {
  uploadUrl: string;
  /** R2 object key to persist; API returns signed GET URLs when reading. */
  publicUrl: string;
  key: string;
  contentType: string;
  headers: Record<string, string>;
};
