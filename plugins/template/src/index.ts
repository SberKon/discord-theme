import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

// ─── Default Templates ──────────────────────────────────────────────
export const DEFAULTS: Record<string, any> = {
    pluginName: "fxTikTok",
    embedColor: 0x638DFF,
    maxDescLength: 150,
    videoDescLine: "❤️ {likes} 💬 {comments} 🔁 {shares}",
    photoDescLine: "❤️ {likes} 💬 {comments} 🔁 {shares}",
    sensitiveTitle: "⚠️ Sensitive Content",
    sensitiveDesc:
        "Sorry, we were unable to show this video due to the video being age-restricted. If you would like to view the video, please visit TikTok directly.",
};

function cfg(k: string): any {
    try {
        const v = (storage as any)[k];
        return v !== undefined && v !== null && v !== "" ? v : DEFAULTS[k];
    } catch {
        return DEFAULTS[k];
    }
}

// ─── Domain helpers ──────────────────────────────────────────────────
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

// ─── Quick sensitive check on original embed ─────────────────────────
function isLocalSensitive(e: any): boolean {
    if (e.video && e.video.width === 0 && e.video.height === 0) return true;
    const t = (e.title || "").toLowerCase();
    if (t.includes("sensitive content")) return true;
    if (t.includes("зайди в tiktok")) return true;
    if ((e.thumbnail?.url || "").includes("tiktok-logo")) return true;
    return false;
}

// ─── Format helpers ──────────────────────────────────────────────────
function fmtCount(v: number | null | undefined): string {
    if (v === null || v === undefined) return "0";
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
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

// ─── Template tag replacement ────────────────────────────────────────
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

// ─── Pending rewrites store ──────────────────────────────────────────
const pendingRewrites = new Map<string, { url: string; embedIdx: number }>();
let fetchCounter = 0;

// ─── Build rich embeds from API data ─────────────────────────────────
// Returns a single embed
function buildVideoEmbed(data: any): any {
    const author = data.author || {};
    const username = author.username || "unknown";
    const nickname = author.nickname || "Unknown";
    const pfp = author.avatar || null;
    const ts = fmtDate(data.publish);
    const plugin = cfg("pluginName");
    const color = cfg("embedColor");
    const descLine = cfg("videoDescLine");

    const description = replaceTags(descLine, data);
    const videoUrl = data.media?.videoUrl || `https://offload.tnktok.com/generate/video/${data.id || ""}`;

    const embed: any = {
        type: "rich",
        url: data.resolved_url || data.input_url || "",
        color: color,
        author: {
            name: `${nickname} (@${username})`,
            url: `https://tiktok.com/@${username}`,
        },
        description: description,
        footer: { text: `${plugin} • ${ts}` },
    };

    if (pfp) embed.author.icon_url = pfp;

    // Full-size image (video poster / cover / video URL)
    if (videoUrl) {
        embed.image = { url: videoUrl };
    }

    return embed;
}

// Returns ARRAY of embeds — Discord groups embeds with same url into 2x2 image grid
function buildPhotoEmbeds(data: any): any[] {
    const author = data.author || {};
    const username = author.username || "unknown";
    const nickname = author.nickname || "Unknown";
    const pfp = author.avatar || null;
    const ts = fmtDate(data.publish);
    const plugin = cfg("pluginName");
    const color = cfg("embedColor");
    const descLine = cfg("photoDescLine");

    const description = replaceTags(descLine, data);
    const photos: string[] = (data.media?.photos || []).slice(0, 4);
    const totalPhotos = data.media?.photoCount || photos.length;
    const shownCount = photos.length;

    // Footer: "plugin • 1 - N • timestamp" if <=4, else "plugin • 1 - 4 of N • timestamp"
    const range = totalPhotos <= 4
        ? `1 - ${totalPhotos}`
        : `1 - ${shownCount} of ${totalPhotos}`;
    const footerText = `${plugin} • ${range} • ${ts}`;

    // Shared URL — Discord groups embeds with same url into a grid
    const sharedUrl = data.resolved_url || data.input_url || "";

    const embeds: any[] = [];

    for (let i = 0; i < photos.length; i++) {
        const embed: any = {
            type: "rich",
            url: sharedUrl,
            color: color,
            image: { url: photos[i] },
        };

        // Only first embed gets author, description, footer
        if (i === 0) {
            embed.author = {
                name: `${nickname} (@${username})`,
                url: `https://tiktok.com/@${username}`,
            };
            if (pfp) embed.author.icon_url = pfp;
            embed.description = description;
        }

        // Only last embed gets footer
        if (i === photos.length - 1) {
            embed.footer = { text: footerText };
        }

        embeds.push(embed);
    }

    // Fallback: if no photos at all
    if (embeds.length === 0) {
        embeds.push({
            type: "rich",
            url: sharedUrl,
            color: color,
            author: {
                name: `${nickname} (@${username})`,
                url: `https://tiktok.com/@${username}`,
            },
            description: description,
            footer: { text: footerText },
        });
    }

    return embeds;
}

function buildSensitiveEmbed(data: any): any {
    return {
        type: "rich",
        url: data?.resolved_url || data?.input_url || "",
        title: cfg("sensitiveTitle"),
        description: cfg("sensitiveDesc"),
        color: 16237824, // orange
    };
}

// ─── API fetch + dispatch update ─────────────────────────────────────
async function fetchAndRewrite(
    url: string,
    channelId: string,
    messageId: string,
    embedIndex: number,
    originalEmbed: any,
): Promise<void> {
    try {
        const apiUrl = `https://tiktok-api-discord.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data || !data.ok) return; // API failed, keep original

        let newEmbeds: any[];
        if (data.type === "sensitive" || data.sensitive) {
            newEmbeds = [buildSensitiveEmbed(data)];
        } else if (data.type === "photo") {
            // Returns array of embeds (multi-image grid)
            newEmbeds = buildPhotoEmbeds(data);
        } else {
            newEmbeds = [buildVideoEmbed(data)];
        }

        // Dispatch a MESSAGE_UPDATE to refresh embeds in the UI
        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message: {
                id: messageId,
                channel_id: channelId,
                embeds: newEmbeds,
            },
        });
    } catch {
        // Silently fail — keep original embed
    }
}

// ─── Quick local rewrite (synchronous, no API) ──────────────────────
function quickRewrite(e: any): any {
    // For sensitive content we can do a local rewrite immediately
    if (isLocalSensitive(e)) {
        return {
            type: "rich",
            url: e.rawUrl || e.url || "",
            title: cfg("sensitiveTitle"),
            description: cfg("sensitiveDesc"),
            color: 16237824,
        };
    }
    // Otherwise return original — the async API call will update it
    return e;
}

// ─── Patch messages ──────────────────────────────────────────────────
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

            // Synchronous quick rewrite (sensitive check)
            const quick = quickRewrite(e);
            newEmbeds.push(quick);

            // Fire async API fetch to get full data
            fetchAndRewrite(url, msg.channel_id, msg.id, i, e);
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
    onUnload: () => { for (const u of patches) u(); patches = []; },
    settings: Settings,
};