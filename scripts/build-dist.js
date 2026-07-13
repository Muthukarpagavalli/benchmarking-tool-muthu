const fs = require("fs");
const path = require("path");

const root = process.cwd();
const distDir = path.join(root, "dist");
const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

copyRecursive(standaloneDir, distDir);

const standaloneStatic = path.join(distDir, ".next", "static");
copyRecursive(staticDir, standaloneStatic);

const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  copyRecursive(publicDir, path.join(distDir, "public"));
}

const packageJson = path.join(root, "package.json");
if (fs.existsSync(packageJson)) {
  fs.copyFileSync(packageJson, path.join(distDir, "package.json"));
}

const serverDir = path.join(distDir, "server");
fs.mkdirSync(serverDir, { recursive: true });
const serverBootstrap = fs.readFileSync(path.join(standaloneDir, "server.js"), "utf8")
  .replace("const dir = path.join(__dirname)", "const dir = path.join(__dirname, '..')");
fs.writeFileSync(
  path.join(serverDir, "index.js"),
  serverBootstrap,
  "utf8"
);

const openAiDir = path.join(distDir, ".openai");
fs.mkdirSync(openAiDir, { recursive: true });
fs.writeFileSync(
  path.join(openAiDir, "hosting.json"),
  JSON.stringify(
    {
      project_id: "appgprj_6a550e789adc81918c85fa461f4ba6d9",
    },
    null,
    2
  ),
  "utf8"
);
