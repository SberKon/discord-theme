import { before } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";

let unpatch: (() => void) | undefined;

export default {
  onLoad() {
    const MessageActions = findByProps("sendMessage");

    unpatch = before("sendMessage", MessageActions, (args) => {
      let content = args?.[1]?.content;
      if (!content) return;

      const regex =
        /(https?:\/\/(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/[^\s]+)/g;

      const matches = content.match(regex);
      if (!matches) return;

      matches.forEach((link: string) => {
        const fixed = link
          .replace("www.tiktok.com", "fixtiktok.com")
          .replace("tiktok.com", "fixtiktok.com")
          .replace("vt.tiktok.com", "fixtiktok.com")
          .replace("vm.tiktok.com", "fixtiktok.com");

        const injected = `TikTok\n${fixed}\n${link}`;
        content = content.replace(link, injected);
      });

      args[1].content = content;
    });
  },

  onUnload() {
    unpatch?.();
  }
};
