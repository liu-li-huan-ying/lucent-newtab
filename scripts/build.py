#!/usr/bin/env python3
"""构建 Lucent 浏览器扩展压缩包（MV3）。

仅打包扩展运行所需文件（白名单，与 manifest.json 一致），
排除设计草稿、构建脚本、仓库元数据等无关文件。

用法:
    python scripts/build.py [--out DIR]
构件命名:
    dist/lucent-newtab-v<manifest.version>.zip
"""
import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "manifest.json")

# 扩展运行所需文件白名单（必须与 manifest.json 的 icons / newtab 对应）
INCLUDE = [
    "manifest.json",
    "index.html",
    "style.css",
    "app.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
]


def main():
    # 允许指定输出目录（CI 用），默认 dist/
    out_dir = None
    if "--out" in sys.argv:
        out_dir = sys.argv[sys.argv.index("--out") + 1]

    with open(MANIFEST, "r", encoding="utf-8") as f:
        version = json.load(f).get("version", "0.0.0")

    out_dir = out_dir or os.path.join(ROOT, "dist")
    os.makedirs(out_dir, exist_ok=True)
    zip_name = f"lucent-newtab-v{version}.zip"
    zip_path = os.path.join(out_dir, zip_name)

    written = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in INCLUDE:
            src = os.path.join(ROOT, rel)
            if not os.path.exists(src):
                print(f"⚠️  缺失（已跳过）: {rel}")
                continue
            # 归档内统一正斜杠、平铺在根目录
            arcname = rel.replace(os.sep, "/")
            z.write(src, arcname)
            written += 1

    size = os.path.getsize(zip_path)
    print(f"✅ 已构建: {zip_path}  ({size} 字节, {written} 个文件)")
    # 输出版本号，便于 CI 解析（grep 友好）
    print(f"version={version}")


if __name__ == "__main__":
    main()
