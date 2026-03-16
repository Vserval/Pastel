#!/usr/bin/env python3
"""
ダミー Markdown 記事を大量生成するスクリプト。
posts/ 以下に最大5階層のネストでディレクトリを作成し、各階層に .md を配置する。
"""

import os
import random
from pathlib import Path
from datetime import datetime, timedelta

# プロジェクトルート（このスクリプトは scripts/ にある想定）
ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "posts"

# 階層ごとのフォルダ名候補（ネストを再現する用）
FOLDER_NAMES = [
    ["Frontend", "Backend", "DevOps", "Houdini", "CSS", "JavaScript", "TypeScript", "React", "Vue", "Next"],
    ["Basics", "Advanced", "Recipes", "API", "Guides", "Examples", "Tips", "Performance", "Security", "Testing"],
    ["Setup", "Concepts", "Patterns", "Hooks", "Components", "Routing", "State", "SSR", "Static", "Dynamic"],
    ["Intro", "DeepDive", "Comparison", "Migration", "Troubleshooting", "BestPractices", "Recipes", "Reference"],
    ["Part1", "Part2", "Part3", "Appendix", "FAQ", "Changelog", "Legacy", "Experimental"],
]

# ダミー記事のタイトル・説明のテンプレート
TITLE_TEMPLATES = [
    "【{topic}】{suffix}",
    "{topic} の {suffix}",
    "{topic} 入門: {suffix}",
    "{suffix} - {topic}",
]
SUFFIXES = [
    "基礎", "応用", "まとめ", "メモ", "チュートリアル", "リファレンス",
    "ベストプラクティス", "よくある質問", "トラブルシューティング",
    "パフォーマンス最適化", "セットアップ手順", "比較検証",
]
TOPICS = [
    "コンポーネント", "ルーティング", "状態管理", "スタイリング",
    "データ取得", "認証", "デプロイ", "テスト", "型安全", "アクセシビリティ",
]

BODY_PARAGRAPHS = [
    "この記事では、{topic} について解説します。",
    "まずは環境構築から始めましょう。",
    "サンプルコードを以下に示します。",
    "注意点として、本番環境では設定の見直しを推奨します。",
    "まとめとして、以上の手順で再現できます。",
]


def random_date() -> str:
    """過去1年以内のランダムな日付を YYYY-MM-DD で返す"""
    d = datetime.now() - timedelta(days=random.randint(0, 365))
    return d.strftime("%Y-%m-%d")


def random_category_from_path(parts: list[str]) -> str:
    """パスの先頭フォルダを category に使う"""
    return parts[0] if parts else "Docs"


def yaml_quote(s: str) -> str:
    """YAML でコロン等が含まれる文字列をダブルクォートで囲む"""
    escaped = s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    return f'"{escaped}"'


def make_body(topic: str) -> str:
    """ダミー本文を生成"""
    lines = [
        f"# {topic} について",
        "",
        random.choice(BODY_PARAGRAPHS).format(topic=topic),
        "",
        "## 手順",
        "",
        "1. まず設定を確認する",
        "2. 必要に応じてオプションを変更する",
        "3. ビルドして動作確認する",
        "",
        "## 参考",
        "",
        "公式ドキュメントを参照してください。",
    ]
    return "\n".join(lines)


def generate_one_md(relative_dir_parts: list[str], filename: str, index: int) -> None:
    """1つの .md ファイルを生成"""
    topic = random.choice(TOPICS)
    suffix = random.choice(SUFFIXES)
    title_tpl = random.choice(TITLE_TEMPLATES)
    title = title_tpl.format(topic=topic, suffix=suffix)
    # 同じタイトルが被らないようにインデックスを混ぜる
    if index % 7 == 0:
        title = f"{title} ({index})"

    category = random_category_from_path(relative_dir_parts)
    date = random_date()
    description = f"{topic} に関する {suffix} のダミー記事です。（自動生成 #{index}）"
    body = make_body(topic)

    frontmatter = f"""---
title: {yaml_quote(title)}
description: {yaml_quote(description)}
category: {yaml_quote(category)}
date: "{date}"
---

{body}
"""
    dir_path = POSTS_DIR
    for part in relative_dir_parts:
        dir_path = dir_path / part
    dir_path.mkdir(parents=True, exist_ok=True)
    file_path = dir_path / filename
    file_path.write_text(frontmatter, encoding="utf-8")


def main() -> None:
    random.seed(42)
    POSTS_DIR.mkdir(parents=True, exist_ok=True)

    count = 0
    # 階層1〜5まで、それぞれ複数フォルダ・複数ファイルを作成
    # 階層1: 10フォルダ × 3ファイル = 30
    # 階層2: 10×5 × 2 = 100
    # 階層3: 10×5×5 × 2 = 500
    # 階層4: 10×5×5×5 × 1 = 1250 → 多すぎるので減らす
    # 階層5: さらに減らす

    # 階層1 (depth=1): posts/Frontend/post-1.md など
    for folder in FOLDER_NAMES[0]:
        for i in range(3):
            generate_one_md([folder], f"post-{folder.lower()}-{i}.md", count)
            count += 1

    # 階層2 (depth=2): posts/Frontend/React/item-1.md など
    for f0 in FOLDER_NAMES[0][:6]:
        for f1 in FOLDER_NAMES[1][:5]:
            for i in range(2):
                generate_one_md([f0, f1], f"item-{i}.md", count)
                count += 1

    # 階層3 (depth=3)
    for f0 in FOLDER_NAMES[0][:4]:
        for f1 in FOLDER_NAMES[1][:4]:
            for f2 in FOLDER_NAMES[2][:3]:
                for i in range(2):
                    generate_one_md([f0, f1, f2], f"article-{i}.md", count)
                    count += 1

    # 階層4 (depth=4)
    for f0 in FOLDER_NAMES[0][:3]:
        for f1 in FOLDER_NAMES[1][:3]:
            for f2 in FOLDER_NAMES[2][:3]:
                for f3 in FOLDER_NAMES[3][:2]:
                    generate_one_md([f0, f1, f2, f3], "readme.md", count)
                    count += 1

    # 階層5 (depth=5, 最大ネスト)
    for f0 in FOLDER_NAMES[0][:2]:
        for f1 in FOLDER_NAMES[1][:2]:
            for f2 in FOLDER_NAMES[2][:2]:
                for f3 in FOLDER_NAMES[3][:2]:
                    for f4 in FOLDER_NAMES[4][:2]:
                        generate_one_md([f0, f1, f2, f3, f4], "index.md", count)
                        count += 1

    print(f"Generated {count} dummy Markdown files under {POSTS_DIR}")
    print("Nesting: depth 1..5 (max 5).")


if __name__ == "__main__":
    main()
