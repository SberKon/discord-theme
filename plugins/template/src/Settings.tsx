import { Forms } from "@vendetta/ui/components";
import { useState, useEffect } from "react";
import { logger } from "@vendetta";

const { FormText, FormDivider } = Forms;

export default () => {
	const [logs, setLogs] = useState<string[]>([]);

	useEffect(() => {
		const originalLog = logger.log;
		const originalWarn = logger.warn;

		logger.log = function(...args: any[]) {
			const message = args.join(" ");
			if (message.includes("TikTok")) {
				setLogs(prev => [message, ...prev.slice(0, 9)]);
			}
			return originalLog.apply(this, args);
		};

		logger.warn = function(...args: any[]) {
			const message = args.join(" ");
			if (message.includes("TikTok")) {
				setLogs(prev => [`⚠️ ${message}`, ...prev.slice(0, 9)]);
			}
			return originalWarn.apply(this, args);
		};

		return () => {
			logger.log = originalLog;
			logger.warn = originalWarn;
		};
	}, []);

	return (
		<>
			<FormText>
				TikTok Embed Fix - Automatically converts TikTok links to fixtiktok.com
			</FormText>
			<FormDivider />
			<FormText style={{ color: "#a8aab4", marginTop: 10 }}>
				Debug Logs (last 10):
			</FormText>
			{logs.length === 0 ? (
				<FormText style={{ color: "#72767d", marginTop: 5 }}>
					No TikTok link replacements yet...
				</FormText>
			) : (
				logs.map((log, i) => (
					<FormText key={i} style={{ color: "#b5bac1", fontSize: 12, marginTop: 3 }}>
						{log}
					</FormText>
				))
			)}
		</>
	);
}
