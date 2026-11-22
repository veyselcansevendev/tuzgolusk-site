"use client";
import { useActionState, useState } from "react";
import type { defaultTheme } from "@/lib/site-settings";
import { saveTheme } from "./actions";
import { Upload } from "@/components/admin-form";

const fields = {
  name: "Resmî kulüp adı",
  shortName: "Kısa ad",
  slogan: "Slogan",
  description: "Varsayılan SEO açıklaması",
  address: "Adres",
  phone: "Telefon",
  email: "E-posta",
  map: "Harita bağlantısı",
  footerText: "Alt bilgi / telif metni",
  maintenanceText: "Bakım mesajı",
} as const;
const media = {
  logoId: "Ana logo",
  alternateId: "Koyu zemin logosu",
  ogId: "Paylaşım görseli",
  heroId: "Ana sayfa kapak görseli",
  faviconId: "Site simgesi",
} as const;
const colors = {
  primary: "Ana renk",
  primaryText: "Ana zemin metni",
  accent: "Vurgu rengi",
  surface: "Sayfa zemini",
  text: "Sayfa metni",
} as const;

export function ThemeForm({
  theme,
  version,
  assets,
  edit,
  upload,
  superAdmin,
}: {
  theme: typeof defaultTheme;
  version: number;
  assets: { id: string; key: string; alt: string }[];
  edit: boolean;
  upload: boolean;
  superAdmin: boolean;
}) {
  const [notice, action, busy] = useActionState(saveTheme, "");
  const [items, setItems] = useState(assets);
  const [values, setValues] = useState(theme);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="version" value={version} />
      <fieldset className="stack" disabled={!edit}>
        <legend>Kulüp ve iletişim</legend>
        <div className="form-grid">
          {Object.entries(fields).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                defaultValue={String(theme[key as keyof typeof fields])}
                required={key === "name" || key === "shortName"}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="stack" disabled={!edit}>
        <legend>Görsel kimlik</legend>
        <div className="form-grid">
          {Object.entries(media).map(([key, label]) => (
            <label key={key}>
              {label}
              <select
                name={key}
                defaultValue={theme[key as keyof typeof media]}
              >
                <option value="">Seçin</option>
                {items.map((i) => (
                  <option value={i.id} key={i.id}>
                    {i.alt}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {upload && edit && (
          <Upload
            onUpload={(a) =>
              setItems((x) => [
                { id: a.id, key: a.key || "", alt: a.label },
                ...x,
              ])
            }
          />
        )}
      </fieldset>
      <fieldset className="stack" disabled={!edit}>
        <legend>Renk ve tipografi</legend>
        <div className="form-grid">
          {Object.entries(colors).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="color"
                name={key}
                value={values[key as keyof typeof colors]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>
        <div className="form-grid">
          <label>
            Yazı tipi
            <select name="font" defaultValue={theme.font}>
              <option value="system">Sistem</option>
              <option value="serif">Serif</option>
              <option value="condensed">Sıkı başlık</option>
            </select>
          </label>
          <label>
            Köşe biçimi
            <select name="radius" defaultValue={theme.radius}>
              <option value="none">Düz</option>
              <option value="soft">Yumuşak</option>
              <option value="rounded">Yuvarlak</option>
            </select>
          </label>
          <label>
            Üst menü
            <select name="header" defaultValue={theme.header}>
              <option value="light">Açık</option>
              <option value="dark">Koyu</option>
            </select>
          </label>
          <label>
            Alt menü
            <select name="footer" defaultValue={theme.footer}>
              <option value="light">Açık</option>
              <option value="dark">Koyu</option>
            </select>
          </label>
        </div>
        <div
          className="panel"
          style={{ background: values.primary, color: values.primaryText }}
        >
          {theme.name}
        </div>
        <div
          className="panel"
          style={{ background: values.surface, color: values.text }}
        >
          İçerik önizlemesi
        </div>
      </fieldset>
      {superAdmin ? (
        <label className="check">
          <input
            type="checkbox"
            name="maintenance"
            defaultChecked={theme.maintenance}
          />
          Bakım modu
        </label>
      ) : (
        theme.maintenance && (
          <input type="hidden" name="maintenance" value="on" />
        )
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {edit && (
        <button className="button" disabled={busy}>
          Kaydet
        </button>
      )}
    </form>
  );
}
