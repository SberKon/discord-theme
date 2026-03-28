import { FluxDispatcher, React } from "@vendetta/metro/common";
import { findByName } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import Settings from "./Settings";
import TikTokEmbedView from "./TikTokEmbed";

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

// ─── Detection ───────────────────────────────────────────────────────
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

// ─── Anti-loop ───────────────────────────────────────────────────────
let isOurDispatch = false;

// ─── Find Discord's Embed component ─────────────────────────────────
function findEmbedModule(): any {
    const names = [
        "Embed",
        "MessageEmbed",
        "EmbedCard",
        "EmbedWrapper",
        "EmbedContent",
    ];
    for (const name of names) {
        try {
            const m = findByName(name, false);
            if (m?.default) return m;
        } catch { }
    }
    return null;
}

// Track if we successfully patched the Embed component
let embedPatched = false;

// ─── Patch messages (FluxDispatcher) ─────────────────────────────────
function patchMessage(msg: any) {
    try {
        if (!msg || !msg.embeds || !msg.embeds.length) return;

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

            // Mark embed for our custom renderer
            e._tiktok = true;
            e._tiktokUrl = url;

            if (embedPatched) {
                // Custom renderer will handle rendering — minimize Discord's own render
                e.title = undefined;
                if ("rawTitle" in e) e.rawTitle = undefined;
                e.description = " ";
                if ("rawDescription" in e) e.rawDescription = " ";
                e.footer = undefined;
                e.author = undefined;
                e.fields = undefined;
                // Keep thumbnail/video/image/type — Discord uses them for layout sizing
                // Our component renders on top anyway
            }
            // If embed NOT patched, leave original content as-is (fallback)
        }
    } catch {
        // Safety net
    }
}

// ─── Lifecycle ───────────────────────────────────────────────────────
let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        // 1) Patch FluxDispatcher — mark TikTok embeds
        patches.push(
            before("dispatch", FluxDispatcher, ([ev]) => {
                if (isOurDispatch) return;

                try {
                    if (ev.type === "MESSAGE_CREATE" || ev.type === "MESSAGE_UPDATE") {
                        if (ev.message) patchMessage(ev.message);
                    }
                    if (ev.type === "LOAD_MESSAGES_SUCCESS" && Array.isArray(ev.messages)) {
                        for (const m of ev.messages) patchMessage(m);
                    }
                } catch {
                    // Never crash
                }
            })
        );

        // 2) Patch Embed component — replace rendering for TikTok embeds
        const EmbedModule = findEmbedModule();
        if (EmbedModule) {
            try {
                patches.push(
                    after("default", EmbedModule, (args: any[], ret: any) => {
                        try {
                            const props = args?.[0];
                            const embed = props?.embed;
                            if (!embed?._tiktok || !embed?._tiktokUrl) return ret;

                            // Render our custom TikTok embed component
                            return React.createElement(TikTokEmbedView, {
                                url: embed._tiktokUrl,
                            });
                        } catch {
                            return ret;
                        }
                    })
                );
                embedPatched = true;
            } catch {
                // Component patching failed — fall back to original embeds
                embedPatched = false;
            }
        }
    },

    onUnload: () => {
        for (const u of patches) u();
        patches = [];
        embedPatched = false;
    },

    settings: Settings,
};