/** Tests package import side effects */
import { generateId } from "../lib/generate-id";

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

// The package import must NOT call generateId() because it uses crypto.randomUUID()
// under the hood, which is not available in edge runtimes.
import "../index";

jest.mock("../lib/generate-id", () => ({
  generateId: jest.fn(() => {
    return "test-id";
  }),
}));

describe("store edge runtime safety", () => {
  it("does not call generateId at module import time", () => {
    expect(generateId).not.toHaveBeenCalled();
  });
});
