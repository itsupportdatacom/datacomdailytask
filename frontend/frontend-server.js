"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.FRONTEND_PORT) || 3000;
const publicRoot = __dirname;
const assetRoot = path.join(publicRoot, "assets");
const pageFiles = new Set([
  "/index.html",
  "/dashboard.html",
  "/style.css",
  "/dashboard.css",
  "/main.js",
  "/dashboard.js"
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function publicFilePath(pathname) {
  if (pathname === "/") {
    return path.join(publicRoot, "index.html");
  }
  if (pageFiles.has(pathname)) {
    return path.join(publicRoot, pathname.slice(1));
  }
  if (pathname.startsWith("/assets/")) {
    const requestedPath = path.resolve(publicRoot, `.${pathname}`);
    const relativeAssetPath = path.relative(assetRoot, requestedPath);
    if (!relativeAssetPath.startsWith("..") && !path.isAbsolute(relativeAssetPath)) {
      return requestedPath;
    }
  }
  return null;
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const filePath = publicFilePath(pathname);
  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, {
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(error.code === "ENOENT" ? "Not found" : "Unable to serve file");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(content);
  });
});

server.listen(port, () => {
  console.log(`Frontend running at http://localhost:${port}`);
  console.log("Backend API expected at https://desktop-19n0dfj.taildafd1a.ts.net:8444/api");
});
