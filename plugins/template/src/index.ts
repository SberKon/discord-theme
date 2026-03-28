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

function extractVideoId(url: string): string | null {
    const m = url.match(/(?:video|photo)\/(\d+)/);
    return m ? m[1] : null;
}

// ─── Parsers (from original embed data) ──────────────────────────────
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

// ─── Copy media preserving Discord proxy URLs ────────────────────────
function cpMedia(obj: any): any | undefined {
    if (!obj?.url) return undefined;
    return {
        url: obj.url,
        proxy_url: obj.proxy_url || obj.proxyURL,
        proxyURL: obj.proxyURL || obj.proxy_url,
        width: obj.width || 720,
        height: obj.height || 1280,
        content_type: obj.content_type,
    };
}

// ─── Anti-loop: track processed messages ─────────────────────────────
let isOurDispatch = false;
const apiDone = new Set<string>();

function cleanupSet() {
    if (apiDone.size > 1000) {
        const arr = [...apiDone];
        arr.slice(0, 500).forEach(k => apiDone.delete(k));
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SYNCHRONOUS PASS — restructure embed using original proxy URLs
// ═══════════════════════════════════════════════════════════════════════

function buildVideoSync(e: any): any {
    const url = e.rawUrl || e.url || "";
    const name = parseName(e.title);
    const handle = parseHandle(url);
    const stats = parseBasicStats(e.description);
    const statsLine = `❤️ ${stats.likes || "?"} 💬 ${stats.comments || "?"}`;

    const result: any = {
        type: "rich",
        url: url,
        color: cfg("embedColor"),
        description: statsLine,
    };

    const authorName = name || handle || "TikTok";
    result.author = {
        name: name && handle ? `${name} (${handle})` : authorName,
        url: handle ? `https://tiktok.com/${handle}` : url,
    };

    // Preserve original media with Discord proxy URLs
    const thumb = cpMedia(e.thumbnail);
    if (thumb) result.thumbnail = thumb;

    const video = cpMedia(e.video);
    if (video) {
        video.width = video.width || 720;
        video.height = video.height || 1280;
        result.video = video;
    }

    result.footer = { text: cfg("pluginName") };
    return result;
}

function buildPhotoSync(e: any): any {
    const url = e.rawUrl || e.url || "";
    const name = parseName(e.title);
    const handle = parseHandle(url);
    const stats = parseBasicStats(e.description);
    const statsLine = `❤️ ${stats.likes || "?"} 💬 ${stats.comments || "?"}`;

    const result: any = {
        type: "rich",
        url: url,
        color: cfg("embedColor"),
        description: statsLine,
    };

    const authorName = name || handle || "TikTok";
    result.author = {
        name: name && handle ? `${name} (${handle})` : authorName,
        url: handle ? `https://tiktok.com/${handle}` : url,
    };

    // Photo as full image (use thumbnail's proxy URL)
    if (e.thumbnail) {
        result.image = cpMedia(e.thumbnail);
    }

    result.footer = { text: `${cfg("pluginName")} • 📷 Photo` };
    return result;
}

function buildSensitiveSync(e: any): any {
    const url = e.rawUrl || e.url || "";
    const videoId = extractVideoId(url);

    // Bypass: force video playback with real dimensions
    if (cfg("sensitiveBypass")) {
        const handle = parseHandle(url);
        const result: any = {
            type: "rich",
            url: url,
            color: cfg("embedColor"),
            description: "**⚠️ Sensitive Content** (bypass)",
        };

        if (handle) {
            result.author = { name: handle, url: `https://tiktok.com/${handle}` };
        }

        // Force video with real dimensions (TikTok sends 0×0 for sensitive)
        const video = cpMedia(e.video);
        if (video && video.url) {
            video.width = 720;
            video.height = 1280;
            result.video = video;
        }

        const thumb = cpMedia(e.thumbnail);
        if (thumb && !(thumb.url || "").includes("tiktok-logo")) {
            result.thumbnail = thumb;
        }

        result.footer = { text: `${cfg("pluginName")} • 18+` };
        return result;
    }

    // Standard warning
    return {
        type: "rich",
        url: url,
        title: cfg("sensitiveTitle"),
        description: cfg("sensitiveDesc"),
        color: 16237824,
        footer: { text: `${cfg("pluginName")} • 18+` },
    };
}

// ═══════════════════════════════════════════════════════════════════════
// ASYNC API PASS — enhance with real data, still keep original media
// ═══════════════════════════════════════════════════════════════════════

function buildVideoAPI(data: any, orig?: any): any {
    const author = data.author || {};
    const username = author.username || "unknown";
    const nickname = author.nickname || "Unknown";
    const pfp = author.avatar || null;
    const ts = fmtDate(data.publish);
    const desc = replaceTags(cfg("videoDescLine"), data);

    const result: any = {
        type: "rich",
        url: data.resolved_url || data.input_url || "",
        color: cfg("embedColor"),
        author: {
            name: `${nickname} (@${username})`,
            url: `https://tiktok.com/@${username}`,
        },
        description: desc,
        footer: { text: `${cfg("pluginName")} • ${ts}` },
    };

    if (pfp) result.author.icon_url = pfp;

    // Keep original embed's media (has Discord proxy URLs!)
    if (orig) {
        const thumb = cpMedia(orig.thumbnail);
        if (thumb) result.thumbnail = thumb;

        const video = cpMedia(orig.video);
        if (video) {
            video.width = video.width || 720;
            video.height = video.height || 1280;
            result.video = video;
        }
    }

    return result;
}

function buildPhotoAPI(data: any, orig?: any): any {
    const author = data.author || {};
    const username = author.username || "unknown";
    const nickname = author.nickname || "Unknown";
    const pfp = author.avatar || null;
    const ts = fmtDate(data.publish);
    const desc = replaceTags(cfg("photoDescLine"), data);

    const totalPhotos = data.media?.photoCount || 0;
    const range = totalPhotos <= 4 ? `1 - ${totalPhotos}` : `1 - 4 of ${totalPhotos}`;
    const footerText = `${cfg("pluginName")} • ${range} • ${ts}`;

    const result: any = {
        type: "rich",
        url: data.resolved_url || data.input_url || "",
        color: cfg("embedColor"),
        author: {
            name: `${nickname} (@${username})`,
            url: `https://tiktok.com/@${username}`,
        },
        description: desc,
        footer: { text: footerText },
    };

    if (pfp) result.author.icon_url = pfp;

    // Use original embed's thumbnail as image (has proxy URL)
    if (orig?.thumbnail) {
        result.image = cpMedia(orig.thumbnail);
    }

    return result;
}

function buildSensitiveAPI(data: any, orig?: any): any {
    const videoId = data.id || extractVideoId(data.resolved_url || data.input_url || "");

    if (cfg("sensitiveBypass") && videoId) {
        const author = data.author || {};
        const username = author.username || "unknown";
        const playerUrl = `https://www.tiktok.com/player/v1/${videoId}`;

        const result: any = {
            type: "rich",
            url: data.resolved_url || data.input_url || "",
            color: cfg("embedColor"),
            description: "**⚠️ Sensitive Content** (bypass)",
            footer: { text: `${cfg("pluginName")} • 18+` },
        };

        if (username !== "unknown") {
            result.author = {
                name: `@${username}`,
                url: `https://tiktok.com/@${username}`,
            };
            if (data.author?.avatar) result.author.icon_url = data.author.avatar;
        }

        // Keep original video with proxy URL, force real dimensions
        if (orig) {
            const video = cpMedia(orig.video);
            if (video && video.url) {
                video.width = 720;
                video.height = 1280;
                result.video = video;
            }
            const thumb = cpMedia(orig.thumbnail);
            if (thumb && !(thumb.url || "").includes("tiktok-logo")) {
                result.thumbnail = thumb;
            }
        }

        return result;
    }

    // Standard warning
    return {
        type: "rich",
        url: data?.resolved_url || data?.input_url || "",
        title: cfg("sensitiveTitle"),
        description: cfg("sensitiveDesc"),
        color: 16237824,
        footer: { text: `${cfg("pluginName")} • 18+` },
    };
}

// ─── API fetch (runs ONCE per message) ───────────────────────────────
async function fetchAndRewrite(
    url: string,
    channelId: string,
    messageId: string,
    origEmbed: any,
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

        let newEmbed: any;
        if (data.type === "sensitive" || data.sensitive) {
            if (!cfg("enableSensitive")) return;
            newEmbed = buildSensitiveAPI(data, origEmbed);
        } else if (data.type === "photo") {
            if (!cfg("enablePhoto")) return;
            newEmbed = buildPhotoAPI(data, origEmbed);
        } else {
            if (!cfg("enableVideo")) return;
            newEmbed = buildVideoAPI(data, origEmbed);
        }

        // Dispatch with guard — isOurDispatch prevents re-entry
        isOurDispatch = true;
        try {
            FluxDispatcher.dispatch({
                type: "MESSAGE_UPDATE",
                message: {
                    id: messageId,
                    channel_id: channelId,
                    embeds: [newEmbed],
                },
            });
        } finally {
            isOurDispatch = false;
        }
    } catch {
        // Silently fail
    }
}

// ─── Patch messages (synchronous) ────────────────────────────────────
function patchMessage(msg: any) {
    try {
        if (!msg || !msg.embeds || !msg.embeds.length) return;
        if (!msg.id || !msg.channel_id) return;

        const newEmbeds: any[] = [];

        for (let i = 0; i < msg.embeds.length; i++) {
            const e = msg.embeds[i];
            if (!isTikTokEmbed(e)) {
                newEmbeds.push(e);
                continue;
            }

            const url = e.rawUrl || e.url || "";
            if (!url) { newEmbeds.push(e); continue; }

            // Classify
            const sensitive = isSensitive(e);
            const photo = isPhotoUrl(url);

            // Check if type is enabled
            if (sensitive && !cfg("enableSensitive")) { newEmbeds.push(e); continue; }
            if (photo && !cfg("enablePhoto")) { newEmbeds.push(e); continue; }
            if (!sensitive && !photo && !cfg("enableVideo")) { newEmbeds.push(e); continue; }

            // Synchronous quick rewrite (uses original proxy URLs)
            let quick: any;
            if (sensitive) {
                quick = buildSensitiveSync(e);
            } else if (photo) {
                quick = buildPhotoSync(e);
            } else {
                quick = buildVideoSync(e);
            }
            newEmbeds.push(quick);

            // Fire ONE async API call to enhance with real data
            const key = `${msg.channel_id}:${msg.id}`;
            if (!apiDone.has(key)) {
                fetchAndRewrite(url, msg.channel_id, msg.id, e);
            }
        }

        msg.embeds = newEmbeds;
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
                // Skip our own dispatches to prevent infinite loop
                if (isOurDispatch) return;

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