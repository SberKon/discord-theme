import { instead } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { pluginMessageMap, invisibleChar } from "./messages";
import { TIKTOK_LINK_REGEX, convertToFixTikTok, isTikTokLink } from "../convert";
import { findByStoreName } from "@vendetta/metro";
import { logger } from "@vendetta";

function trail(x: string) {
	return x.replace(/(\/)?$/, "/");
}

function toggleInvisible(content: string) {
	return content.startsWith(invisibleChar) ? content.slice(invisibleChar.length) : invisibleChar + content;
}

async function rehydrateAll() {
	try {
		const MessageStore: any = findByStoreName("MessageStore");
		const ChannelStore: any = findByStoreName("ChannelStore");
		const SelectedChannelStore: any = findByStoreName("SelectedChannelStore");

		// gather channel ids (best-effort)
		let channelIds: string[] = [];

		try {
			if (ChannelStore && typeof ChannelStore.getChannels === "function") {
				const chs = ChannelStore.getChannels();
				if (chs && typeof chs === "object") channelIds = Object.keys(chs);
			}
		} catch {}

		if (!channelIds.length && SelectedChannelStore && typeof SelectedChannelStore.getChannelId === "function") {
			try {
				const cid = SelectedChannelStore.getChannelId();
				if (cid) channelIds = [cid];
			} catch {}
		}

		// fallback: try to find a channel map inside MessageStore
		if (!channelIds.length && MessageStore) {
			try {
				// various builds expose messages differently; try common fields
				const maybeMap = MessageStore._messages ?? MessageStore.messages ?? MessageStore.getMessages?.();
				if (maybeMap && typeof maybeMap === "object") {
					channelIds = Object.keys(maybeMap);
				}
			} catch {}
		}

		// if still nothing, abort quietly
		if (!channelIds.length) return;

		for (const cid of channelIds) {
			try {
				// try different accessors for messages map
				let msgsMap: any = null;
				if (typeof MessageStore.getMessages === "function") msgsMap = MessageStore.getMessages(cid);
				if (!msgsMap) msgsMap = MessageStore._messages?.[cid] ?? MessageStore.messages?.[cid];

				if (!msgsMap) continue;
				// msgsMap can be Map or object
				const entries = msgsMap instanceof Map ? Array.from(msgsMap.values()) : Object.values(msgsMap);

				for (const m of entries) {
					try {
						const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
						if (TIKTOK_LINK_REGEX.test(content) || (Array.isArray(m.embeds) && m.embeds.some((e: any) => e?.url && isTikTokLink(e.url)))) {
							// dispatch a MESSAGE_UPDATE with toggled invisible char so our dispatch patch runs and modifies message
							FluxDispatcher.dispatch({
								type: "MESSAGE_UPDATE",
								message: {
									...m,
									content: toggleInvisible(content),
								},
								log_edit: false,
								otherPluginBypass: true,
							});
						}
					} catch {}
				}
			} catch {}
		}
	} catch (e) {
		logger.warn("[TikTokEmbedFix] rehydrate failed", e);
	}
}

export default () => {
	const patches: (() => void)[] = [];

	patches.push(
		instead("dispatch", FluxDispatcher, (args, orig) => {
			try {
				const action = args[0];
				if (action && (action.type === "MESSAGE_CREATE" || action.type === "MESSAGE_UPDATE")) {
					// normalize to message object (handle different payload shapes)
					const msg = action.message ?? action.message?.message ?? action;
					if (msg && msg.id) {
						// 1) If there are existing embeds, replace tiktok embed URLs with fixtiktok versions
						if (Array.isArray(msg.embeds) && msg.embeds.length) {
							for (let i = 0; i < msg.embeds.length; i++) {
								try {
									const e = msg.embeds[i];
									if (e && typeof e.url === "string" && isTikTokLink(e.url)) {
										msg.embeds[i] = { ...e, url: convertToFixTikTok(e.url) };
									}
								} catch {}
							}
						}

						// 2) If no embeds or still needs injection, replace tiktok links in content with fixtiktok links
						if (!Array.isArray(msg.embeds) || !msg.embeds.length) {
							if (typeof msg.content === "string") {
								const newContent = msg.content.replace(TIKTOK_LINK_REGEX, (m: string) => convertToFixTikTok(m));
								if (newContent !== msg.content) {
									msg.content = newContent;
								}
							} else if (msg.content) {
								// fallback: stringify and replace (best-effort)
								try {
									const s = JSON.stringify(msg.content);
									const replaced = s.replace(TIKTOK_LINK_REGEX, (m: string) => convertToFixTikTok(m));
									if (replaced !== s) {
										// store back as string content to ensure preview generation
										msg.content = replaced;
									}
								} catch {}
							}
						}

						// update pluginMessageMap for tracking (optional)
						try {
							const raw = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content ?? "");
							const matches = raw.match(TIKTOK_LINK_REGEX) ?? [];
							const pluginLinks = matches.map((m: string) => trail(m));
							if (pluginLinks.length) {
								pluginMessageMap.set(msg.id, {
									channelId: msg.channelId,
									plugins: pluginLinks,
								});
							} else {
								pluginMessageMap.delete(msg.id);
							}
						} catch {}
					}
				}
			} catch (e) {
				// avoid breaking dispatcher
			}
			return orig.apply(this, args);
		}),
	);

	// Run rehydrate asynchronously so onLoad can continue (best-effort)
	rehydrateAll();

	return () => {
		for (const x of patches) x();
	};
};
