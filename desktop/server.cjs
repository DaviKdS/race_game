const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const isPackaged = Boolean(process.pkg);
const distDir = isPackaged
  ? path.join(path.dirname(process.execPath), "dist")
  : path.join(__dirname, "..", "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Arquivo nao encontrado.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(data);
  });
}

function createServer(port) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);
    const cleanPath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const candidate = path.normalize(path.join(distDir, cleanPath || "index.html"));

    if (!candidate.startsWith(distDir)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Acesso negado.");
      return;
    }

    fs.stat(candidate, (error, stat) => {
      if (!error && stat.isFile()) {
        sendFile(response, candidate);
      } else {
        sendFile(response, path.join(distDir, "index.html"));
      }
    });
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < 4199) {
      createServer(port + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log(`Street Rush rodando em ${url}`);
    exec(`start "" "${url}"`);
  });
}

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error(`Build nao encontrado em: ${distDir}`);
  console.error("Rode npm run build antes de iniciar o launcher.");
  process.exit(1);
}

createServer(Number(process.env.PORT) || 4173);
