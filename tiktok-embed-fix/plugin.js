export default {
  name: "TikTokEmbedFix",
  description: "Fix TikTok embeds using fxTikTok",
  authors: [{ name: "SberKon" }],

  start() {
    const MessageActions = vendetta.findByProps("sendMessage");

    this.unpatch = vendetta.patcher.before(
      "sendMessage",
      MessageActions,
      (args) => {

        let content = args?.[1]?.content;
        if (!content) return;

        const regex = /(https?:\/\/(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/[^\s]+)/g;

        const matches = content.match(regex);
        if (!matches) return;

        matches.forEach(link => {

          const fixed = link
            .replace("www.tiktok.com", "fixtiktok.com")
            .replace("tiktok.com", "fixtiktok.com")
            .replace("vt.tiktok.com", "fixtiktok.com")
            .replace("vm.tiktok.com", "fixtiktok.com");

          const injected = `TikTok\n${fixed}\n${link}`;

          content = content.replace(link, injected);

        });

        args[1].content = content;
      }
    );
  },

  stop() {
    this.unpatch?.();
  }
};
