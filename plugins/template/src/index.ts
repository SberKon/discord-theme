import { findByName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { logger } from "@vendetta";

export function onLoad() {
	const patches: (() => void)[] = [];

	try {
		// Найпростіший спосіб - патчимо Pressable в чарКаунтері
		const ChatInputGuardWrapper = findByName("ChatInputGuardWrapper", false);
		
		if (!ChatInputGuardWrapper) {
			logger.warn("ChatInputGuardWrapper not found");
			return;
		}

		patches.push(
			after("default", ChatInputGuardWrapper, (_, ret) => {
				const walkTree = (node: any) => {
					if (!node) return;
					
					// Шукаємо Text компоненти з чорним кольором
					if (node.props?.color === "TEXT_DEFAULT" && !node.props.style?.color) {
						node.props.color = "TEXT_DEFAULT";
					}
					
					if (Array.isArray(node.props?.children)) {
						node.props.children.forEach(walkTree);
					} else if (node.props?.children?.props) {
						walkTree(node.props.children);
					}
				};
				
				walkTree(ret);
			})
		);
	} catch (error) {
		logger.error("Failed to patch Char Counter theme:", error);
	}

	return () => {
		patches.forEach(p => p());
	};
}

export const onUnload = onLoad;
