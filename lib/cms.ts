import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";
import { catalog, publishStates, type Field, type Module } from "./catalog";
import { cleanRichText, safeUrl, visible, youtubeId } from "./content";
import { slugify } from "./format";
import { can, mutationActor } from "./auth";

type Scalar = string | number | boolean | Date | null;
export type Row = { id: string; [key: string]: Scalar };
type Delegate = {
  findMany(args: object): Promise<Row[]>;
  findUnique(args: object): Promise<Row | null>;
  count(args: object): Promise<number>;
  create(args: object): Promise<Row>;
  updateMany(args: object): Promise<{ count: number }>;
  delete(args: object): Promise<Row>;
};
export function delegate(client: Prisma.TransactionClient, model: string) {
  return (client as unknown as Record<string, Delegate>)[model];
}
export const idSchema = z.string().regex(/^[a-z0-9]{20,40}$/);
const istanbulDate = z
  .string()
  .regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d$/)
  .transform((value) => new Date(value + "+03:00"))
  .refine((date) => Number.isFinite(date.getTime()), "Geçerli tarih girin.");

function validateField(field: Field, value: FormDataEntryValue | null): Scalar {
  if (field.kind === "bool") return value === "on";
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    if (field.required || field.name === "mediaId")
      throw new Error(field.label + " zorunlu.");
    return null;
  }
  switch (field.kind) {
    case "int":
      return z.coerce
        .number()
        .int()
        .min(0)
        .max(field.max ?? 10000)
        .parse(raw);
    case "select":
      return z.enum(field.options!).parse(raw);
    case "date":
      return istanbulDate.parse(raw);
    case "ref":
    case "media":
      return idSchema.parse(raw);
    case "url":
      return safeUrl.parse(raw);
    case "video":
      if (!youtubeId(raw))
        throw new Error("Geçerli YouTube video adresi girin.");
      return raw;
    case "rich":
      return cleanRichText(z.string().max(100000).parse(raw));
    default:
      return z
        .string()
        .max(field.kind === "long" ? 5000 : 250)
        .parse(raw);
  }
}

function parse(schemaModule: Module, form: FormData) {
  const data: Record<string, Scalar> = {};
  for (const field of schemaModule.fields)
    data[field.name] = validateField(field, form.get(field.name));
  if (schemaModule.content) {
    data.title = z.string().trim().min(2).max(150).parse(form.get("title"));
    data.slug = z
      .string()
      .min(1)
      .max(140)
      .parse(slugify(String(form.get("slug") || data.title)));
    data.status = z.enum(publishStates).parse(form.get("status"));
    data.publishAt = validateField(
      { name: "publishAt", label: "Yayın", kind: "date" },
      form.get("publishAt"),
    );
    data.endAt = validateField(
      { name: "endAt", label: "Bitiş", kind: "date" },
      form.get("endAt"),
    );
    data.position = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(form.get("position") || 0);
    if (data.status === "SCHEDULED" && !data.publishAt)
      throw new Error("Zamanlı yayın için tarih gerekli.");
    if (data.publishAt && data.endAt && data.endAt <= data.publishAt)
      throw new Error("Bitiş, yayın tarihinden sonra olmalı.");
  }
  return data;
}
const transitions: Record<string, string[]> = {
  PLANNED: ["POSTPONED", "CANCELLED", "LIVE", "FINISHED", "AWARDED"],
  POSTPONED: ["PLANNED", "CANCELLED", "AWARDED"],
  CANCELLED: ["PLANNED", "AWARDED"],
  LIVE: ["HALF_TIME", "FINISHED", "POSTPONED", "CANCELLED", "AWARDED"],
  HALF_TIME: ["LIVE", "FINISHED", "POSTPONED", "CANCELLED", "AWARDED"],
  FINISHED: ["AWARDED"],
  AWARDED: ["FINISHED"],
};
const scoreStates = ["LIVE", "HALF_TIME", "FINISHED", "AWARDED"];
const publicationParents: Record<
  string,
  { model: string; field: string; key: string } | undefined
> = {
  albumImage: { model: "album", field: "albumId", key: "albumler" },
  newsImage: { model: "news", field: "newsId", key: "haberler" },
  newsTag: { model: "news", field: "newsId", key: "haberler" },
};

async function checkPublicationParents(
  tx: Prisma.TransactionClient,
  model: string,
  user: Awaited<ReturnType<typeof mutationActor>>,
  old: Row | null,
  next?: Record<string, Scalar>,
) {
  const parent = publicationParents[model];
  if (!parent) return null;
  const oldId = old?.[parent.field];
  const nextId = next?.[parent.field];
  const repo = delegate(tx, parent.model);
  const ids = [...new Set([oldId, nextId].filter(Boolean))];
  const records = await Promise.all(
    ids.map((id) => repo.findUnique({ where: { id } })),
  );
  if (
    !can(user, parent.key, "publish") &&
    records.some(
      (row) => row?.status === "PUBLISHED" || row?.status === "SCHEDULED",
    )
  )
    throw new Error(
      "Yayınlanan içeriğin bağlantılarını değiştirme yetkiniz yok.",
    );
  return records.find((row) => row?.id === nextId) ?? null;
}

async function validateRelationships(
  tx: Prisma.TransactionClient,
  schemaModule: Module,
  data: Record<string, Scalar>,
  old: Row | null,
) {
  for (const field of schemaModule.fields) {
    if (field.kind !== "ref" || !data[field.name]) continue;
    const linked = await delegate(tx, field.ref!).findUnique({
      where: { id: data[field.name] },
    });
    if (!linked || linked.deletedAt)
      throw new Error(field.label + " bağlantısı geçerli değil.");
  }
  if (schemaModule.model === "match") {
    const state = String(data.matchState);
    if (
      old &&
      old.matchState !== state &&
      !transitions[String(old.matchState)]?.includes(state)
    )
      throw new Error("Geçersiz maç durumu geçişi.");
    if (
      scoreStates.includes(state)
        ? data.clubScore === null || data.opponentScore === null
        : data.clubScore !== null || data.opponentScore !== null
    )
      throw new Error("Maç durumu ile skor alanları uyuşmuyor.");
    if (data.competitionSeasonId) {
      const team = await tx.teamSeason.findUniqueOrThrow({
        where: { id: String(data.teamSeasonId) },
      });
      const season = await tx.competitionSeason.findUniqueOrThrow({
        where: { id: String(data.competitionSeasonId) },
      });
      if (team.seasonId !== season.seasonId)
        throw new Error("Takım ve turnuva sezonları eşleşmiyor.");
    }
  }
  if (
    schemaModule.model === "season" &&
    new Date(String(data.endsAt)) <= new Date(String(data.startsAt))
  )
    throw new Error("Sezon bitişi başlangıçtan sonra olmalı.");
  if (schemaModule.model === "leagueResult" && data.homeId === data.awayId)
    throw new Error("İki farklı takım seçin.");
  if (schemaModule.model === "navigation" && data.parentId) {
    const seen = new Set([old?.id]);
    let parentId = String(data.parentId);
    while (parentId) {
      if (seen.has(parentId))
        throw new Error("Menü hiyerarşisinde döngü oluşuyor.");
      seen.add(parentId);
      const parent = await tx.navigation.findUniqueOrThrow({
        where: { id: parentId },
      });
      if (parent.area !== data.area || parent.deletedAt)
        throw new Error("Üst menü aynı alanda olmalı.");
      parentId = parent.parentId || "";
    }
  }
  if (
    schemaModule.model === "lineup" ||
    (schemaModule.model === "matchEvent" &&
      data.side === "CLUB" &&
      data.playerId)
  ) {
    const match = await tx.match.findUniqueOrThrow({
      where: { id: String(data.matchId) },
    });
    if (
      !(await tx.playerSeason.findUnique({
        where: {
          playerId_teamSeasonId: {
            playerId: String(data.playerId),
            teamSeasonId: match.teamSeasonId,
          },
        },
      }))
    )
      throw new Error("Oyuncunun maç sezonunda kaydı yok.");
    if (
      schemaModule.model === "lineup" &&
      data.starter &&
      (await tx.lineup.count({
        where: { matchId: match.id, starter: true, id: { not: old?.id ?? "" } },
      })) >= 11
    )
      throw new Error("İlk 11 dolu.");
  }
}

export async function saveRecord(
  moduleKey: string,
  id: string | null,
  form: FormData,
) {
  const schemaModule = catalog[moduleKey];
  if (!schemaModule) throw new Error("Modül bulunamadı.");
  const user = await mutationActor(moduleKey, id ? "update" : "create");
  const data = parse(schemaModule, form);
  const versioned = schemaModule.content || schemaModule.versioned;
  return db.$transaction(async (tx) => {
    const repo = delegate(tx, schemaModule.model);
    const old = id ? await repo.findUnique({ where: { id } }) : null;
    if (id && (!old || old.deletedAt)) throw new Error("Kayıt bulunamadı.");
    if (
      (old && ["PUBLISHED", "SCHEDULED"].includes(String(old.status))) ||
      ["PUBLISHED", "SCHEDULED"].includes(String(data.status))
    ) {
      if (!can(user, moduleKey, "publish"))
        throw new Error("Yayınlama yetkiniz yok.");
    }
    if (
      old?.status === "REVIEW" &&
      ["PUBLISHED", "SCHEDULED"].includes(String(data.status)) &&
      !can(user, moduleKey, "approve")
    )
      throw new Error("Onay yetkiniz yok.");
    await validateRelationships(tx, schemaModule, data, old);
    const publicationParent = await checkPublicationParents(
      tx,
      schemaModule.model,
      user,
      old,
      data,
    );
    if (schemaModule.content) {
      data.updatedBy = user.id;
      if (!old) data.createdBy = user.id;
    }
    const assetIds = schemaModule.fields
      .filter((f) => f.kind === "media")
      .map((f) => String(data[f.name] || ""))
      .filter(Boolean);
    const rich = schemaModule.fields
      .filter((f) => f.kind === "rich")
      .map((f) => String(data[f.name]));
    const keys = [
      ...new Set(
        rich.flatMap((html) =>
          Array.from(
            html.matchAll(/src="\/medya\/([a-f0-9]{48}\.webp)"/g),
            (m) => m[1],
          ),
        ),
      ),
    ];
    const assets = await tx.media.findMany({
      where: { OR: [{ id: { in: assetIds } }, { key: { in: keys } }] },
    });
    if (
      assetIds.some((i) => !assets.some((a) => a.id === i)) ||
      keys.some((k) => !assets.some((a) => a.key === k))
    )
      throw new Error("Medya dosyası bulunamadı.");
    if (
      assets.some(
        (a) =>
          !a.isPublic &&
          a.uploaderId !== user.id &&
          !can(user, "medya", "view"),
      )
    )
      throw new Error("Bu görseli kullanma yetkiniz yok.");
    let publishMedia =
      data.status === "PUBLISHED" &&
      (!data.publishAt || new Date(String(data.publishAt)) <= new Date());
    if (
      schemaModule.model === "albumImage" ||
      schemaModule.model === "newsImage"
    ) {
      publishMedia = Boolean(
        publicationParent?.status === "PUBLISHED" &&
        (!publicationParent.publishAt ||
          new Date(String(publicationParent.publishAt)) <= new Date()),
      );
    }
    if (schemaModule.model === "matchEvent") {
      data.requestKey = createHash("sha256")
        .update(
          JSON.stringify([
            data.matchId,
            data.minute,
            data.type,
            data.side,
            data.playerId,
            data.detail,
          ]),
        )
        .digest("hex");
      const existing = await tx.matchEvent.findUnique({
        where: {
          matchId_requestKey: {
            matchId: String(data.matchId),
            requestKey: String(data.requestKey),
          },
        },
      });
      if (existing && !old) return existing.id;
    }
    if (schemaModule.detail) {
      const collision = await tx.redirect.findUnique({
        where: { fromPath: schemaModule.detail + data.slug },
      });
      if (collision && collision.recordId !== id)
        throw new Error("Bu bağlantı önceki bir kayıt için ayrılmış.");
      if (collision) await tx.redirect.delete({ where: { id: collision.id } });
    }
    let record: Row;
    if (old) {
      const expected = Number(form.get("version"));
      if (versioned && expected !== old.version)
        throw new Error(
          "Kayıt başka bir kullanıcı tarafından değiştirildi. Sayfayı yenileyin.",
        );
      const where = { id: old.id, ...(versioned ? { version: expected } : {}) };
      if (versioned) data.version = expected + 1;
      if (!(await repo.updateMany({ where, data })).count)
        throw new Error("Kayıt değişti. Sayfayı yenileyin.");
      record = (await repo.findUnique({ where: { id: old.id } }))!;
      if (schemaModule.detail && old.slug !== record.slug) {
        const toPath = schemaModule.detail + record.slug;
        await tx.redirect.updateMany({
          where: { module: moduleKey, recordId: old.id },
          data: { toPath },
        });
        await tx.redirect.create({
          data: {
            fromPath: schemaModule.detail + old.slug,
            toPath,
            module: moduleKey,
            recordId: old.id,
          },
        });
      }
    } else record = await repo.create({ data });
    if (publishMedia) {
      if (schemaModule.model === "album")
        assetIds.push(
          ...(
            await tx.albumImage.findMany({ where: { albumId: record.id } })
          ).map((i) => i.mediaId),
        );
      if (schemaModule.model === "news")
        assetIds.push(
          ...(
            await tx.newsImage.findMany({ where: { newsId: record.id } })
          ).map((i) => i.mediaId),
        );
      await tx.media.updateMany({
        where: { OR: [{ id: { in: assetIds } }, { key: { in: keys } }] },
        data: { isPublic: true },
      });
    }
    if (versioned)
      await tx.revision.create({
        data: {
          module: moduleKey,
          recordId: record.id,
          number: Number(record.version),
          snapshot: JSON.parse(JSON.stringify(record)),
          actorId: user.id,
        },
      });
    await tx.audit.create({
      data: {
        module: moduleKey,
        action: old ? "update" : "create",
        recordId: record.id,
        actorId: user.id,
      },
    });
    return record.id;
  });
}

export async function removeRecord(key: string, id: string, version: number) {
  const schemaModule = catalog[key];
  const user = await mutationActor(key, "delete");
  await db.$transaction(async (tx) => {
    const repo = delegate(tx, schemaModule.model);
    const item = await repo.findUnique({ where: { id } });
    if (!item) throw new Error("Kayıt bulunamadı.");
    if (schemaModule.content) {
      if (
        ["PUBLISHED", "SCHEDULED"].includes(String(item.status)) &&
        !can(user, key, "publish")
      )
        throw new Error("Yayındaki kayıt için yayın izni gerekli.");
      if (
        !(
          await repo.updateMany({
            where: { id, version, deletedAt: null },
            data: {
              deletedAt: new Date(),
              version: version + 1,
              updatedBy: user.id,
            },
          })
        ).count
      )
        throw new Error("Kayıt değişti veya bulunamadı.");
    } else {
      await checkPublicationParents(tx, schemaModule.model, user, item);
      await repo.delete({ where: { id } });
    }
    await tx.audit.create({
      data: { actorId: user.id, module: key, action: "delete", recordId: id },
    });
  });
}
export async function optionsFor(
  schemaModule: Module,
  user: NonNullable<Awaited<ReturnType<typeof mutationActor>>>,
  record?: Row | null,
) {
  const models = [
    ...new Set(
      schemaModule.fields.flatMap((f) =>
        f.ref ? [f.ref] : f.kind === "rich" ? ["media"] : [],
      ),
    ),
  ];
  const opts = await Promise.all(
    models.map(async (model) => {
      if (model === "media") {
        const where = can(user, "medya", "view")
          ? {}
          : { OR: [{ uploaderId: user.id }, { isPublic: true }] };
        const existingIds = schemaModule.fields
          .filter((field) => field.kind === "media")
          .map((field) => record?.[field.name])
          .filter((value): value is string => typeof value === "string");
        const [recent, existing] = await Promise.all([
          db.media.findMany({
            where,
            take: 200,
            orderBy: { createdAt: "desc" },
          }),
          existingIds.length
            ? db.media.findMany({
                where: { ...where, id: { in: existingIds } },
              })
            : [],
        ]);
        return [
          model,
          [
            ...new Map(
              [...recent, ...existing].map((asset) => [asset.id, asset]),
            ).values(),
          ].map((x) => ({ id: x.id, label: x.alt, key: x.key })),
        ] as const;
      }
      if (model === "teamSeason")
        return [
          model,
          (
            await db.teamSeason.findMany({
              take: 500,
              include: { team: true, season: true },
            })
          ).map((x) => ({
            id: x.id,
            label: x.team.title + " / " + x.season.title,
          })),
        ] as const;
      if (model === "competitionSeason")
        return [
          model,
          (
            await db.competitionSeason.findMany({
              take: 500,
              include: { competition: true, season: true },
            })
          ).map((x) => ({
            id: x.id,
            label: x.competition.title + " / " + x.season.title,
          })),
        ] as const;
      const key =
        Object.keys(catalog).find((key) => catalog[key].model === model) || "";
      const rows = await delegate(db, model).findMany({
        where: can(user, key, "view") ? { deletedAt: null } : visible(),
        orderBy: { title: "asc" },
        take: 500,
      });
      return [
        model,
        rows.map((row) => ({ id: row.id, label: String(row.title) })),
      ] as const;
    }),
  );
  return Object.fromEntries(opts) as Record<
    string,
    { id: string; label: string; key?: string }[]
  >;
}
export const matchInclude = {
  teamSeason: { include: { team: { include: { logo: true } }, season: true } },
  opponent: { include: { logo: true } },
  competitionSeason: { include: { competition: true } },
  stadium: true,
} as const;
