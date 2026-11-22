import "dotenv/config";
import { db } from "../lib/db";
import { roles } from "../lib/access";
import { defaultLayout, defaultNav, defaultTheme } from "../lib/site-settings";
import { slugify } from "../lib/format";

try {
  await db.$transaction(async (tx) => {
    for (const role of roles)
      await tx.role.upsert({
        where: { key: role.key },
        create: role,
        update: {},
      });
    await tx.siteSetting.upsert({
      where: { key: "theme" },
      create: { key: "theme", data: defaultTheme },
      update: {},
    });
    await tx.homeLayout.upsert({
      where: { key: "home" },
      create: { key: "home", draft: defaultLayout, published: defaultLayout },
      update: {},
    });
    async function nav(
      title: string,
      url: string,
      position: number,
      area: string,
      parentId?: string,
    ) {
      const slug = slugify([area, parentId || "", title].join("-"));
      return tx.navigation.upsert({
        where: { slug },
        create: {
          slug,
          title,
          url,
          position,
          area,
          parentId,
          status: "PUBLISHED",
        },
        update: {},
      });
    }
    // Initialize the navigation once. Subsequent runs preserve editors' changes.
    if (
      !(await tx.siteSetting.findUnique({
        where: { key: "navigation-initialized" },
      }))
    ) {
      for (const [position, item] of defaultNav.entries()) {
        const parent = await nav(item.title, item.url, position, "HEADER");
        for (const [index, child] of item.items.entries())
          await nav(child.title, child.url, index, "HEADER", parent.id);
      }
      const footer = [
        ["Haberler", "/haberler"],
        ["Fikstür", "/fikstur"],
        ["İletişim", "/iletisim"],
        ["Gizlilik", "/gizlilik"],
        ["KVKK", "/kvkk"],
      ];
      for (const [position, [title, url]] of footer.entries())
        await nav(title, url, position, "FOOTER");
      await tx.siteSetting.create({
        data: { key: "navigation-initialized", data: true },
      });
    }
  });
  console.log("Roller, tema, menü ve sayfa düzeni hazır.");
} finally {
  await db.$disconnect();
}
