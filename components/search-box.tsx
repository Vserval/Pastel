import type React from "react";

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
};

export function SearchBox({
  value = "",
  onChange,
  placeholder = "検索する",
  disabled = false,
  onKeyDown,
}: Props) {
  return (
    <label className="search-box" aria-label="記事を検索">
      <span className="search-icon" aria-hidden />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}
