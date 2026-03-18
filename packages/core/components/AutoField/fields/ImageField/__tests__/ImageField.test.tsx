import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageField } from "..";

// Mock useDeepField
let mockFieldValue: string | undefined = undefined;
jest.mock("../../../lib/use-deep-field", () => ({
  useDeepField: () => mockFieldValue,
}));

// Mock useLocalValue to track URL input changes
let mockLocalOnChange: jest.Mock = jest.fn();
jest.mock("../../../lib/use-local-value", () => ({
  useLocalValue: (_path: string, onChange: (val: any) => void) => {
    mockLocalOnChange = jest.fn((val: any) => onChange(val));
    return [mockFieldValue ?? "", mockLocalOnChange];
  },
}));

// Mock getClassNameFactory to return a simple function
jest.mock("../../../../../lib/get-class-name-factory", () => ({
  __esModule: true,
  default: (base: string) => {
    return (modifiers?: string | Record<string, boolean>) => {
      if (!modifiers) return base;
      if (typeof modifiers === "string") return `${base}-${modifiers}`;
      return [
        base,
        ...Object.entries(modifiers)
          .filter(([, v]) => v)
          .map(([k]) => `${base}--${k}`),
      ].join(" ");
    };
  },
}));

const defaultProps = {
  field: {
    type: "image" as const,
    onUpload: jest.fn().mockResolvedValue("https://example.com/image.png"),
  },
  onChange: jest.fn(),
  id: "test-image",
  name: "test-image",
  label: "Test Image",
  Label: ({ children, label, icon, el: El = "label" }: any) => (
    <El>
      <span>{label}</span>
      {icon}
      {children}
    </El>
  ),
  readOnly: false,
  value: undefined,
};

function createFile(name = "test.png", type = "image/png", size = 1024) {
  const file = new File(["x".repeat(size)], name, { type });
  return file;
}

describe("ImageField", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFieldValue = undefined;
  });

  it("renders URL input", () => {
    render(<ImageField {...defaultProps} />);
    const urlInput = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    expect(urlInput).toBeTruthy();
    expect(urlInput.placeholder).toBe("Paste image URL...");
  });

  it("renders dropzone when value is empty", () => {
    render(<ImageField {...defaultProps} />);
    expect(screen.getByText("Click or drag to upload")).toBeTruthy();
  });

  it("renders custom placeholder on URL input", () => {
    render(
      <ImageField
        {...defaultProps}
        field={{
          ...defaultProps.field,
          placeholder: "Enter hero image URL",
        }}
      />
    );
    const urlInput = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    expect(urlInput.placeholder).toBe("Enter hero image URL");
  });

  it("renders preview when value is a URL", () => {
    mockFieldValue = "https://example.com/photo.jpg";
    render(<ImageField {...defaultProps} />);
    const img = screen.getByAltText("Test Image") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/photo.jpg");
  });

  it("renders remove button when value is set", () => {
    mockFieldValue = "https://example.com/photo.jpg";
    render(<ImageField {...defaultProps} />);
    expect(screen.getByLabelText("Remove image")).toBeTruthy();
  });

  it("calls onUpload when file selected, then onChange with returned URL", async () => {
    const onUpload = jest.fn().mockResolvedValue("https://cdn.example.com/uploaded.png");
    const onChange = jest.fn();

    render(
      <ImageField
        {...defaultProps}
        field={{ ...defaultProps.field, onUpload }}
        onChange={onChange}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = createFile();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith("https://cdn.example.com/uploaded.png");
    });
  });

  it("shows loading state during upload", async () => {
    let resolveUpload: (url: string) => void;
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    const onUpload = jest.fn().mockReturnValue(uploadPromise);

    render(
      <ImageField
        {...defaultProps}
        field={{ ...defaultProps.field, onUpload }}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [createFile()] } });

    await waitFor(() => {
      expect(screen.getByText("Uploading...")).toBeTruthy();
    });

    resolveUpload!("https://example.com/done.png");

    await waitFor(() => {
      expect(screen.queryByText("Uploading...")).toBeFalsy();
    });
  });

  it("shows error when onUpload rejects", async () => {
    const onUpload = jest.fn().mockRejectedValue(new Error("Network error"));

    render(
      <ImageField
        {...defaultProps}
        field={{ ...defaultProps.field, onUpload }}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [createFile()] } });

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy();
    });
  });

  it("shows generic error when onUpload throws non-Error", async () => {
    const onUpload = jest.fn().mockRejectedValue("something went wrong");

    render(
      <ImageField
        {...defaultProps}
        field={{ ...defaultProps.field, onUpload }}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [createFile()] } });

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeTruthy();
    });
  });

  it("remove button calls onChange with empty string", () => {
    mockFieldValue = "https://example.com/photo.jpg";
    const onChange = jest.fn();

    render(<ImageField {...defaultProps} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Remove image"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("respects readOnly - hides remove button", () => {
    mockFieldValue = "https://example.com/photo.jpg";

    render(<ImageField {...defaultProps} readOnly={true} />);

    expect(screen.queryByLabelText("Remove image")).toBeFalsy();
  });

  it("respects readOnly - disables file input", () => {
    render(<ImageField {...defaultProps} readOnly={true} />);

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput.disabled).toBe(true);
  });

  it("validates file via validate callback - shows error on invalid", () => {
    const validate = jest.fn().mockReturnValue("File too large");
    const onUpload = jest.fn();

    render(
      <ImageField
        {...defaultProps}
        field={{ ...defaultProps.field, validate, onUpload }}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [createFile()] } });

    expect(screen.getByText("File too large")).toBeTruthy();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("validates file via validate callback - proceeds when valid", async () => {
    const validate = jest.fn().mockReturnValue(null);
    const onUpload = jest.fn().mockResolvedValue("https://example.com/ok.png");
    const onChange = jest.fn();

    render(
      <ImageField
        {...defaultProps}
        field={{ ...defaultProps.field, validate, onUpload }}
        onChange={onChange}
      />
    );

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = createFile();
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(validate).toHaveBeenCalledWith(file);
      expect(onUpload).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith("https://example.com/ok.png");
    });
  });

  it("returns null for non-image field type", () => {
    const { container } = render(
      <ImageField
        {...defaultProps}
        field={{ type: "text" as any, onUpload: jest.fn() }}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("URL input calls onChange when typed into", () => {
    const onChange = jest.fn();

    render(<ImageField {...defaultProps} onChange={onChange} />);

    const urlInput = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: "https://example.com/external.jpg" },
    });

    expect(mockLocalOnChange).toHaveBeenCalledWith(
      "https://example.com/external.jpg"
    );
  });

  it("URL input is prepopulated when value exists", () => {
    mockFieldValue = "https://example.com/photo.jpg";

    render(<ImageField {...defaultProps} />);

    const urlInput = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    expect(urlInput.value).toBe("https://example.com/photo.jpg");
  });

  it("URL input is readonly when readOnly", () => {
    render(<ImageField {...defaultProps} readOnly={true} />);

    const urlInput = document.querySelector(
      'input[type="text"]'
    ) as HTMLInputElement;
    expect(urlInput.readOnly).toBe(true);
  });

  it("handles drag and drop", async () => {
    const onUpload = jest.fn().mockResolvedValue("https://example.com/dropped.png");
    const onChange = jest.fn();

    render(
      <ImageField
        {...defaultProps}
        field={{ ...defaultProps.field, onUpload }}
        onChange={onChange}
      />
    );

    const dropzone = screen.getByText("Click or drag to upload").closest(
      "[class*='dropzone']"
    ) as HTMLElement;

    const file = createFile();

    fireEvent.dragOver(dropzone, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(file);
      expect(onChange).toHaveBeenCalledWith("https://example.com/dropped.png");
    });
  });
});
