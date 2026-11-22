import "dotenv/config";
import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, posix, resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { load } from "cheerio";

const domain = "https://tuzgolusk.com";
const project = process.cwd();
const output = resolve("pages-dist");
const stage = await mkdtemp(resolve(".pages-export-"));
const staticFiles = new Map();
const searchResults = [];
let server;
let origin;

async function write(path, contents) {
  const target = join(stage, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function availablePort() {
  const socket = createServer();
  await new Promise((ready, reject) => {
    socket.once("error", reject).listen(0, "127.0.0.1", ready);
  });
  const { port } = socket.address();
  await new Promise((ready, reject) =>
    socket.close((error) => (error ? reject(error) : ready())),
  );
  return port;
}

async function fetchLocal(path) {
  const url = new URL(path, origin);
  if (url.origin !== origin) throw new Error("Kaynak yerel siteye ait değil.");
  return fetch(url, {
    redirect: "manual",
    headers: { "User-Agent": "Twitterbot" },
    signal: AbortSignal.timeout(20_000),
  });
}

function publicPath(pathname) {
  return (
    pathname === "/" ||
    (/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(pathname) &&
      !["api", "admin", "davet", "medya"].includes(pathname.split("/")[1]))
  );
}

function localPath(url) {
  const clean = url.pathname.replace(/\/$/, "") || "/";
  if (!publicPath(clean)) return null;
  if (!Array.from(url.searchParams.keys()).every((key) => key === "p"))
    return null;
  const page = url.searchParams.get("p");
  if (!page || page === "1") return clean;
  if (!/^[1-9][0-9]{0,2}$/.test(page)) return null;
  return clean + "/sayfa/" + page;
}

function relativePath(from, to) {
  const folder = from === "/" ? "." : from.slice(1);
  return posix.relative(folder, to.replace(/^\//, "") || ".") || ".";
}

function urlFor(value, source) {
  if (value.startsWith("#")) return null;
  try {
    return new URL(value, new URL(source, domain));
  } catch {
    return null;
  }
}

function sameSite(url) {
  return (
    url.origin === domain ||
    url.origin === origin ||
    url.hostname === "www.tuzgolusk.com"
  );
}

function addAsset(value, source) {
  const url = urlFor(value, source);
  if (!url || !sameSite(url)) return null;
  const path = url.pathname;
  let target = path;
  if (/^\/medya\/[a-f0-9]{48}\.webp$/.test(path)) {
    if (url.searchParams.has("small"))
      target = path.replace(/\.webp$/, "-small.webp");
  } else if (
    !/^\/_next\/static\/[A-Za-z0-9_./-]+\.(css|woff2?|ttf|otf|svg)$/i.test(
      path,
    ) ||
    path.split("/").some((piece) => piece && !/^[A-Za-z0-9_-]/.test(piece))
  ) {
    return null;
  }
  staticFiles.set(target, path + url.search);
  return target;
}

function removeInternalHref(element) {
  const link = element.attr("href");
  const url = link && urlFor(link, "/");
  if (url && sameSite(url) && /^\/(admin|api|davet)(\/|$)/.test(url.pathname)) {
    element.replaceWith(element.contents());
  }
}

async function render(source, path, allowed, queue) {
  const response = await fetchLocal(source);
  if (!response.ok) {
    throw new Error(`Sayfa alınamadı (${response.status}): ${source}`);
  }
  const $ = load(await response.text());
  if (!$(".public-site main").length) {
    throw new Error(`Ziyaretçi sayfası olmayan çıktı: ${source}`);
  }

  $("script").not('[type="application/ld+json"]').remove();
  $(
    'link[as="script"], link[rel="modulepreload"], template, .hero-controls, dialog.lightbox',
  ).remove();
  $("main form").remove();
  $("main p")
    .filter((_, element) => $(element).text().includes("Sayfa 15 saniyede bir"))
    .remove();
  $("*").each((_, element) => {
    for (const attribute of Object.keys(element.attribs || {})) {
      if (/^on/i.test(attribute)) $(element).removeAttr(attribute);
    }
  });

  $(".gallery-grid button").each((_, button) => {
    const href = $(button).find("img").attr("src");
    if (!href) return;
    const anchor = $("<a/>").attr({
      href,
      target: "_blank",
      rel: "noopener noreferrer",
    });
    anchor.append($(button).contents());
    $(button).replaceWith(anchor);
  });
  if (path === "/ara") {
    $("main").append(
      '<div class="wrap page-content stack"><form class="search-box" data-pages-search><label><span class="sr-only">Sitede ara</span><input name="q" type="search" placeholder="Sitede ara" maxlength="100"></label><button class="button" type="submit">Ara</button></form><div aria-live="polite" data-pages-results></div></div>',
    );
    $("body").append(
      $("<script/>").attr({
        src: relativePath(path, "/assets/search.js"),
        defer: "",
      }),
    );
  } else {
    const title =
      $("main h1").first().text().trim() || $("title").text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    if (title && !source.includes("?")) {
      searchResults.push({
        title,
        description,
        path: path === "/" ? "./" : path.slice(1) + "/",
      });
    }
  }

  $("a[href]").each((_, link) => {
    const anchor = $(link);
    const original = anchor.attr("href") || "";
    const url = urlFor(original, source);
    if (!url || !sameSite(url)) return;
    if (/^\/(admin|api|davet)(\/|$)/.test(url.pathname)) {
      removeInternalHref(anchor);
      return;
    }
    const asset = addAsset(original, source);
    if (asset) {
      anchor.attr("href", relativePath(path, asset));
      return;
    }
    const route = localPath(url);
    if (route && allowed.has(url.pathname.replace(/\/$/, "") || "/")) {
      if (url.search && route.includes("/sayfa/")) {
        queue.set(route, url.pathname + url.search);
      }
      anchor.attr("href", relativePath(path, route) + "/" + url.hash);
    }
  });

  $("img[src], source[src], link[href]").each((_, element) => {
    const tag = $(element);
    const attribute = element.tagName === "link" ? "href" : "src";
    const asset = addAsset(tag.attr(attribute) || "", source);
    if (asset) tag.attr(attribute, relativePath(path, asset));
  });
  $("[srcset]").each((_, element) => {
    const tag = $(element);
    const original = tag.attr("srcset") || "";
    const urls = original.split(",").map((item) => {
      const [value, size] = item.trim().split(/\s+/);
      const asset = addAsset(value, source);
      return [asset ? relativePath(path, asset) : value, size]
        .filter(Boolean)
        .join(" ");
    });
    tag.attr("srcset", urls.join(", "));
  });
  $('meta[property="og:image"], meta[name="twitter:image"]').each(
    (_, element) => {
      const tag = $(element);
      const asset = addAsset(tag.attr("content") || "", source);
      if (asset) tag.attr("content", domain + asset);
    },
  );
  $('link[rel="canonical"]').remove();
  const canonical = path.replace(/\/sayfa\/\d+$/, "");
  $("head").append(
    $("<link/>").attr({
      rel: "canonical",
      href: domain + (canonical === "/" ? "/" : canonical + "/"),
    }),
  );
  const name = path === "/" ? "index.html" : path.slice(1) + "/index.html";
  await write(name, $.html());
}

try {
  const port = await availablePort();
  origin = `http://127.0.0.1:${port}`;
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        SITE_URL: domain,
        INDEX_PUBLIC_SITE: "true",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "ignore", "inherit"],
    },
  );
  let healthy = false;
  for (let attempt = 0; attempt < 60 && server.exitCode === null; attempt++) {
    try {
      const response = await fetchLocal("/api/health");
      healthy = response.ok && (await response.json()).status === "ok";
    } catch {}
    if (healthy) break;
    await setTimeout(200);
  }
  if (!healthy) throw new Error("Yerel önizleme başlatılamadı.");
  const sitemap = await fetchLocal("/sitemap.xml");
  if (!sitemap.ok) throw new Error("Yayımlanmış sayfaların listesi alınamadı.");
  const xml = load(await sitemap.text(), { xml: true });
  const pages = xml("loc")
    .map((_, item) => new URL(xml(item).text()).pathname)
    .get();
  if (!pages.includes("/"))
    throw new Error("Site bakım modunda veya yayına hazır bir ana sayfa yok.");
  const allowed = new Set(
    [...pages, "/ara", "/kurumsal", "/gizlilik", "/kvkk"].filter(publicPath),
  );
  const queue = new Map([...allowed].map((path) => [path, path]));
  for (const [path, source] of queue) {
    if (queue.size > 2000) throw new Error("Statik sayfa sınırı aşıldı.");
    await render(source, path, allowed, queue);
  }
  for (const [target, source] of staticFiles) {
    const response = await fetchLocal(source);
    if (!response.ok)
      throw new Error(`Varlık alınamadı (${response.status}): ${source}`);
    if (
      target.endsWith(".webp") &&
      response.headers.get("content-type") !== "image/webp"
    ) {
      throw new Error(`Görsel WebP olarak sunulmadı: ${source}`);
    }
    await write(target.slice(1), Buffer.from(await response.arrayBuffer()));
  }
  await mkdir(join(stage, "assets"), { recursive: true });
  await copyFile(
    join(project, "scripts/pages/search.js"),
    join(stage, "assets/search.js"),
  );
  await write("assets/search.json", JSON.stringify(searchResults));
  await write(".nojekyll", "");
  await write("CNAME", "tuzgolusk.com\n");
  await write(
    "robots.txt",
    `User-agent: *\nDisallow: /ara/\nSitemap: ${domain}/sitemap.xml\n`,
  );
  await write(
    "sitemap.xml",
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      pages
        .filter(publicPath)
        .map(
          (path) =>
            `<url><loc>${domain}${path === "/" ? "/" : path + "/"}</loc></url>`,
        )
        .join("\n") +
      "\n</urlset>\n",
  );
  await write(
    "404.html",
    '<!doctype html><html lang="tr"><meta charset="utf-8"><title>Sayfa bulunamadı</title><h1>Sayfa bulunamadı</h1><a href="https://tuzgolusk.com/">Ana sayfaya dön</a></html>',
  );
  await rm(output, { recursive: true, force: true });
  await rename(stage, output);
  console.log(
    `${queue.size} ziyaretçi sayfası ve ${staticFiles.size} varlık hazır: ${output}`,
  );
} finally {
  server?.kill();
  await rm(stage, { recursive: true, force: true });
}
