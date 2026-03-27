
```Python
from __future__ import annotations

import argparse
import threading
import traceback
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from PIL import Image, ImageChops, ImageFilter, ImageOps

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except Exception:  # pragma: no cover - CLI mode can still work.
    tk = None
    filedialog = None
    messagebox = None
    ttk = None

Image.MAX_IMAGE_PIXELS = None

VALID_EXTENSIONS = {".png", ".tga", ".tif", ".tiff", ".bmp", ".jpg", ".jpeg", ".webp"}

TYPE_ALIASES = {
    "basecolor": "BaseColor",
    "base_color": "BaseColor",
    "albedo": "BaseColor",
    "diffuse": "BaseColor",
    "color": "BaseColor",
    "ao": "AO",
    "ambientocclusion": "AO",
    "ambient_occlusion": "AO",
    "normal": "Normal",
    "normaldx": "Normal",
    "normalgl": "Normal",
    "roughness": "Roughness",
    "rough": "Roughness",
    "metallic": "Metallic",
    "metalness": "Metallic",
    "metal": "Metallic",
    "height": "Height",
    "displacement": "Height",
    "opacity": "Opacity",
    "mask": "Opacity",
    "emissive": "Emissive",
    "emission": "Emissive",
}

DEFAULT_GRAY_VALUES = {
    "AO": 255,
    "Roughness": 255,
    "Metallic": 0,
    "Height": 0,
    "Opacity": 255,
}

DEFAULT_RGBA_VALUES = {
    "Normal": (128, 128, 255, 0),
    "Emissive": (0, 0, 0, 0),
    "BaseColor": (0, 0, 0, 0),
}

ORDERED_MAP_TYPES = ["BaseColor", "Normal", "AO", "Roughness", "Metallic", "Height", "Emissive"]
GRAY_MAP_TYPES = ["AO", "Roughness", "Metallic", "Height"]
RGBA_MAP_TYPES = ["BaseColor", "Normal", "Emissive"]


@dataclass
class MaterialVariant:
    mesh_key: str
    material_id: str
    files: Dict[str, Path] = field(default_factory=dict)


class TextureProcessor:
    def __init__(self, log_callback=None):
        self.log = log_callback or (lambda msg: None)

    def process(self, source_dir: str, output_dir: str) -> Tuple[int, List[str]]:
        source = Path(source_dir)
        output = Path(output_dir)
        if not source.exists() or not source.is_dir():
            raise FileNotFoundError(f"ソースフォルダーが見つかりません: {source}")
        output.mkdir(parents=True, exist_ok=True)

        meshes = self._collect_meshes(source)
        if not meshes:
            raise RuntimeError("対象のテクスチャーが見つかりませんでした。")

        warnings: List[str] = []
        processed = 0
        for mesh_key, variants in sorted(meshes.items()):
            try:
                self._process_mesh(mesh_key, variants, output)
                processed += 1
                self.log(f"OK  {mesh_key} ({len(variants)} material)")
            except Exception as exc:
                warning = f"{mesh_key}: {exc}"
                warnings.append(warning)
                self.log(f"NG  {warning}")

        return processed, warnings

    def _collect_meshes(self, source: Path) -> Dict[str, Dict[str, MaterialVariant]]:
        meshes: Dict[str, Dict[str, MaterialVariant]] = {}
        for path in source.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in VALID_EXTENSIONS:
                continue
            parsed = self._parse_name(path.stem)
            if not parsed:
                continue
            mesh_key, material_id, map_type = parsed
            mesh_variants = meshes.setdefault(mesh_key, {})
            variant = mesh_variants.setdefault(material_id, MaterialVariant(mesh_key=mesh_key, material_id=material_id))
            variant.files[map_type] = path
        return meshes

    def _parse_name(self, stem: str) -> Optional[Tuple[str, str, str]]:
        if "_" not in stem:
            return None
        parts = stem.split("_")
        suffix_raw = parts[-1].strip()
        suffix_key = suffix_raw.lower().replace("-", "").replace(" ", "").replace(".", "")
        map_type = TYPE_ALIASES.get(suffix_key) or suffix_raw

        if len(parts) >= 3 and self._is_likely_material_id(parts[-2]):
            mesh_key = "_".join(parts[:-2]).strip()
            material_id = parts[-2].strip()
        else:
            mesh_key = "_".join(parts[:-1]).strip()
            material_id = "default"

        if not mesh_key:
            return None
        return mesh_key, material_id, map_type

    def _is_likely_material_id(self, token: str) -> bool:
        normalized = token.strip().replace("-", "")
        if not (4 <= len(normalized) <= 16):
            return False
        if not all(ch.isalnum() for ch in normalized):
            return False
        return any(ch.isdigit() for ch in normalized)

    def _process_mesh(self, mesh_key: str, variants: Dict[str, MaterialVariant], output_dir: Path) -> None:
        ordered_variants = [variants[key] for key in sorted(variants.keys())]
        size = self._resolve_canvas_size(ordered_variants)
        output_dir.mkdir(parents=True, exist_ok=True)

        self.log(f"   materials: {', '.join(v.material_id for v in ordered_variants)}")
        self.log(f"   canvas: {size[0]}x{size[1]}")

        available_maps = {map_type for variant in ordered_variants for map_type in variant.files.keys()}
        ordered_map_types = self._ordered_map_types(available_maps)
        self.log(f"   maps: {', '.join(ordered_map_types)}")

        material_masks: Dict[str, Image.Image] = {}
        union_mask = Image.new("L", size, 0)
        for variant in ordered_variants:
            mask = self._build_material_mask(variant, size)
            material_masks[variant.material_id] = mask
            union_mask = ImageChops.lighter(union_mask, mask)
            coverage = self._mask_coverage(mask)
            self.log(f"   mask[{variant.material_id}]: {coverage:.1f}%")

        map_modes = self._detect_map_modes(ordered_variants, ordered_map_types)
        for map_type in ordered_map_types:
            if map_type == "Opacity":
                continue

            mode = map_modes.get(map_type, self._default_mode_for_map(map_type))
            if mode == "L":
                canvas = Image.new("L", size, self._default_gray_value(map_type))
                for variant in ordered_variants:
                    mask = material_masks[variant.material_id]
                    layer = self._prepare_gray_map(variant, map_type, size)
                    canvas = Image.composite(layer, canvas, mask)
                canvas.save(output_dir / f"{mesh_key}_{map_type}.png")
            else:
                canvas = Image.new("RGBA", size, self._default_rgba_value(map_type))
                for variant in ordered_variants:
                    mask = material_masks[variant.material_id]
                    layer = self._prepare_rgba_map(variant, map_type, size, mask)
                    canvas = Image.composite(layer, canvas, mask)
                canvas.putalpha(union_mask)
                canvas.save(output_dir / f"{mesh_key}_{map_type}.png")

    def _ordered_map_types(self, available_maps: set[str]) -> List[str]:
        prioritized = [map_type for map_type in ORDERED_MAP_TYPES if map_type in available_maps]
        remaining = sorted(map_type for map_type in available_maps if map_type not in ORDERED_MAP_TYPES and map_type != "Opacity")
        return prioritized + remaining

    def _detect_map_modes(self, variants: List[MaterialVariant], map_types: List[str]) -> Dict[str, str]:
        modes: Dict[str, str] = {}
        for map_type in map_types:
            if map_type in RGBA_MAP_TYPES:
                modes[map_type] = "RGBA"
                continue
            if map_type in GRAY_MAP_TYPES or map_type == "Opacity":
                modes[map_type] = "L"
                continue

            detected = None
            for variant in variants:
                path = variant.files.get(map_type)
                if path is None:
                    continue
                with Image.open(path) as img:
                    bands = img.getbands()
                    if img.mode in {"1", "L", "LA", "I", "I;16", "F"}:
                        detected = "L"
                    elif len(bands) == 1:
                        detected = "L"
                    else:
                        detected = "RGBA"
                if detected is not None:
                    break
            modes[map_type] = detected or self._default_mode_for_map(map_type)
        return modes

    def _default_mode_for_map(self, map_type: str) -> str:
        if map_type in GRAY_MAP_TYPES or map_type == "Opacity":
            return "L"
        return "RGBA"

    def _default_gray_value(self, map_type: str) -> int:
        return DEFAULT_GRAY_VALUES.get(map_type, 0)

    def _default_rgba_value(self, map_type: str) -> Tuple[int, int, int, int]:
        if map_type == "Normal":
            return DEFAULT_RGBA_VALUES["Normal"]
        return DEFAULT_RGBA_VALUES.get(map_type, (0, 0, 0, 0))

    def _resolve_canvas_size(self, variants: List[MaterialVariant]) -> Tuple[int, int]:
        candidates: List[Tuple[int, int]] = []
        for variant in variants:
            for preferred in ["BaseColor", "Normal", "AO", "Roughness", "Metallic", "Height", "Emissive", "Opacity", *sorted(variant.files.keys())]:
                path = variant.files.get(preferred)
                if path is None:
                    continue
                with Image.open(path) as img:
                    candidates.append(img.size)
        if not candidates:
            raise RuntimeError("テクスチャーサイズを決定できませんでした。")
        max_area = max(w * h for w, h in candidates)
        large_sizes = [size for size in candidates if size[0] * size[1] == max_area]
        return max(large_sizes, key=lambda s: (s[0], s[1]))

    def _build_material_mask(self, variant: MaterialVariant, size: Tuple[int, int]) -> Image.Image:
        base_path = variant.files.get("BaseColor")
        if base_path is not None:
            rgba = self._load_rgba(base_path)
            rgba = self._fit_rgba(rgba, size)
            alpha = rgba.getchannel("A")
            if self._has_visible_alpha(alpha):
                self.log(f"   mask source[{variant.material_id}]: BaseColor alpha")
                return alpha
            derived = self._derive_mask_from_rgb(rgba)
            if self._has_visible_alpha(derived):
                self.log(f"   mask source[{variant.material_id}]: BaseColor RGB から推定")
                return derived

        opacity_path = variant.files.get("Opacity")
        if opacity_path is not None:
            self.log(f"   mask source[{variant.material_id}]: Opacity")
            return self._load_gray(opacity_path, size)

        for candidate in ["AO", "Roughness", "Metallic", "Height", "Normal", "Emissive", *sorted(variant.files.keys())]:
            if candidate in {"BaseColor", "Opacity"}:
                continue
            path = variant.files.get(candidate)
            if path is None:
                continue
            rgba = self._fit_rgba(self._load_rgba(path), size)
            derived = self._derive_mask_from_rgb(rgba)
            if self._has_visible_alpha(derived):
                self.log(f"   mask source[{variant.material_id}]: {candidate} から推定")
                return derived

        self.log(f"   mask source[{variant.material_id}]: フル不透明")
        return Image.new("L", size, 255)

    def _prepare_rgba_map(
        self,
        variant: MaterialVariant,
        map_type: str,
        size: Tuple[int, int],
        material_mask: Image.Image,
    ) -> Image.Image:
        if map_type in variant.files:
            rgba = self._fit_rgba(self._load_rgba(variant.files[map_type]), size)
        else:
            rgba = Image.new("RGBA", size, self._default_rgba_value(map_type))

        background = Image.new("RGBA", size, self._default_rgba_value(map_type))
        layer = Image.composite(rgba, background, material_mask)
        layer.putalpha(material_mask)
        return layer

    def _prepare_gray_map(self, variant: MaterialVariant, map_type: str, size: Tuple[int, int]) -> Image.Image:
        default = self._default_gray_value(map_type)
        return self._load_gray(variant.files.get(map_type), size, default=default)

    def _mask_coverage(self, mask: Image.Image) -> float:
        histogram = mask.histogram()
        total = mask.size[0] * mask.size[1] * 255
        if total == 0:
            return 0.0
        weighted = sum(index * count for index, count in enumerate(histogram))
        return (weighted / total) * 100.0

    def _has_visible_alpha(self, alpha: Image.Image) -> bool:
        extrema = alpha.getextrema()
        return extrema is not None and extrema != (255, 255)

    def _load_rgba(self, path: Path) -> Image.Image:
        with Image.open(path) as img:
            return img.convert("RGBA")

    def _load_gray(self, path: Optional[Path], size: Tuple[int, int], default: Optional[int] = None) -> Image.Image:
        if path is None:
            if default is None:
                raise RuntimeError("グレースケール画像が必要ですが、ソースがありません。")
            return Image.new("L", size, color=default)
        with Image.open(path) as img:
            gray = ImageOps.grayscale(img)
        return self._fit_gray(gray, size)

    def _fit_rgba(self, image: Image.Image, size: Tuple[int, int]) -> Image.Image:
        if image.size == size:
            return image.copy()
        return image.resize(size, Image.Resampling.LANCZOS)

    def _fit_gray(self, image: Image.Image, size: Tuple[int, int]) -> Image.Image:
        if image.size == size:
            return image.copy()
        return image.resize(size, Image.Resampling.LANCZOS)

    def _derive_mask_from_rgb(self, rgba: Image.Image) -> Image.Image:
        rgb = rgba.convert("RGB")
        grayscale = ImageOps.grayscale(rgb)
        threshold = grayscale.point(lambda px: 255 if px > 2 else 0)
        threshold = threshold.filter(ImageFilter.BoxBlur(1))
        return threshold


class App:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Texture Set Combiner")
        self.root.geometry("900x620")

        self.source_var = tk.StringVar()
        self.output_var = tk.StringVar()
        self.status_var = tk.StringVar(value="待機中")

        self._build_ui()

    def _build_ui(self):
        root = self.root
        main = ttk.Frame(root, padding=12)
        main.pack(fill="both", expand=True)

        title = ttk.Label(main, text="Texture Set Combiner", font=("Yu Gothic UI", 18, "bold"))
        title.pack(anchor="w")
        subtitle = ttk.Label(
            main,
            text=(
                "同じメッシュ名の複数 material テクスチャを BaseColor の alpha で切り抜き、"
                "既知/未知を問わず map ごとに合成して出力フォルダー直下へ書き出します。"
            ),
        )
        subtitle.pack(anchor="w", pady=(0, 12))

        path_frame = ttk.LabelFrame(main, text="フォルダー設定", padding=12)
        path_frame.pack(fill="x")
        path_frame.columnconfigure(1, weight=1)

        ttk.Label(path_frame, text="ソースフォルダー").grid(row=0, column=0, sticky="w", pady=6)
        ttk.Entry(path_frame, textvariable=self.source_var).grid(row=0, column=1, sticky="ew", padx=8, pady=6)
        ttk.Button(path_frame, text="参照", command=self.select_source).grid(row=0, column=2, pady=6)

        ttk.Label(path_frame, text="出力フォルダー").grid(row=1, column=0, sticky="w", pady=6)
        ttk.Entry(path_frame, textvariable=self.output_var).grid(row=1, column=1, sticky="ew", padx=8, pady=6)
        ttk.Button(path_frame, text="参照", command=self.select_output).grid(row=1, column=2, pady=6)

        action_frame = ttk.Frame(main)
        action_frame.pack(fill="x", pady=12)
        ttk.Button(action_frame, text="実行", command=self.run).pack(side="left")
        ttk.Label(action_frame, textvariable=self.status_var).pack(side="left", padx=12)

        log_frame = ttk.LabelFrame(main, text="ログ", padding=12)
        log_frame.pack(fill="both", expand=True)
        self.log_text = tk.Text(log_frame, wrap="word", height=22)
        self.log_text.pack(fill="both", expand=True)

        help_text = (
            "入力例:\n"
            "  shoes_boneless_AI_03E85F57_BaseColor.png\n"
            "  shoes_boneless_AI_CC293C02_BaseColor.png\n"
            "  shoes_boneless_AI_03E85F57_FuzzMask.png\n\n"
            "判定ルール:\n"
            "  [mesh名]_[materialID]_[map種別].png\n"
            "  未知の map種別でも、その名前のまま合成対象に含めます。\n\n"
            "出力:\n"
            "  出力フォルダー直下に mesh名_BaseColor.png / mesh名_Normal.png /\n"
            "  mesh名_FuzzMask.png のように map ごとに保存"
        )
        ttk.Label(main, text=help_text, justify="left").pack(anchor="w", pady=(8, 0))

    def select_source(self):
        folder = filedialog.askdirectory(title="ソースフォルダーを選択")
        if folder:
            self.source_var.set(folder)

    def select_output(self):
        folder = filedialog.askdirectory(title="出力フォルダーを選択")
        if folder:
            self.output_var.set(folder)

    def append_log(self, message: str):
        self.log_text.insert("end", message + "\n")
        self.log_text.see("end")
        self.root.update_idletasks()

    def run(self):
        source = self.source_var.get().strip()
        output = self.output_var.get().strip()
        if not source or not output:
            messagebox.showwarning("入力不足", "ソースフォルダーと出力フォルダーを指定してください。")
            return

        self.log_text.delete("1.0", "end")
        self.status_var.set("処理中...")

        def worker():
            try:
                processor = TextureProcessor(log_callback=lambda msg: self.root.after(0, self.append_log, msg))
                processed, warnings = processor.process(source, output)
                summary = f"完了: {processed} mesh"
                if warnings:
                    summary += f" / 警告: {len(warnings)} 件"
                self.root.after(0, self.status_var.set, summary)
                if warnings:
                    self.root.after(0, self.append_log, "")
                    self.root.after(0, self.append_log, "警告一覧:")
                    for item in warnings:
                        self.root.after(0, self.append_log, f" - {item}")
                self.root.after(0, messagebox.showinfo, "完了", summary)
            except Exception as exc:
                details = traceback.format_exc()
                self.root.after(0, self.status_var.set, "エラー")
                self.root.after(0, self.append_log, details)
                self.root.after(0, messagebox.showerror, "エラー", str(exc))

        threading.Thread(target=worker, daemon=True).start()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Texture Set Combiner")
    parser.add_argument("--source", help="ソースフォルダー")
    parser.add_argument("--output", help="出力フォルダー")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.source and args.output:
        processor = TextureProcessor(log_callback=print)
        processed, warnings = processor.process(args.source, args.output)
        print(f"完了: {processed} mesh")
        if warnings:
            print("警告:")
            for warning in warnings:
                print(f" - {warning}")
        return

    if tk is None:
        raise RuntimeError("GUI を起動できません。tkinter が利用できる Python で実行してください。")

    root = tk.Tk()
    try:
        style = ttk.Style(root)
        if "vista" in style.theme_names():
            style.theme_use("vista")
    except Exception:
        pass
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()

```