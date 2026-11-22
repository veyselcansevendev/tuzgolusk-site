import sanitize from "sanitize-html";
import { z } from "zod";

export { visible, isVisible } from "./publication";
export const safeUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    if (/^\/(?!\/)[^\\\s]*$/.test(value)) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Geçerli bir HTTPS adresi veya site yolu girin.");
export { youtubeId } from "./video";
export const cleanRichText = (html: string) =>
  sanitize(html, {
    allowedTags: [
      "p",
      "br",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "a",
      "img",
      "figure",
      "figcaption",
      "iframe",
    ],
    allowedAttributes: {
      a: ["href", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      iframe: ["src", "title", "loading", "allowfullscreen"],
    },
    allowedSchemes: ["https"],
    allowProtocolRelative: false,
    allowedIframeHostnames: ["www.youtube-nocookie.com"],
    transformTags: {
      a: (_, attrs) => ({
        tagName: "a",
        attribs: {
          href: safeUrl.safeParse(attrs.href).success ? attrs.href : "",
          rel: "noopener noreferrer",
        },
      }),
      iframe: (_, attrs) => ({
        tagName: "iframe",
        attribs: {
          src: /^https:\/\/www\.youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]{11}$/.test(
            attrs.src || "",
          )
            ? attrs.src
            : "",
          title: (attrs.title || "YouTube videosu").slice(0, 150),
          loading: "lazy",
          allowfullscreen: "",
        },
      }),
      img: (_, attrs) => ({
        tagName: "img",
        attribs: {
          ...attrs,
          src: /^\/medya\/[a-f0-9]{48}\.webp$/.test(attrs.src || "")
            ? attrs.src
            : "",
          loading: "lazy",
        },
      }),
    },
    exclusiveFilter: (frame) =>
      ["img", "iframe"].includes(frame.tag) && !frame.attribs.src,
  });
