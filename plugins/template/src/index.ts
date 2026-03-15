import { logger } from "@vendetta";
import { patcher } from "@vendetta/ui";
import Settings from "./Settings";

const TikTokPatterns = [
    /https?:\/\/(vm|vt|www)\.tiktok\.com\/([^\s]+)/gi,
];

function replaceTikTokLinks(text) {
    return text.replace(TikTokPatterns[0], (match) => {
        const url = new URL(match);
        const path = url.pathname + url.search;
        return `https://fixtiktok.com${path}`;
    });
}

let unpatch;

export default {
    onLoad: () => {
        logger.log("TikTok Embed Fix loaded!");
        
        try {
            // Patch message content rendering
            unpatch = patcher.after(
                "MessageContent",
                (args) => {
                    if (args[0]?.content) {
                        args[0].content = replaceTikTokLinks(args[0].content);
                    }
                }
            );
        } catch (e) {
            logger.warn("Could not patch message content:", e);
        }
    },
    onUnload: () => {
        logger.log("TikTok Embed Fix unloaded!");
        unpatch?.();
    },
    settings: Settings,
}
