#!/usr/bin/env python3
"""
テンプレート用ソースを1つの Markdown ファイルにまとめる。
node_modules / .next / out 等は含めない。ライブラリは梱包しない。
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_MD = ROOT / "my-dev-blog-template.md"

SKIP_DIRS = {
    "node_modules",
    ".next",
    "out",
    ".git",
    "__pycache__",
    ".cursor",
    "mcps",
    "terminals",
    "agent-transcripts",
}
INCLUDE_DIRS = ["app", "components", "lib", "posts", ".github"]
INCLUDE_ROOT_FILES = [
    "package.json",
    "next.config.ts",
    "tsconfig.json",
    ".gitignore",
]

# コードブロックの言語
LANG = {
    ".json": "json",
    ".ts": "ts",
    ".tsx": "tsx",
    ".js": "js",
    ".jsx": "jsx",
    ".css": "css",
    ".md": "md",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".html": "html",
    ".svg": "svg",
    ".py": "python",
    ".sh": "bash",
}


def should_skip(path: Path, relative: Path) -> bool:
    if path.name in SKIP_DIRS:
        return True
    for skip in SKIP_DIRS:
        if skip in relative.parts:
            return True
    if path.suffix in (".ico", ".png", ".jpg", ".jpeg", ".gif", ".woff", ".woff2"):
        return True  # バイナリはスキップ
    return False


def lang_for(path: Path) -> str:
    return LANG.get(path.suffix, "text")


def read_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return f"<!-- read error: {e} -->"


def collect_files():
    files = []
    for name in INCLUDE_ROOT_FILES:
        f = ROOT / name
        if f.is_file():
            files.append(f.relative_to(ROOT))
    for dir_name in INCLUDE_DIRS:
        d = ROOT / dir_name
        if not d.is_dir():
            continue
        for f in sorted(d.rglob("*")):
            if not f.is_file():
                continue
            try:
                rel = f.relative_to(ROOT)
            except ValueError:
                continue
            if should_skip(f, rel):
                continue
            files.append(rel)
    return sorted(files, key=lambda p: (str(p).replace("\\", "/"),))


def fence_for(code: str) -> str:
    """
    コード内に含まれるバッククォートの最大連続数より 1 つ多い長さのフェンスを返す。
    これで内側の ``` を安全にラップできる。
    """
    max_backticks = 3
    for line in code.splitlines():
        stripped = line.lstrip()
        if not stripped.startswith("`"):
            continue
        run = 0
        for ch in stripped:
            if ch == "`":
                run += 1
            else:
                break
        if run:
            max_backticks = max(max_backticks, run + 1)
    return "`" * max_backticks


def main():
    lines = [
        "# my-dev-blog テンプレート（一式）",
        "",
        "Next.js App Router / 静的エクスポート / GitHub Pages / Markdown 記事（ネストフォルダ・GFM・ダークUI対応）。",
        "ライブラリ（node_modules）は含めていません。`npm install` で復元してください。",
        "",
        "---",
        "",
    ]
    files = collect_files()
    for rel in files:
        path = ROOT / rel
        rel_str = rel.as_posix()
        code = read_file(path)
        lang = lang_for(path)
        fence = fence_for(code)
        lines.append(f"## `{rel_str}`")
        lines.append("")
        lines.append(f"{fence}{lang}")
        lines.append(code.rstrip())
        lines.append(fence)
        lines.append("")
        lines.append("---")
        lines.append("")

    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Created: {OUT_MD}")
    print(f"Files: {len(files)}")
    print(f"Size: {OUT_MD.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
