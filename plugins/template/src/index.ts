import { FluxDispatcher } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";

// ─── Default settings ────────────────────────────────────────────────
const DEFAULTS = {
    embedColor: 6513919,        // #635BFF — tnktok purple-blue
    showFooter: true,
    sensitiveHandling: "warn",  // "warn" | "hide"
};

function cfg(key: string): any {
    const val = (storage as any)[key];
    return val !== undefined ? val : (DEFAULTS as any)[key];
}

// ─── Domain detection ────────────────────────────────────────────────
const TIKTOK_DOMAINS = [
    "tiktok.com",
    "www.tiktok.com",
    "vt.tiktok.com",
    "vm.tiktok.com",
    "m.tiktok.com",
];

function isTikTokUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return TIKTOK_DOMAINS.some(
            (d) => parsed.hostname.toLowerCase() === d
        );
    } catch {
        return false;
    }
}

function isTikTokEmbed(embed: any): boolean {
    const url = embed.rawUrl || embed.url || "";
    const provider = embed.provider?.name?.toLowerCase() || "";
    return isTikTokUrl(url) || provider === "tiktok";
}

// ─── Content type detection ──────────────────────────────────────────

function isSensitiveEmbed(embed: any): boolean {
    // Zero-dimension video = sensitive marker
    if (
        embed.video &&
        embed.video.width === 0 &&
        embed.video.height === 0
    ) {
        return true;
    }

    const title = (embed.title || "").toLowerCase();
    const sensitiveMarkers = [
        "зайди в tiktok",
        "переглянути відео",
        "check out",
        "watch this",
        "sensitive content",
    ];
    if (sensitiveMarkers.some((m) => title.includes(m))) return true;

    // Generic TikTok logo thumbnail = blocked content
    const thumbUrl = embed.thumbnail?.url || "";
    if (thumbUrl.includes("tiktok-logo")) return true;

    return false;
}

function isPhotoPost(url: string): boolean {
    return /\/photo\/\d+/.test(url);
}

// ─── Metadata extraction ────────────────────────────────────────────

/** "TikTok · TRY-SAN" → "TRY-SAN" */
function extractDisplayName(title: string | undefined): string | null {
    if (!title) return null;
    const m = title.match(/TikTok\s*[·•\-–]\s*(.+)/i);
    return m ? m[1].trim() : null;
}

/** URL → "@username" */
function extractHandle(url: string | undefined): string | null {
    if (!url) return null;
    const m = url.match(/@([^/?&#]+)/);
    return m ? `@${m[1]}` : null;
}

/**
 * Parse TikTok embed description.
 * UA format: "Уподобайки: 45K, коментарі: 630. «Hiromi Higuruma»"
 * EN format: "Likes: 45K, Comments: 630. «caption»"
 */
function parseDescription(desc: string | undefined): {
    likes?: string;
    comments?: string;
    caption?: string;
} {
    if (!desc) return {};
    const result: any = {};

    // Caption in «…» or "…" or "…"
    const cm = desc.match(/[«\u201C\u201E](.+?)[»\u201D\u201F]/);
    if (cm) result.caption = cm[1];

    // Numbers (first ≈ likes, second ≈ comments)
    const nums = desc.match(/\d[\d.,]*\s*[KkMmкКмМ]?/g);
    if (nums) {
        const cleaned = nums
            .map((n) => n.replace(/\s/g, "").trim())
            .filter((n) => n.length > 0);
        if (cleaned.length >= 1) result.likes = cleaned[0];
        if (cleaned.length >= 2) result.comments = cleaned[1];
    }

    return result;
}

// ─── Embed builders ─────────────────────────────────────────────────

/** Build author block */
function buildAuthor(
    title: string | undefined,
    url: string | undefined
): { name: string; url: string } {
    const name = extractDisplayName(title);
    const handle = extractHandle(url);

    const authorName =
        name && handle
            ? `${name} (${handle})`
            : name || handle || "TikTok";

    const authorUrl = handle
        ? `https://tiktok.com/${handle}`
        : url || "https://tiktok.com";

    return { name: authorName, url: authorUrl };
}

/** Build stats description line */
function buildStatsLine(stats: {
    likes?: string;
    comments?: string;
}): string | undefined {
    if (!stats.likes && !stats.comments) return undefined;
    return `**❤️ ${stats.likes || "?"} 💬 ${stats.comments || "?"}**`;
}

/** Copy thumbnail data from original embed */
function copyThumbnail(src: any): any | undefined {
    if (!src) return undefined;
    return {
        url: src.url,
        proxyURL: src.proxyURL || src.proxy_url,
        width: src.width || 720,
        height: src.height || 1280,
    };
}

/** Copy video data from original embed */
function copyVideo(src: any): any | undefined {
    if (!src?.url) return undefined;
    return {
        url: src.url,
        proxyURL: src.proxyURL || src.proxy_url,
        width: src.width || 720,
        height: src.height || 1280,
    };
}

// ─── Video embed (tnktok style) ─────────────────────────────────────
function buildVideoEmbed(embed: any): any {
    const color = cfg("embedColor");
    const showFooter = cfg("showFooter");
    const url = embed.rawUrl || embed.url;
    const author = buildAuthor(embed.title, url);
    const stats = parseDescription(embed.description);
    const statsLine = buildStatsLine(stats);

    const result: any = {
        type: "rich",
        url,
        color,
        author,
    };

    if (statsLine) result.description = statsLine;

    // Thumbnail (cover image)
    const thumb = copyThumbnail(embed.thumbnail);
    if (thumb) result.thumbnail = thumb;

    // Video player
    const video = copyVideo(embed.video);
    if (video) result.video = video;

    if (showFooter) result.footer = { text: "TikTok" };

    return result;
}

// ─── Photo embed (tnktok style + photo count) ───────────────────────
function buildPhotoEmbed(embed: any): any {
    const color = cfg("embedColor");
    const showFooter = cfg("showFooter");
    const url = embed.rawUrl || embed.url;
    const author = buildAuthor(embed.title, url);
    const stats = parseDescription(embed.description);

    const parts: string[] = [];
    if (stats.caption) parts.push(`**${stats.caption}**`);

    const sl = buildStatsLine(stats);
    if (sl) parts.push(sl);

    const result: any = {
        type: "rich",
        url,
        color,
        author,
    };

    if (parts.length) result.description = parts.join("\n");

    // Use thumbnail as main image
    if (embed.thumbnail) {
        result.image = {
            url: embed.thumbnail.url,
            proxyURL:
                embed.thumbnail.proxyURL || embed.thumbnail.proxy_url,
            width: embed.thumbnail.width,
            height: embed.thumbnail.height,
        };
    }

    if (showFooter) result.footer = { text: "TikTok" };

    return result;
}

// ─── Sensitive content warning ──────────────────────────────────────
function buildSensitiveEmbed(embed: any): any {
    const showFooter = cfg("showFooter");
    return {
        type: "rich",
        url: embed.rawUrl || embed.url,
        title: "⚠️ Sensitive Content",
        description:
            "This video is age-restricted by TikTok.\nVisit TikTok directly to view it.",
        color: 16237824,
        ...(showFooter ? { footer: { text: "TikTok" } } : {}),
    };
}

// ─── Transform dispatcher ───────────────────────────────────────────

function transformEmbed(embed: any): any | null {
    if (!isTikTokEmbed(embed)) return embed;

    // Sensitive content
    if (isSensitiveEmbed(embed)) {
        return cfg("sensitiveHandling") === "hide"
            ? null
            : buildSensitiveEmbed(embed);
    }

    // Photo vs Video
    const url = embed.rawUrl || embed.url || "";
    if (isPhotoPost(url)) return buildPhotoEmbed(embed);

    return buildVideoEmbed(embed);
}

function patchMessageEmbeds(message: any) {
    if (!message?.embeds?.length) return;

    const patched: any[] = [];
    for (const embed of message.embeds) {
        const result = transformEmbed(embed);
        if (result !== null) patched.push(result);
    }
    message.embeds = patched;
}

// ─── Plugin lifecycle ───────────────────────────────────────────────

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        patches.push(
            before("dispatch", FluxDispatcher, ([event]) => {
                if (
                    event.type === "MESSAGE_CREATE" ||
                    event.type === "MESSAGE_UPDATE"
                ) {
                    if (event.message) patchMessageEmbeds(event.message);
                }

                if (event.type === "LOAD_MESSAGES_SUCCESS") {
                    if (Array.isArray(event.messages)) {
                        for (const msg of event.messages) {
                            patchMessageEmbeds(msg);
                        }
                    }
                }
            })
        );
    },
    onUnload: () => {
        for (const unpatch of patches) unpatch();
        patches = [];
    },
    settings: Settings,
};