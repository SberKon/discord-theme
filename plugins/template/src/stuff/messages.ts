import { findByStoreName } from "@vendetta/metro";
import { FluxDispatcher } from "@vendetta/metro/common";

const MessageStore = findByStoreName("MessageStore");

export const pluginMessageMap = new Map<string, {
	channelId: string;
	plugins: string[];
}>();

export const invisibleChar = "\x00";

export const updateMessages = (plugin: string) => {
	for (const [id, { channelId, plugins }] of pluginMessageMap.entries()) {
		if (!plugins.includes(plugin)) continue;

		const message = MessageStore.getMessage(channelId, id);
		if (message) {
			const content: string = message.content;

			// toggle invisible char to force MESSAGE_UPDATE re-render (same trick)
			FluxDispatcher.dispatch({
				type: "MESSAGE_UPDATE",
				message: {
					...message,
					content: content.startsWith(invisibleChar)
						? content.slice(invisibleChar.length)
						: invisibleChar + content,
				},
				log_edit: false,
				otherPluginBypass: true,
			});
		}
	}
};
