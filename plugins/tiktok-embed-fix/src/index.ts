import { before } from "@vendetta/patcher";
import { findByProps } from "@vendetta/metro";

// Patch список для cleanup
const patches: (() => void)[] = [];

// Всі TikTok домени які треба замінити
const TIKTOK_DOMAINS = [
  /https?:\/\/(www\.)?tiktok\.com/g,
  /https?:\/\/vt\.tiktok\.com/g,
  /https?:\/\/vm\.tiktok\.com/g,
  /https?:\/\/m\.tiktok\.com/g,
];

/**
 * Замінює TikTok посилання на fixtiktok.com
 * Зберігає оригінальний path і query string
 */
function fixTikTokUrl(url: string): string {
  // vt.tiktok.com/ZSuPgwwBC/ → fixtiktok.com/ZSuPgwwBC/
  url = url.replace(
    /https?:\/\/(vt|vm|m)\.tiktok\.com\//g,
    "https://fixtiktok.com/"
  );

  // www.tiktok.com або tiktok.com → fixtiktok.com
  url = url.replace(
    /https?:\/\/(www\.)?tiktok\.com\//g,
    "https://fixtiktok.com/"
  );

  return url;
}

/**
 * Рекурсивно обходить embed data та замінює TikTok посилання
 */
function patchEmbeds(embeds: any[]): any[] {
  if (!embeds || !Array.isArray(embeds)) return embeds;

  return embeds.map((embed) => {
    if (!embed) return embed;

    const patched = { ...embed };

    // Патчимо url самого embed
    if (patched.url && typeof patched.url === "string") {
      patched.url = fixTikTokUrl(patched.url);
    }

    // Патчимо video url
    if (patched.video?.url && typeof patched.video.url === "string") {
      patched.video = {
        ...patched.video,
        url: fixTikTokUrl(patched.video.url),
        proxy_url: patched.video.proxy_url
          ? fixTikTokUrl(patched.video.proxy_url)
          : patched.video.proxy_url,
      };
    }

    // Патчимо thumbnail
    if (patched.thumbnail?.url && typeof patched.thumbnail.url === "string") {
      patched.thumbnail = {
        ...patched.thumbnail,
        url: fixTikTokUrl(patched.thumbnail.url),
      };
    }

    return patched;
  });
}

/**
 * Перевіряє чи є посилання TikTok
 */
function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/i.test(url);
}

export default {
  onLoad() {
    // Знаходимо Message компонент / embed renderer
    const MessageEmbeds = findByProps("renderEmbeds", "getEmbeds");
    const EmbedManager = findByProps("getMessageEmbeds");
    const RenderMessage = findByProps("renderMessageContent");

    // Патч 1: getEmbeds / renderEmbeds
    if (MessageEmbeds?.getEmbeds) {
      patches.push(
        before("getEmbeds", MessageEmbeds, (args) => {
          const [message] = args;
          if (message?.embeds) {
            const hasTikTok = message.embeds.some(
              (e: any) => e?.url && isTikTokUrl(e.url)
            );
            if (hasTikTok) {
              message.embeds = patchEmbeds(message.embeds);
            }
          }
        })
      );
    }

    // Патч 2: EmbedManager
    if (EmbedManager?.getMessageEmbeds) {
      patches.push(
        before("getMessageEmbeds", EmbedManager, (args) => {
          const [message] = args;
          if (message?.embeds) {
            const hasTikTok = message.embeds.some(
              (e: any) => e?.url && isTikTokUrl(e.url)
            );
            if (hasTikTok) {
              message.embeds = patchEmbeds(message.embeds);
            }
          }
        })
      );
    }

    // Патч 3: renderMessageContent (якщо є)
    if (RenderMessage?.renderMessageContent) {
      patches.push(
        before("renderMessageContent", RenderMessage, (args) => {
          const [props] = args;
          if (props?.message?.embeds) {
            const hasTikTok = props.message.embeds.some(
              (e: any) => e?.url && isTikTokUrl(e.url)
            );
            if (hasTikTok) {
              props.message = {
                ...props.message,
                embeds: patchEmbeds(props.message.embeds),
              };
            }
          }
        })
      );
    }

    // Патч 4: Патчимо через FluxDispatcher — для real-time повідомлень
    const FluxDispatcher = findByProps("_currentDispatchActionType", "dispatch");
    if (FluxDispatcher?.dispatch) {
      patches.push(
        before("dispatch", FluxDispatcher, (args) => {
          const [action] = args;

          // MESSAGE_CREATE та MESSAGE_UPDATE — нові/оновлені повідомлення
          if (
            action?.type === "MESSAGE_CREATE" ||
            action?.type === "MESSAGE_UPDATE"
          ) {
            const message = action.message || action.optimistic;
            if (message?.embeds) {
              const hasTikTok = message.embeds.some(
                (e: any) => e?.url && isTikTokUrl(e.url)
              );
              if (hasTikTok) {
                message.embeds = patchEmbeds(message.embeds);
              }
            }
          }
        })
      );
    }
  },

  onUnload() {
    // Прибираємо всі патчі
    patches.forEach((unpatch) => unpatch());
    patches.length = 0;
  },
};
