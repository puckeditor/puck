import { useCallback, useRef, useState } from "react";
import type { FieldPropsInternal } from "../..";
import type { ImageField as ImageFieldType } from "../../../../types";
import { Image, Trash2, Upload } from "lucide-react";
import { useDeepField } from "../../lib/use-deep-field";
import { useLocalValue } from "../../lib/use-local-value";
import getClassNameFactory from "../../../../lib/get-class-name-factory";

import styles from "./styles.module.css";

const getClassName = getClassNameFactory("ImageField", styles);

export const ImageField = ({
  field,
  onChange,
  id,
  name = id,
  label,
  labelIcon,
  Label,
  readOnly,
}: FieldPropsInternal) => {
  const value = useDeepField(name) as string | undefined;
  const [localUrl, onChangeLocal] = useLocalValue(name, onChange);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (field.type !== "image") {
    return null;
  }

  const imageField = field as ImageFieldType;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (imageField.validate) {
        const validationError = imageField.validate(file);
        if (validationError) {
          setError(validationError);
          return;
        }
      }

      setIsLoading(true);

      try {
        const url = await imageField.onUpload(file);
        onChange(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setIsLoading(false);
      }
    },
    [imageField, onChange]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }

      // Reset so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!readOnly && !isLoading) {
        setIsDragOver(true);
      }
    },
    [readOnly, isLoading]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (readOnly || isLoading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [readOnly, isLoading, handleFile]
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setError(null);
  }, [onChange]);

  const handleDropzoneClick = useCallback(() => {
    if (!readOnly && !isLoading) {
      fileInputRef.current?.click();
    }
  }, [readOnly, isLoading]);

  return (
    <Label
      label={label || name}
      icon={labelIcon || <Image size={16} />}
      el="div"
    >
      <div className={getClassName()}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={getClassName("fileInput")}
          onChange={handleFileInputChange}
          disabled={readOnly || isLoading}
        />

        <input
          className={getClassName("urlInput")}
          autoComplete="off"
          type="text"
          title={label || name}
          name={name}
          value={localUrl}
          onChange={(e) => onChangeLocal(e.currentTarget.value)}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          id={id}
          placeholder={imageField.placeholder || "Paste image URL..."}
        />

        {value ? (
          <div className={getClassName("preview")}>
            <img
              src={value}
              alt={label || "Preview"}
              className={getClassName("previewImage")}
            />
            {!readOnly && (
              <button
                type="button"
                className={getClassName("removeButton")}
                onClick={handleRemove}
                aria-label="Remove image"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ) : (
          <div
            className={getClassName({
              dropzone: true,
              "dropzone--isDragOver": isDragOver,
              "dropzone--isReadOnly": !!readOnly,
              "dropzone--isLoading": isLoading,
            })}
            onClick={handleDropzoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload size={20} />
            <span>
              {isLoading
                ? "Uploading..."
                : "Click or drag to upload"}
            </span>
          </div>
        )}

        {error && <div className={getClassName("error")}>{error}</div>}
      </div>
    </Label>
  );
};
