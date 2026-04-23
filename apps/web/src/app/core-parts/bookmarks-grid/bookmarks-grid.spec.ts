import { ComponentFixture, TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { IBookmark } from "../../models/IBookmark";
import { BookmarkService } from "../../services/bookmark.service";
import { BookmarksGridComponent } from "./bookmarks-grid";
import { ApiService } from "../../services/api-service";
import { ExtensionStorageService } from "../../services/extension-storage.service";
import { of } from "rxjs";

const bm1: IBookmark = {
  id: "1",
  title: "Alpha",
  url: "https://alpha.example.com",
  order: 0,
};
const bm2: IBookmark = {
  id: "2",
  title: "Beta",
  url: "https://beta.example.com",
  order: 1,
};

describe("BookmarksGridComponent", () => {
  let component: BookmarksGridComponent;
  let fixture: ComponentFixture<BookmarksGridComponent>;

  const bookmarksMock = {
    bookmarks: signal<IBookmark[]>([bm1, bm2]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reorder: vi.fn(),
  };

  beforeEach(async () => {
    bookmarksMock.create.mockReset();
    bookmarksMock.update.mockReset();
    bookmarksMock.delete.mockReset();
    bookmarksMock.reorder.mockReset();

    const apiMock = {
      getBookmarks: vi.fn().mockReturnValue(of([])),
      createBookmark: vi.fn(),
      updateBookmark: vi.fn(),
      deleteBookmark: vi.fn(),
      reorderBookmarks: vi.fn(),
    };
    const storageMock = {
      getJson: vi.fn().mockResolvedValue(null),
      setJson: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [BookmarksGridComponent],
      providers: [
        { provide: BookmarkService, useValue: bookmarksMock },
        { provide: ApiService, useValue: apiMock },
        { provide: ExtensionStorageService, useValue: storageMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookmarksGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("bookmarks are exposed from BookmarkService", () => {
    expect(component.bookmarks()).toEqual([bm1, bm2]);
  });

  it("isModalOpen() returns false initially", () => {
    expect(component.isModalOpen()).toBe(false);
  });

  it("openAdd() sets editingBookmark to null (add mode)", () => {
    component.openAdd();
    expect(component.editingBookmark()).toBeNull();
    expect(component.isModalOpen()).toBe(true);
  });

  it("openEdit() sets editingBookmark to the given bookmark", () => {
    component.openEdit(bm1);
    expect(component.editingBookmark()).toEqual(bm1);
    expect(component.isModalOpen()).toBe(true);
  });

  it("onModalCancel() closes the modal", () => {
    component.openAdd();
    component.onModalCancel();
    expect(component.isModalOpen()).toBe(false);
    expect(component.editingBookmark()).toBeUndefined();
  });

  it("onDelete() delegates to BookmarkService.delete", () => {
    component.onDelete(bm1);
    expect(bookmarksMock.delete).toHaveBeenCalledWith("1");
  });

  it("onModalSave() creates a bookmark in add mode", () => {
    component.openAdd();
    component.onModalSave({
      title: "New",
      url: "https://new.example.com",
      customImageUrl: "",
    });
    expect(bookmarksMock.create).toHaveBeenCalledWith({
      title: "New",
      url: "https://new.example.com",
      customImageUrl: undefined,
    });
    expect(component.isModalOpen()).toBe(false);
  });

  it("onModalSave() updates a bookmark in edit mode", () => {
    component.openEdit(bm1);
    component.onModalSave({
      title: "Updated",
      url: "https://alpha.example.com",
      customImageUrl: "https://img.example.com/logo.png",
    });
    expect(bookmarksMock.update).toHaveBeenCalledWith("1", {
      title: "Updated",
      url: "https://alpha.example.com",
      customImageUrl: "https://img.example.com/logo.png",
    });
    expect(component.isModalOpen()).toBe(false);
  });

  it("onModalSave() does nothing when editingBookmark is undefined (modal closed)", () => {
    // editingBookmark starts as undefined
    component.onModalSave({
      title: "X",
      url: "https://x.example.com",
      customImageUrl: "",
    });
    expect(bookmarksMock.create).not.toHaveBeenCalled();
    expect(bookmarksMock.update).not.toHaveBeenCalled();
  });

  it("onDrop() reorders via BookmarkService", () => {
    component.onDrop({ previousIndex: 0, currentIndex: 1 });
    expect(bookmarksMock.reorder).toHaveBeenCalledWith(["2", "1"]);
  });
});
