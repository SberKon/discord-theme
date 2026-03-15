import { instead } from "@vendetta/patcher";
import { FluxDispatcher } from "@vendetta/metro/common";
import { pluginMessageMap } from "./messages";
import { TIKTOK_LINK_REGEX, convertToFixTikTok } from "../convert";

function trail(x: string) {
	return x.replace(/(\/)?$/, "/");
}

export default () => {
	const patches: (() => void)[] = [];

	patches.push(
		instead("dispatch", FluxDispatcher, (args, orig) => {
			try {
				const action = args[0];
				if (action && (action.type === "MESSAGE_CREATE" || action.type === "MESSAGE_UPDATE")) {
					// action.message is typical; sometimes payload shape differs — handle both
					const msg = action.message ?? action.message?.message ?? action;
					if (msg && msg.id && (typeof msg.content === "string" || msg.content)) {
						const raw = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
						const matches = raw.match(TIKTOK_LINK_REGEX) ?? [];
						const pluginLinks = matches.map(m => trail(m));

						if (pluginLinks.length) {
							msg.embeds ??= [];
							for (const url of pluginLinks) {
								const fixed = convertToFixTikTok(url);
								// avoid duplicates
								if (!msg.embeds.some((e: any) => e && e.url && trail(e.url) === trail(fixed))) {
									msg.embeds.push({ url: fixed });
								}
							}

							pluginMessageMap.set(msg.id, {
								channelId: msg.channelId,
								plugins: pluginLinks,
							});
						} else {
							pluginMessageMap.delete(msg.id);
						}
					}
				}
			} catch (e) {
				// silent fallback - avoid breaking dispatcher
				// optional: logger.warn("[TikTokEmbedFix] dispatch patch error", e);
			}
			return orig.apply(this, args);
		}),
	);

	return () => {
		for (const x of patches) x();
	};
};
