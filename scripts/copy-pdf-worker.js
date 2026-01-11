/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

function copyIfMissing(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source does not exist: ${src}`);
  }

  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const shouldCopy = !fs.existsSync(dest);
  if (!shouldCopy) return false;

  fs.copyFileSync(src, dest);
  return true;
}

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const src = path.join(
    repoRoot,
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.min.mjs"
  );
  const dest = path.join(repoRoot, "public", "pdf.worker.min.mjs");

  const copied = copyIfMissing(src, dest);
  console.log(
    copied
      ? `Copied pdf.js worker to ${path.relative(repoRoot, dest)}`
      : `pdf.js worker already present at ${path.relative(repoRoot, dest)}`
  );
}

try {
  main();
} catch (err) {
  console.error("Failed to prepare pdf.js worker:", err);
  process.exitCode = 1;
}
