export interface IBookmarkVisitPayload {
  bookmarkId: string;
  bookmarkTitle: string;
  bookmarkUrl: string;
  source: string;
  context?: string;
  platform?: string;
  userAgent?: string;
}

export interface IBookmarkVisit extends IBookmarkVisitPayload {
  id: string;
  created: string;
  updated: string;
}