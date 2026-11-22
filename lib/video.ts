export function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const id =
      url.hostname === "youtu.be"
        ? url.pathname.slice(1)
        : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
              url.hostname,
            )
          ? url.searchParams.get("v")
          : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
