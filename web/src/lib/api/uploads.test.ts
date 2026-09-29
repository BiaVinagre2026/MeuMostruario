const mocks = vi.hoisted(() => ({ postForm: vi.fn() }));

vi.mock("./client", () => ({
  apiClient: { postForm: mocks.postForm },
}));

import { uploadAsset } from "./uploads";

describe("uploadAsset", () => {
  it("usa o cliente centralizado para manter o tenant no multipart", async () => {
    mocks.postForm.mockResolvedValue({ url: "/uploads/mare-coral/coral.png" });
    const file = new File(["coral"], "coral.png", { type: "image/png" });

    await expect(uploadAsset(file)).resolves.toBe("/uploads/mare-coral/coral.png");

    expect(mocks.postForm).toHaveBeenCalledWith("/api/v1/admin/upload", expect.any(FormData));
    const form = mocks.postForm.mock.calls[0][1] as FormData;
    expect(form.get("file")).toBe(file);
  });
});
