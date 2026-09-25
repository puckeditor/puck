import { parseEnv, upsertEnv } from "../dotenv";

describe("upsertEnv", () => {
  it("creates a file", () => {
    expect(upsertEnv(null, "PUCK_API_KEY", "abc")).toEqual({
      content: "PUCK_API_KEY=abc\n",
      operation: "add",
    });
  });

  it("appends while preserving other lines", () => {
    const { content, operation } = upsertEnv(
      "# comment\nFOO=bar",
      "PUCK_API_KEY",
      "abc"
    );
    expect(operation).toBe("add");
    expect(content).toBe("# comment\nFOO=bar\nPUCK_API_KEY=abc\n");
  });

  it("updates in place, keeps export, drops duplicates and preserves CRLF", () => {
    const input =
      'A=1\r\nexport PUCK_API_KEY="old"\r\nB=2\r\nPUCK_API_KEY=older\r\n';
    const { content, operation } = upsertEnv(input, "PUCK_API_KEY", "new");
    expect(operation).toBe("update");
    expect(content).toBe("A=1\r\nexport PUCK_API_KEY=new\r\nB=2\r\n");
  });

  it("is a no-op when the value matches", () => {
    expect(
      upsertEnv("PUCK_API_KEY='abc' # key\n", "PUCK_API_KEY", "abc").operation
    ).toBe("noop");
  });

  it("replaces an empty placeholder like .env.example's", () => {
    expect(
      upsertEnv("# Add your key here\nPUCK_API_KEY=\n", "PUCK_API_KEY", "abc")
        .content
    ).toBe("# Add your key here\nPUCK_API_KEY=abc\n");
  });
});

describe("parseEnv", () => {
  it("parses quotes, export and comments", () => {
    expect(parseEnv(`export A="1"\nB='2'\nC=3 # note\n# D=4\n`)).toEqual({
      A: "1",
      B: "2",
      C: "3",
    });
  });
});
