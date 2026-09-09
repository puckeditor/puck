/** Tests package import side effects */
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;

describe("store edge runtime safety", () => {
  it("does not call generateId at package import time", async () => {
    jest.mock("../lib/generate-id", () => ({
      generateId: jest.fn(() => {
        return "test-id";
      }),
    }));

    const { generateId } = await import("../lib/generate-id");

    // The package import must NOT call generateId() because it uses crypto.randomUUID()
    // under the hood, which is not available in edge runtimes.
    await import("../index");

    expect(generateId).not.toHaveBeenCalled();
  });
});
