(() => {
  const form = document.querySelector("[data-pages-search]");
  const results = document.querySelector("[data-pages-results]");
  if (!form || !results || !document.currentScript) return;
  const indexUrl = new URL("search.json", document.currentScript.src);
  let index;
  const normalize = (text) => text.toLocaleLowerCase("tr-TR").normalize("NFC");

  async function search() {
    const terms = normalize(form.elements.q.value.trim())
      .split(/\s+/)
      .filter(Boolean);
    results.replaceChildren();
    if (!terms.length) return;
    try {
      index ??= await fetch(indexUrl).then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      });
      const matches = index
        .filter((entry) => {
          const text = normalize(entry.title + " " + entry.description);
          return terms.every((term) => text.includes(term));
        })
        .slice(0, 30);
      if (!matches.length) {
        results.textContent = "Aramana uyan sonuç bulunamadı.";
        return;
      }
      const list = document.createElement("ul");
      list.className = "link-list";
      for (const entry of matches) {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = new URL("../" + entry.path, indexUrl).href;
        link.textContent = entry.title;
        item.append(link);
        list.append(item);
      }
      results.append(list);
    } catch {
      results.textContent = "Arama şu anda kullanılamıyor.";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void search();
  });
  form.elements.q.value = new URL(location.href).searchParams.get("q") || "";
  void search();
})();
