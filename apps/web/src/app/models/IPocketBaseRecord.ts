export interface PocketBaseListResponse<T> {
  items: T[];
}

export interface PocketBaseBookmarkRecord {
  id: string;
  title: string;
  url: string;
  customImageUrl?: string;
  order: number;
}

export interface PocketBaseBookmarkVisitRecord {
  id: string;
  bookmarkId: string;
  bookmarkTitle: string;
  bookmarkUrl: string;
  source: string;
  context?: string;
  platform?: string;
  userAgent?: string;
  created: string;
  updated: string;
}
