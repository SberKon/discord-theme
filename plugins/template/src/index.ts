import { logger } from "@vendetta";
import { patcher } from "@vendetta/ui";
import Settings from "./Settings";

function replaceTikTokLinks(text) {
    if (!text || typeof text !== "string") return text;
    
    return text.replace(/https?:\/\/(vm|vt|www)\.tiktok\.com\/([^\s<>"{}|\\^`\[\]]*)/gi, (match) => {
        try {
            const url = new URL(match);
            const path = url.pathname + url.search;
            return `https://fixtiktok.com${path}`;
        } catch {
            return match;
        }
    });
}

let unpatch;

export default {
    onLoad: () => {
        logger.log("TikTok Embed Fix loaded!");
        
        try {
            // Patch the message component rendering
            const modules = require("@vendetta/modules");
            const MessageStore = modules.MessageStore || modules.default?.MessageStore;
            
            if (MessageStore) {
                unpatch = patcher.instead(
                    MessageStore,
                    "getMessage",
                    (args, original) => {
                        const result = original(...args);
                        if (result?.content) {
                            result.content = replaceTikTokLinks(result.content);
                        }
                        return result;
                    }
                );
                logger.log("Message store patched successfully");
            }
        } catch (e) {
            logger.warn("Message store patch failed, trying alternative:", e);
            
            try {
                // Alternative: patch render function
                const React = require("react");
                unpatch = patcher.before(
                    React,
                    "createElement",
                    (args) => {
                        if (args[0]?.name?.includes("Message")) {
                            if (args[1]?.content) {
                                args[1].content = replaceTikTokLinks(args[1].content);
                            }
                        }
                    }
                );
            } catch (e2) {
                logger.warn("All patches failed:", e2);
            }
        }
    },
    onUnload: () => {
        logger.log("TikTok Embed Fix unloaded!");
        unpatch?.();
    },
    settings: Settings,
}
