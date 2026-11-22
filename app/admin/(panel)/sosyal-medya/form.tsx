"use client";
import { useActionState, useState } from "react";
import { platforms, socialStates, socialPayload } from "@/lib/social";
import { savePost } from "./actions";
import { FormStatus, Upload } from "@/components/admin-form";
import { Photo } from "@/components/site";

type Asset = {
  id: string;
  key: string;
  alt: string;
  width: number;
  height: number;
};
type Seed = {
  id: string;
  version: number;
  title: string;
  caption: string;
  hashtags: string;
  platform: string;
  state: string;
  scheduledAt: string;
  matchId: string | null;
  newsId: string | null;
  isTemplate: boolean;
};
type Option = { id: string; title: string };
export function SocialForm({
  post,
  assets: selectedAssets,
  selectedIds,
  news,
  matches,
  templates,
  edit,
  approve,
  publish,
  upload,
}: {
  post: Seed | null;
  assets: Asset[];
  selectedIds: string[];
  news: Option[];
  matches: Option[];
  templates: { id: string; title: string; caption: string; hashtags: string }[];
  edit: boolean;
  approve: boolean;
  publish: boolean;
  upload: boolean;
}) {
  const [assets, setAssets] = useState(selectedAssets);
  const [selected, setSelected] = useState(selectedIds);
  const [caption, setCaption] = useState(post?.caption || "");
  const [hashtags, setTags] = useState(post?.hashtags || "");
  const [platform, setPlatform] = useState<keyof typeof platforms>(
    (post?.platform || "IG_POST") as keyof typeof platforms,
  );
  const [status, setStatus] = useState(post?.state || "DRAFT");
  const [notice, setNotice] = useState("");
  const [message, action, busy] = useActionState(
    savePost.bind(null, post?.id || null),
    "",
  );
  const active = platforms[platform];
  const payload = socialPayload(caption, hashtags);
  const count = Array.from(payload).length;
  const previews = assets.filter((a) => selected.includes(a.id));
  return (
    <form action={action} className="panel stack">
      <h2>{post ? "Paylaşım ayrıntısı" : "Yeni paylaşım taslağı"}</h2>
      <input type="hidden" name="version" value={post?.version || 0} />
      {selected.map((id) => (
        <input type="hidden" name="assets" value={id} key={id} />
      ))}
      <fieldset disabled={!edit} className="stack">
        <legend>İçerik ve onay</legend>
        <div className="form-grid">
          <label>
            Başlık
            <input
              name="title"
              defaultValue={post?.title || ""}
              maxLength={150}
              required
            />
          </label>
          <label>
            Platform
            <select
              aria-label="Platform"
              name="platform"
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as keyof typeof platforms)
              }
            >
              {Object.entries(platforms).map(([k, x]) => (
                <option key={k} value={k}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Planlanan saat (İstanbul)
            <input
              type="datetime-local"
              name="scheduledAt"
              defaultValue={post?.scheduledAt || ""}
            />
          </label>
          <label>
            Durum
            <select
              aria-label="Durum"
              name="state"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {Object.entries(socialStates)
                .filter(([key]) =>
                  key === "APPROVED"
                    ? approve || status === key
                    : key === "POSTED"
                      ? publish || status === key
                      : true,
                )
                .map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          {templates.length > 0 && (
            <label>
              Metin şablonu
              <select
                defaultValue=""
                onChange={(e) => {
                  const x = templates.find((t) => t.id === e.target.value);
                  if (x) {
                    setCaption(x.caption);
                    setTags(x.hashtags);
                  }
                }}
              >
                <option value="">Seçin</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            İlgili haber
            <select name="newsId" defaultValue={post?.newsId || ""}>
              <option value="">Seçin</option>
              {news.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            İlgili maç
            <select name="matchId" defaultValue={post?.matchId || ""}>
              <option value="">Seçin</option>
              {matches.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Açıklama
          <textarea
            name="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={65000}
            rows={5}
          />
        </label>
        <label>
          Hashtag
          <textarea
            name="hashtags"
            value={hashtags}
            onChange={(e) => setTags(e.target.value)}
            maxLength={5000}
            rows={2}
          />
        </label>
        <p className={count > active.limit ? "form-message" : "muted"}>
          {count} / {active.limit} karakter
          {count > active.limit ? " · Platform sınırını aşıyor." : ""}
        </p>
        <label className="check">
          <input
            type="checkbox"
            name="template"
            defaultChecked={post?.isTemplate}
          />
          Metin şablonu olarak kaydet
        </label>
        {status === "POSTED" && post?.state !== "POSTED" && (
          <label className="check">
            <input type="checkbox" name="confirm" required />
            Bu içeriği seçilen platformda elle paylaştım.
          </label>
        )}
        <label>
          WebP görsel ekle
          <select
            value=""
            onChange={(e) => {
              if (e.target.value)
                setSelected((ids) => [...new Set([...ids, e.target.value])]);
            }}
          >
            <option value="">Görsel seçin</option>
            {assets
              .filter((a) => !selected.includes(a.id))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alt}
                </option>
              ))}
          </select>
        </label>
        {upload && (
          <Upload
            onUpload={(a) => {
              setAssets((x) => [
                {
                  id: a.id,
                  key: a.key || "",
                  alt: a.label,
                  width: 0,
                  height: 0,
                },
                ...x,
              ]);
              setSelected((x) => [...x, a.id]);
            }}
          />
        )}
      </fieldset>
      <div className="actions">
        <button
          type="button"
          className="small-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(payload);
              setNotice("Açıklama ve hashtag kopyalandı.");
            } catch {
              setNotice("Tarayıcı panoya erişemedi. Metni seçerek kopyalayın.");
            }
          }}
        >
          Metni kopyala
        </button>
        {edit && (
          <FormStatus message={message} busy={busy} label="Taslağı kaydet" />
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      {previews.length > 0 && (
        <>
          <h3>{active.label} önizlemesi</h3>
          <p>
            Önerilen ölçü {active.width} × {active.height} piksel
          </p>
          <div className="card-grid">
            {previews.map((a) => (
              <article key={a.id} className="stack">
                <div
                  className="social-preview"
                  style={{ aspectRatio: active.width + "/" + active.height }}
                >
                  <Photo asset={a} />
                </div>
                <span>
                  {a.alt}
                  {a.width ? " · " + a.width + " × " + a.height : ""}
                </span>
                {a.width > 0 &&
                  Math.abs(a.width / a.height - active.width / active.height) >
                    0.13 && (
                    <p className="muted">Görsel oranı önizlemeden farklı.</p>
                  )}
                <div className="actions">
                  <a download className="text-link" href={"/medya/" + a.key}>
                    WebP indir
                  </a>
                  {edit && (
                    <button
                      className="small-button"
                      type="button"
                      onClick={() =>
                        setSelected((ids) => ids.filter((id) => id !== a.id))
                      }
                    >
                      Kaldır
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {payload && <p className="whitespace-pre-wrap">{payload}</p>}
    </form>
  );
}
