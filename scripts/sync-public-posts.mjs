import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const postsDir = path.join(projectRoot, "posts");
const publicPostsDir = path.join(projectRoot, "public", "posts");

const IMAGE_EXTS = new Set([
  ".avif",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".obsidian") continue;
      files.push(...walk(full));
      continue;
    }
    if (entry.isFile()) files.push(full);
  }
  return files;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function shouldCopy(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTS.has(ext);
}

function copyIfChanged(src, dst) {
  const srcStat = fs.statSync(src);
  const dstExists = fs.existsSync(dst);
  if (dstExists) {
    const dstStat = fs.statSync(dst);
    if (dstStat.size === srcStat.size && dstStat.mtimeMs >= srcStat.mtimeMs) {
      return false;
    }
  }

  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  return true;
}

if (!fs.existsSync(postsDir)) {
  process.exit(0);
}

ensureDir(publicPostsDir);

const all = walk(postsDir);
let copied = 0;

for (const file of all) {
  if (!shouldCopy(file)) continue;
  const rel = path.relative(postsDir, file);
  const dst = path.join(publicPostsDir, rel);
  if (copyIfChanged(file, dst)) copied += 1;
}

if (process.env.NODE_ENV !== "test") {
  // Keep output minimal but helpful in dev/build logs.
  console.log(`[sync-public-posts] copied ${copied} file(s) to public/posts`);
}

