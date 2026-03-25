import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

// ─── Settings ────────────────────────────────────────────────────────
const DEFAULTS: Record<string, any> = {
    embedColor: 6513919,
    footerText: "TikTok",
    showFooter: true,
    showAuthor: true,
    showStats: true,
    sensitiveMode: "normal",
};

function cfg(k: string): any {
    try {
        const v = (storage as any)[k];
        return v !== undefined ? v : DEFAULTS[k];
    } catch {
        return DEFAULTS[k];
    }
}

// ─── Domain detection ────────────────────────────────────────────────
const TIKTOK_HOSTS = [
    "tiktok.com", "www.tiktok.com",
    "vt.tiktok.com", "vm.tiktok.com", "m.tiktok.com",
];

function isTikTokUrl(url: string): boolean {
    try {
        return TIKTOK_HOSTS.some((d) => new URL(url).hostname === d);
    } catch { return false; }
}

function isTikTokEmbed(e: any): boolean {
    const url = e.rawUrl || e.url || "";
    const prov = (e.provider?.name || "").toLowerCase();
    return isTikTokUrl(url) || prov === "tiktok";
}

// ─── Detection ───────────────────────────────────────────────────────
function isSensitive(e: any): boolean {
    // Zero-dimension video = TikTok's age-restriction marker
    if (e.video && e.video.width === 0 && e.video.height === 0) return true;
    const t = (e.title || "").toLowerCase();
    // These phrases only appear in TikTok's sensitive/blocked embed titles
    if (t.includes("зайди в tiktok")) return true;
    if (t.includes("sensitive content")) return true;
    // Generic TikTok logo thumbnail = blocked
    if ((e.thumbnail?.url || "").includes("tiktok-logo")) return true;
    return false;
}

function isPhoto(url: string): boolean {
    return /\/photo\/\d+/.test(url);
}

// ─── Parsers ─────────────────────────────────────────────────────────
function getName(title?: string): string | null {
    if (!title) return null;
    const m = title.match(/TikTok\s*[·•\-–]\s*(.+)/i);
    return m ? m[1].trim() : null;
}

function getHandle(url?: string): string | null {
    if (!url) return null;
    const m = url.match(/@([^/?&#]+)/);
    return m ? `@${m[1]}` : null;
}

/** Escape dots for Discord markdown */
function esc(s: string): string {
    return s.replace(/\./g, "\\.");
}

function parseDesc(d?: string): { likes?: string; comments?: string; caption?: string } {
    if (!d) return {};
    const r: any = {};
    const cm = d.match(/[«\u201C\u201E](.+?)[»\u201D\u201F]/);
    if (cm) r.caption = cm[1];
    const nums = d.match(/\d[\d.,]*\s*[KkMmкК]?/g);
    if (nums) {
        const c = nums.map((n) => n.trim()).filter(Boolean);
        if (c[0]) r.likes = c[0];
        if (c[1]) r.comments = c[1];
    }
    return r;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function mkAuthor(title?: string, url?: string): any | undefined {
    if (!cfg("showAuthor")) return undefined;
    const n = getName(title), h = getHandle(url);
    return {
        name: n && h ? `${n} (${h})` : n || h || "TikTok",
        url: h ? `https://tiktok.com/${h}` : url || "https://tiktok.com",
    };
}

function mkStats(s: { likes?: string; comments?: string }): string | undefined {
    if (!cfg("showStats") || (!s.likes && !s.comments)) return undefined;
    const l = s.likes ? esc(s.likes) : "?";
    const c = s.comments ? esc(s.comments) : "?";
    return `**❤️ ${l} 💬 ${c}**`;
}

function mkFooter(extra?: string): any | undefined {
    if (!cfg("showFooter")) return undefined;
    const base = cfg("footerText") || "TikTok";
    return { text: extra ? `${base} • ${extra}` : base };
}

function cpThumb(t: any): any | undefined {
    if (!t?.url) return undefined;
    return {
        url: t.url,
        proxy_url: t.proxy_url || t.proxyURL,
        proxyURL: t.proxyURL || t.proxy_url,
        width: t.width || 720,
        height: t.height || 1280,
        content_type: t.content_type || "image/jpeg",
    };
}

function cpVideo(v: any): any | undefined {
    if (!v?.url) return undefined;
    return {
        url: v.url,
        proxy_url: v.proxy_url || v.proxyURL,
        proxyURL: v.proxyURL || v.proxy_url,
        width: v.width || 720,
        height: v.height || 1280,
        content_type: v.content_type || "video/mp4",
    };
}

// ─── Build: Video (tnktok style) ─────────────────────────────────────
function buildVideo(e: any): any {
    const url = e.rawUrl || e.url;
    const stats = parseDesc(e.description);

    const result: any = {
        type: "rich",
        url: url,
        color: cfg("embedColor"),
    };

    // Author
    const author = mkAuthor(e.title, url);
    if (author) result.author = author;

    // Stats description
    const sl = mkStats(stats);
    if (sl) result.description = sl;

    // Thumbnail (cover poster)
    const thumb = cpThumb(e.thumbnail);
    if (thumb) result.thumbnail = thumb;

    // Video player
    const video = cpVideo(e.video);
    if (video) result.video = video;

    // Footer
    const footer = mkFooter();
    if (footer) result.footer = footer;

    return result;
}

// ─── Build: Photo (tnktok style + count in footer) ──────────────────
function buildPhoto(e: any): any {
    const url = e.rawUrl || e.url;
    const stats = parseDesc(e.description);

    const parts: string[] = [];
    if (stats.caption) parts.push(`**${stats.caption}**`);
    const sl = mkStats(stats);
    if (sl) parts.push(sl);

    const result: any = {
        type: "rich",
        url: url,
        color: cfg("embedColor"),
    };

    // Author
    const author = mkAuthor(e.title, url);
    if (author) result.author = author;

    // Description (caption + stats)
    if (parts.length) result.description = parts.join("\n\n");

    // Use thumbnail as full-width image
    if (e.thumbnail) {
        result.image = {
            url: e.thumbnail.url,
            proxy_url: e.thumbnail.proxy_url || e.thumbnail.proxyURL,
            proxyURL: e.thumbnail.proxyURL || e.thumbnail.proxy_url,
            width: e.thumbnail.width || 1080,
            height: e.thumbnail.height || 1920,
            content_type: e.thumbnail.content_type || "image/jpeg",
        };
    }

    // Footer with photo indicator
    const footer = mkFooter("📷 Photo");
    if (footer) result.footer = footer;

    return result;
}

// ─── Build: Sensitive → normal video with marker ─────────────────────
function buildSensitiveNormal(e: any): any {
    const url = e.rawUrl || e.url;

    const result: any = {
        type: "rich",
        url: url,
        color: cfg("embedColor"),
        description: "**⚠️ Sensitive Content**",
    };

    // Author
    if (cfg("showAuthor")) {
        const h = getHandle(url);
        result.author = {
            name: h || "TikTok",
            url: h ? `https://tiktok.com/${h}` : url,
        };
    }

    // Force video with real dimensions (TikTok sends 0×0 for sensitive)
    if (e.video && e.video.url) {
        result.video = {
            url: e.video.url,
            proxy_url: e.video.proxy_url || e.video.proxyURL,
            proxyURL: e.video.proxyURL || e.video.proxy_url,
            width: 720,
            height: 1280,
        };
    }

    // Thumbnail (skip if it's the generic TikTok logo)
    if (e.thumbnail && e.thumbnail.url && !e.thumbnail.url.includes("tiktok-logo")) {
        result.thumbnail = cpThumb(e.thumbnail);
    }

    const footer = mkFooter("18+");
    if (footer) result.footer = footer;
    return result;
}

function buildSensitiveWarn(e: any): any {
    const result: any = {
        type: "rich",
        url: e.rawUrl || e.url,
        title: "⚠️ Sensitive Content",
        description: "This video is age-restricted by TikTok.\nVisit TikTok directly to view it.",
        color: 16237824,
    };
    const footer = mkFooter("18+");
    if (footer) result.footer = footer;
    return result;
}

// ─── Transform ───────────────────────────────────────────────────────
function transform(e: any): any | null {
    if (!isTikTokEmbed(e)) return e;

    if (isSensitive(e)) {
        let mode: string;
        try { mode = cfg("sensitiveMode") as string; } catch { mode = "normal"; }
        if (mode === "hide") return null;
        if (mode === "warn") return buildSensitiveWarn(e);
        return buildSensitiveNormal(e);
    }

    const url = e.rawUrl || e.url || "";
    return isPhoto(url) ? buildPhoto(e) : buildVideo(e);
}

function patchEmbeds(msg: any) {
    try {
        if (!msg || !msg.embeds || !msg.embeds.length) return;

        const out: any[] = [];
        for (let i = 0; i < msg.embeds.length; i++) {
            try {
                const r = transform(msg.embeds[i]);
                if (r !== null) out.push(r);
            } catch {
                // If a single embed fails, keep the original
                out.push(msg.embeds[i]);
            }
        }
        msg.embeds = out;
    } catch {
        // Safety net: never break Discord
    }
}

// ─── Lifecycle ───────────────────────────────────────────────────────
let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        patches.push(
            before("dispatch", FluxDispatcher, ([ev]) => {
                try {
                    if (ev.type === "MESSAGE_CREATE" || ev.type === "MESSAGE_UPDATE") {
                        if (ev.message) patchEmbeds(ev.message);
                    }
                    if (ev.type === "LOAD_MESSAGES_SUCCESS" && Array.isArray(ev.messages)) {
                        for (const m of ev.messages) patchEmbeds(m);
                    }
                } catch {
                    // Never crash the dispatcher
                }
            })
        );
    },
    onUnload: () => { for (const u of patches) u(); patches = []; },
    settings: Settings,
};