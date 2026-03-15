import { logger } from "@vendetta";
import { patcher } from "@vendetta/ui";
import Settings from "./Settings";

const TIKTOK_REGEX = /https?:\/\/(vm|vt|www)\.tiktok\.com\/([^\s<>"{}|\\^`\[\]]*)/gi;

function getTikTokFixUrl(url) {
    try {
        const tiktokUrl = new URL(url);
        const path = tiktokUrl.pathname + tiktokUrl.search;
        return `https://fixtiktok.com${path}`;
    } catch {
        return url;
    }
}

let unpatches = [];

export default {
    onLoad: () => {
        logger.log("TikTok Embed Fix loaded!");
        
        try {
            // Patch React.createElement to intercept all rendered components
            const React = require("react");
            
            unpatches.push(
                patcher.before(React, "createElement", (args) => {
                    const [type, props] = args;
                    
                    // Patch text nodes
                    if (typeof args[2] === "string") {
                        args[2] = args[2].replace(TIKTOK_REGEX, getTikTokFixUrl);
                    }
                    
                    // Patch children array
                    if (Array.isArray(args[2])) {
                        args[2] = args[2].map(child => {
                            if (typeof child === "string") {
                                return child.replace(TIKTOK_REGEX, getTikTokFixUrl);
                            }
                            return child;
                        });
                    }
                    
                    // Patch children in props
                    if (props?.children && typeof props.children === "string") {
                        props.children = props.children.replace(TIKTOK_REGEX, getTikTokFixUrl);
                    }
                    
                    if (props?.children && Array.isArray(props.children)) {
                        props.children = props.children.map(child => {
                            if (typeof child === "string") {
                                return child.replace(TIKTOK_REGEX, getTikTokFixUrl);
                            }
                            return child;
                        });
                    }
                    
                    // Patch href and src attributes
                    if (props?.href && typeof props.href === "string") {
                        props.href = props.href.replace(TIKTOK_REGEX, getTikTokFixUrl);
                    }
                })
            );
            
            logger.log("TikTok Embed Fix applied!");
        } catch (e) {
            logger.warn("Failed to apply patch:", e.message);
        }
    },
    
    onUnload: () => {
        logger.log("TikTok Embed Fix unloaded!");
        unpatches.forEach(unpatch => unpatch?.());
    },
    
    settings: Settings,
}
