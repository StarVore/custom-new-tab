//

export const API_ENDPOINTS = {
  TEST: "test",
  APOD: "apod",
  BOOKMARKS_GET: "bookmarks",
  BOOKMARKS_CREATE: "bookmarks",
  BOOKMARKS_UPDATE: (id: string) => `bookmarks/${id}`,
  BOOKMARKS_DELETE: (id: string) => `bookmarks/${id}`,
  BOOKMARKS_REORDER: "bookmarks/reorder",
};
