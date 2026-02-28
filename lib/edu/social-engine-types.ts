export type ExploreOrder = "trending" | "recent";
export type FeedKind = "post" | "reel";

export type SocialFeedAuthor = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  verified: boolean;
};

export type SocialFeedItem =
  | {
      id: string;
      kind: "post";
      createdAt: string;
      userId: string;
      likesCount: number;
      commentsCount: number;
      likedByMe: boolean;
      author: SocialFeedAuthor;
      post: {
        title: string;
        body: string;
        mediaType: string;
        mediaUrl: string | null;
        resourceUrl: string | null;
      };
    }
  | {
      id: string;
      kind: "reel";
      createdAt: string;
      userId: string;
      likesCount: number;
      commentsCount: number;
      likedByMe: boolean;
      author: SocialFeedAuthor;
      reel: {
        caption: string;
        videoUrl: string;
      };
    };

export type FeedPageResult = {
  items: SocialFeedItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextPage: number | null;
  currentUserId: string | null;
  followingIds: string[];
};
