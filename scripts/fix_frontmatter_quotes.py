#!/usr/bin/env python3
"""
既存の .md の frontmatter で、title / description / category を
YAML 用にダブルクォートで囲み直す（コロン含むとパースエラーになるため）。
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"


def yaml_quote(s: str) -> str:
    s = s.strip()
    escaped = s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return False
    end_fm = text.index("---", 3)  # 2つ目の --- の位置
    if end_fm == -1:
        return False
    fm = text[4:end_fm].strip()  # 最初の --- と2つ目の --- の間
    body = text[end_fm + 3 :].lstrip("\n")

    def replace_field(match: re.Match) -> str:
        key, val = match.group(1).strip(), match.group(2)
        val_stripped = val.strip()
        if key not in ("title", "description", "category"):
            return match.group(0)
        if (val_stripped.startswith('"') and val_stripped.endswith('"')) or (
            val_stripped.startswith("'") and val_stripped.endswith("'")
        ):
            return match.group(0)
        return f"{key}: {yaml_quote(val_stripped)}\n"

    new_fm = re.sub(
        r"^(\w+):\s*(.*?)(?=\n\w+:\s|\n\s*\n|\Z)",
        replace_field,
        fm + "\n",
        flags=re.M | re.DOTALL,
    )
    if new_fm.strip() == fm:
        return False
    new_text = "---\n" + new_fm.strip() + "\n---\n\n" + body
    path.write_text(new_text, encoding="utf-8")
    return True


def main() -> None:
    count = 0
    for path in POSTS_DIR.rglob("*.md"):
        if fix_file(path):
            count += 1
            print(path.relative_to(POSTS_DIR))
    print(f"Fixed {count} files.")


if __name__ == "__main__":
    main()
