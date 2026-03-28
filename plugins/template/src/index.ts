import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

// ─── Default Settings ────────────────────────────────────────────────
export const DEFAULTS: Record<string, any> = {
    pluginName: "fxTikTok",
    embedColor: 0x638DFF,
    maxDescLength: 150,
    videoDescLine: "❤️ {likes} 💬 {comments} 🔁 {shares}",
    photoDescLine: "❤️ {likes} 💬 {comments} 🔁 {shares}",
    sensitiveTitle: "⚠️ Sensitive Content",
    sensitiveDesc:
        "Sorry, we were unable to show this video due to the video being age-restricted. If you would like to view the video, please visit TikTok directly.",
    enableVideo: true,
    enablePhoto: true,
    enableSensitive: true,
    sensitiveBypass: false,
};

function cfg(k: string): any {
    try {
        const v = (storage as any)[k];
        return v !== undefined && v !== null && v !== "" ? v : DEFAULTS[k];
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
    try { return TIKTOK_HOSTS.some(d => new URL(url).hostname === d); }
    catch { return false; }
}

function isTikTokEmbed(e: any): boolean {
    const url = e.rawUrl || e.url || "";
    const prov = (e.provider?.name || "").toLowerCase();
    return isTikTokUrl(url) || prov === "tiktok";
}

// ─── Detection helpers ───────────────────────────────────────────────
function isSensitive(e: any): boolean {
    if (e.video && e.video.width === 0 && e.video.height === 0) return true;
    const t = (e.title || "").toLowerCase();
    if (t.includes("sensitive content")) return true;
    if (t.includes("зайди в tiktok")) return true;
    if ((e.thumbnail?.url || "").includes("tiktok-logo")) return true;
    return false;
}

function isPhotoUrl(url: string): boolean {
    return /\/photo\/\d+/.test(url);
}

// ─── Parsers (from original TikTok embed data) ──────────────────────
function parseName(title?: string): string | null {
    if (!title) return null;
    const m = title.match(/TikTok\s*[·•\-–]\s*(.+)/i);
    return m ? m[1].trim() : null;
}

function parseHandle(url?: string): string | null {
    if (!url) return null;
    const m = url.match(/@([^/?&#]+)/);
    return m ? `@${m[1]}` : null;
}

function parseBasicStats(desc?: string): { likes?: string; comments?: string } {
    if (!desc) return {};
    const nums = desc.match(/\d[\d.,]*\s*[KkMmBb]?/g);
    if (!nums) return {};
    const c = nums.map(n => n.trim()).filter(Boolean);
    return { likes: c[0], comments: c[1] };
}

// ─── Format helpers ──────────────────────────────────────────────────
function fmtCount(v: number | null | undefined): string {
    if (v === null || v === undefined) return "0";
    if (v >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(v);
}

function fmtDate(publish: any): string {
    if (!publish) return "";
    const raw = publish.iso || (publish.unix ? publish.unix * 1000 : null);
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncDesc(text: string | null | undefined, max: number): string {
    if (!text) return "";
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "...";
}

function replaceTags(template: string, data: any): string {
    const stats = data.stats || {};
    const author = data.author || {};
    const desc = truncDesc(data.description, cfg("maxDescLength"));
    return template
        .replace(/\{likes\}/g, fmtCount(stats.likes))
        .replace(/\{comments\}/g, fmtCount(stats.comments))
        .replace(/\{shares\}/g, fmtCount(stats.shares))
        .replace(/\{views\}/g, fmtCount(stats.views))
        .replace(/\{saves\}/g, fmtCount(stats.saves))
        .replace(/\{description\}/g, desc)
        .replace(/\{author\}/g, author.nickname || "Unknown")
        .replace(/\{username\}/g, author.username ? `@${author.username}` : "@unknown");
}

// ─── Anti-loop guards ────────────────────────────────────────────────
let isOurDispatch = false;
const apiDone = new Set<string>();

function cleanupSet() {
    if (apiDone.size > 1000) {
        const arr = [...apiDone];
        arr.slice(0, 500).forEach(k => apiDone.delete(k));
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SYNC PASS — mutate the original embed IN-PLACE
// This preserves ALL Discord internal properties (proxy_url, rawTitle, etc.)
// We only override TEXT fields — media stays untouched!
// ═══════════════════════════════════════════════════════════════════════

function mutateVideoEmbed(e: any): void {
    const url = e.rawUrl || e.url || "";
    const name = parseName(e.title);
    const handle = parseHandle(url);
    const stats = parseBasicStats(e.description);
    const statsLine = `❤️ ${stats.likes || "?"} 💬 ${stats.comments || "?"}`;
    const authorName = name || handle || "TikTok";

    // Override ONLY text fields — keep type, thumbnail, video, image, provider, etc.
    e.color = cfg("embedColor");
    e.author = {
        name: name && handle ? `${name} (${handle})` : authorName,
        url: handle ? `https://tiktok.com/${handle}` : url,
    };
    e.description = statsLine;
    if ("rawDescription" in e) e.rawDescription = statsLine;
    e.footer = { text: cfg("pluginName") };

    // Remove title (TikTok's "TikTok - Username" is redundant, we have author)
    e.title = undefined;
    if ("rawTitle" in e) e.rawTitle = undefined;
}

function mutatePhotoEmbed(e: any): void {
    const url = e.rawUrl || e.url || "";
    const name = parseName(e.title);
    const handle = parseHandle(url);
    const stats = parseBasicStats(e.description);
    const statsLine = `❤️ ${stats.likes || "?"} 💬 ${stats.comments || "?"}`;
    const authorName = name || handle || "TikTok";

    e.color = cfg("embedColor");
    e.author = {
        name: name && handle ? `${name} (${handle})` : authorName,
        url: handle ? `https://tiktok.com/${handle}` : url,
    };
    e.description = statsLine;
    if ("rawDescription" in e) e.rawDescription = statsLine;
    e.footer = { text: `${cfg("pluginName")} • 📷 Photo` };

    e.title = undefined;
    if ("rawTitle" in e) e.rawTitle = undefined;

    // Try to make thumbnail full-width: copy to image if no image exists
    if (e.thumbnail && !e.image) {
        e.image = { ...e.thumbnail };
    }
}

function mutateSensitiveEmbed(e: any): void {
    if (cfg("sensitiveBypass")) {
        // Bypass: fix 0×0 video dimensions to force playback
        const url = e.rawUrl || e.url || "";
        const handle = parseHandle(url);

        e.color = cfg("embedColor");
        e.author = {
            name: handle || "TikTok",
            url: handle ? `https://tiktok.com/${handle}` : url,
        };
        e.description = "**⚠️ Sensitive Content** (bypass)";
        if ("rawDescription" in e) e.rawDescription = e.description;
        e.footer = { text: `${cfg("pluginName")} • 18+` };

        e.title = undefined;
        if ("rawTitle" in e) e.rawTitle = undefined;

        // Force video to real dimensions (TikTok sends 0×0 for sensitive)
        if (e.video) {
            e.video.width = 720;
            e.video.height = 1280;
        }

        // Remove logo thumbnail
        if (e.thumbnail && (e.thumbnail.url || "").includes("tiktok-logo")) {
            e.thumbnail = undefined;
        }
    } else {
        // Warning card — replace everything
        e.type = "rich";
        e.title = cfg("sensitiveTitle");
        if ("rawTitle" in e) e.rawTitle = e.title;
        e.description = cfg("sensitiveDesc");
        if ("rawDescription" in e) e.rawDescription = e.description;
        e.color = 16237824; // orange
        e.footer = { text: `${cfg("pluginName")} • 18+` };
        e.author = undefined;
        e.thumbnail = undefined;
        e.video = undefined;
        e.image = undefined;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// ASYNC API PASS — enhance with real data from API
// Deep-clones the original (preserving all internal fields), then
// overrides text with API data and dispatches MESSAGE_UPDATE once.
// ═══════════════════════════════════════════════════════════════════════

async function fetchAndEnhance(
    url: string,
    channelId: string,
    messageId: string,
    originalEmbed: any, // the pre-mutation original (deep cloned)
): Promise<void> {
    const key = `${channelId}:${messageId}`;
    if (apiDone.has(key)) return;
    apiDone.add(key);
    cleanupSet();

    try {
        const apiUrl = `https://tiktok-api-discord.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (!data || !data.ok) return;

        // Start with deep clone of original (has all Discord internal data)
        const e = originalEmbed;

        const author = data.author || {};
        const username = author.username || "unknown";
        const nickname = author.nickname || "Unknown";
        const pfp = author.avatar || null;
        const ts = fmtDate(data.publish);
        const plugin = cfg("pluginName");

        if (data.type === "sensitive" || data.sensitive) {
            if (!cfg("enableSensitive")) return;

            if (cfg("sensitiveBypass")) {
                e.color = cfg("embedColor");
                e.author = {
                    name: username !== "unknown" ? `@${username}` : "TikTok",
                    url: `https://tiktok.com/@${username}`,
                };
                if (pfp) e.author.icon_url = pfp;
                e.description = "**⚠️ Sensitive Content** (bypass)";
                if ("rawDescription" in e) e.rawDescription = e.description;
                e.footer = { text: `${plugin} • 18+` };
                e.title = undefined;
                if ("rawTitle" in e) e.rawTitle = undefined;
                if (e.video) { e.video.width = 720; e.video.height = 1280; }
                if (e.thumbnail && (e.thumbnail.url || "").includes("tiktok-logo")) {
                    e.thumbnail = undefined;
                }
            } else {
                e.type = "rich";
                e.title = cfg("sensitiveTitle");
                if ("rawTitle" in e) e.rawTitle = e.title;
                e.description = cfg("sensitiveDesc");
                if ("rawDescription" in e) e.rawDescription = e.description;
                e.color = 16237824;
                e.footer = { text: `${plugin} • 18+` };
                e.author = undefined;
                e.thumbnail = undefined;
                e.video = undefined;
                e.image = undefined;
            }
        } else if (data.type === "photo") {
            if (!cfg("enablePhoto")) return;

            const totalPhotos = data.media?.photoCount || 0;
            const range = totalPhotos <= 4 ? `1 - ${totalPhotos}` : `1 - 4 of ${totalPhotos}`;

            e.color = cfg("embedColor");
            e.author = {
                name: `${nickname} (@${username})`,
                url: `https://tiktok.com/@${username}`,
            };
            if (pfp) e.author.icon_url = pfp;
            e.description = replaceTags(cfg("photoDescLine"), data);
            if ("rawDescription" in e) e.rawDescription = e.description;
            e.footer = { text: `${plugin} • ${range} • ${ts}` };
            e.title = undefined;
            if ("rawTitle" in e) e.rawTitle = undefined;

            // Move thumbnail to image for full-width
            if (e.thumbnail && !e.image) {
                e.image = { ...e.thumbnail };
            }
        } else {
            // Video
            if (!cfg("enableVideo")) return;

            e.color = cfg("embedColor");
            e.author = {
                name: `${nickname} (@${username})`,
                url: `https://tiktok.com/@${username}`,
            };
            if (pfp) e.author.icon_url = pfp;
            e.description = replaceTags(cfg("videoDescLine"), data);
            if ("rawDescription" in e) e.rawDescription = e.description;
            e.footer = { text: `${plugin} • ${ts}` };
            e.title = undefined;
            if ("rawTitle" in e) e.rawTitle = undefined;
        }

        // Dispatch with guard
        isOurDispatch = true;
        try {
            FluxDispatcher.dispatch({
                type: "MESSAGE_UPDATE",
                message: {
                    id: messageId,
                    channel_id: channelId,
                    embeds: [e],
                },
            });
        } finally {
            isOurDispatch = false;
        }
    } catch {
        // Silently fail
    }
}

// ─── Patch messages ──────────────────────────────────────────────────
function patchMessage(msg: any) {
    try {
        if (!msg || !msg.embeds || !msg.embeds.length) return;
        if (!msg.id || !msg.channel_id) return;

        for (let i = 0; i < msg.embeds.length; i++) {
            const e = msg.embeds[i];
            if (!isTikTokEmbed(e)) continue;

            const url = e.rawUrl || e.url || "";
            if (!url) continue;

            const sensitive = isSensitive(e);
            const photo = isPhotoUrl(url);

            // Check if type is enabled
            if (sensitive && !cfg("enableSensitive")) continue;
            if (photo && !cfg("enablePhoto")) continue;
            if (!sensitive && !photo && !cfg("enableVideo")) continue;

            // Deep clone BEFORE mutation (for async API pass)
            let originalClone: any;
            try {
                originalClone = JSON.parse(JSON.stringify(e));
            } catch {
                originalClone = { ...e };
            }

            // MUTATE IN-PLACE — preserves ALL Discord internal rendering data
            if (sensitive) {
                mutateSensitiveEmbed(e);
            } else if (photo) {
                mutatePhotoEmbed(e);
            } else {
                mutateVideoEmbed(e);
            }

            // Fire ONE async API call to get accurate data
            const key = `${msg.channel_id}:${msg.id}`;
            if (!apiDone.has(key)) {
                fetchAndEnhance(url, msg.channel_id, msg.id, originalClone);
            }
        }
    } catch {
        // Safety net
    }
}

// ─── Lifecycle ───────────────────────────────────────────────────────
let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        patches.push(
            before("dispatch", FluxDispatcher, ([ev]) => {
                if (isOurDispatch) return; // Skip our own dispatches

                try {
                    if (ev.type === "MESSAGE_CREATE" || ev.type === "MESSAGE_UPDATE") {
                        if (ev.message) patchMessage(ev.message);
                    }
                    if (ev.type === "LOAD_MESSAGES_SUCCESS" && Array.isArray(ev.messages)) {
                        for (const m of ev.messages) patchMessage(m);
                    }
                } catch {
                    // Never crash the dispatcher
                }
            })
        );
    },
    onUnload: () => {
        for (const u of patches) u();
        patches = [];
        apiDone.clear();
    },
    settings: Settings,
};