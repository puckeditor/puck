"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Search } from "lucide-react";
import getClassNameFactory from "../../lib/get-class-name-factory";
import styles from "./styles.module.css";

const getClassName = getClassNameFactory("Select", styles);

export type SelectOption = {
  label: string;
  value: string | number | boolean | undefined | null | object;
};

export type SelectProps = {
  value?: any;
  onChange: (value: any) => void;
  options: ReadonlyArray<SelectOption> | Array<SelectOption>;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
};

const isValueEqual = (val1: any, val2: any): boolean => {
  return JSON.stringify(val1) === JSON.stringify(val2);
};

export const Select = ({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  id,
  name,
  searchable = false,
  searchPlaceholder = "Search...",
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredOptions =
    searchable && searchQuery
      ? options.filter((option) =>
          option.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

  const selectedIndex = filteredOptions.findIndex((option) =>
    isValueEqual(option.value, value)
  );
  const selectedOption =
    selectedIndex >= 0 ? filteredOptions[selectedIndex] : null;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            onChange(filteredOptions[highlightedIndex].value);
            setIsOpen(false);
            setSearchQuery("");
            triggerRef.current?.focus();
          }
          break;
        case "Home":
          e.preventDefault();
          setHighlightedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setHighlightedIndex(filteredOptions.length - 1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions, onChange]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      highlightedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [filteredOptions.length, highlightedIndex]);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        setSearchQuery("");
      }
    }
  };

  const handleSelect = (e: React.MouseEvent, option: SelectOption) => {
    e.stopPropagation();
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery("");
    triggerRef.current?.focus();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(0);
      listRef.current?.focus();
    }
  };

  return (
    <div className={getClassName()} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        disabled={disabled}
        className={`${getClassName("trigger")} ${
          disabled ? styles["Select-trigger--disabled"] : ""
        } ${isOpen ? styles["Select-trigger--open"] : ""}`}
        onClick={handleToggle}
        id={id}
        name={name}
      >
        <span className={getClassName("value")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`${getClassName("icon")} ${
            isOpen ? styles["Select-icon--open"] : ""
          }`}
          size={16}
        />
      </button>

      {isOpen && (
        <div className={getClassName("content")}>
          {searchable && (
            <div className={getClassName("search")}>
              <Search className={getClassName("searchIcon")} size={16} />
              <input
                ref={searchRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                className={getClassName("searchInput")}
                autoComplete="off"
              />
            </div>
          )}
          <ul
            ref={listRef}
            role="listbox"
            id={id ? `${id}-listbox` : undefined}
            className={getClassName("list")}
            tabIndex={-1}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = isValueEqual(option.value, value);
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={`${option.label}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`${getClassName("option")} ${
                      isSelected ? styles["Select-option--selected"] : ""
                    } ${
                      isHighlighted ? styles["Select-option--highlighted"] : ""
                    }`}
                    onMouseDown={(e) => handleSelect(e, option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className={getClassName("optionLabel")}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check className={getClassName("checkIcon")} size={16} />
                    )}
                  </li>
                );
              })
            ) : (
              <li className={getClassName("noResults")}>
                <span>No options found</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
