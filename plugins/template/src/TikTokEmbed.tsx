import { General } from "@vendetta/ui/components";
import { React, ReactNative } from "@vendetta/metro/common";
import { DEFAULTS } from "./index";
import { storage } from "@vendetta/plugin";

const { View, Text, TouchableOpacity } = General;
const { Image, Linking, Dimensions } = ReactNative;

const SCREEN_W = Dimensions.get("window").width;
const EMBED_W = Math.min(SCREEN_W - 80, 432);
const PHOTO_SIZE = Math.floor((EMBED_W - 32 - 6) / 2);

// ─── API cache ───────────────────────────────────────────────────────
const apiCache = new Map<string, any>();

function fmtCount(v: number | null | undefined): string {
    if (v === null || v === undefined) return "0";
    if (v >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(v);
}

function fmtDate(publish: any): string {
    if (!publish) return "";
    const raw = publish.iso || (publish.unix ? publish.unix * 1000 : null);
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncDesc(text: string, max: number): string {
    if (!text) return "";
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "...";
}

function cfg(k: string): any {
    try {
        const v = (storage as any)[k];
        return v !== undefined && v !== null && v !== "" ? v : DEFAULTS[k];
    } catch {
        return DEFAULTS[k];
    }
}

// ─── Styles ──────────────────────────────────────────────────────────
const st = {
    wrap: {
        marginTop: 4,
        marginBottom: 4,
        maxWidth: EMBED_W,
    },
    embed: {
        borderLeftWidth: 4,
        backgroundColor: "#2b2d31",
        borderRadius: 8,
        padding: 12,
        paddingBottom: 10,
    },
    authorRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        marginBottom: 6,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 8,
        backgroundColor: "#383a40",
    },
    authorName: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600" as const,
    },
    statsLine: {
        color: "#dbdee1",
        fontSize: 14,
        marginBottom: 4,
    },
    description: {
        color: "#b5bac1",
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
    },
    // Video cover
    videoCover: {
        width: "100%" as const,
        aspectRatio: 9 / 16,
        maxHeight: 340,
        borderRadius: 6,
        backgroundColor: "#111",
    },
    playOverlay: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: "rgba(0,0,0,0.3)",
        borderRadius: 6,
    },
    playBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    playIcon: {
        color: "#ffffff",
        fontSize: 24,
        marginLeft: 3,
    },
    // Photo grid
    photoGrid: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 4,
        marginBottom: 6,
    },
    photoItem: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: 6,
        backgroundColor: "#111",
    },
    // Sensitive
    sensitiveWrap: {
        borderLeftColor: "#faa61a",
    },
    sensitiveTitle: {
        color: "#faa61a",
        fontSize: 15,
        fontWeight: "700" as const,
        marginBottom: 6,
    },
    sensitiveDesc: {
        color: "#dbdee1",
        fontSize: 14,
        lineHeight: 20,
    },
    bypassBtn: {
        marginTop: 10,
        backgroundColor: "rgba(88,101,242,0.2)",
        borderWidth: 1,
        borderColor: "rgba(88,101,242,0.4)",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        alignItems: "center" as const,
    },
    bypassBtnText: {
        color: "#7289da",
        fontSize: 13,
        fontWeight: "600" as const,
    },
    // Footer
    footer: {
        color: "#949ba4",
        fontSize: 12,
        marginTop: 8,
    },
    // Loading
    loadingText: {
        color: "#6b6b8a",
        fontSize: 13,
        padding: 8,
    },
};

// ─── Component ───────────────────────────────────────────────────────
export default function TikTokEmbedView({ url }: { url: string }) {
    const cached = apiCache.get(url);
    const [data, setData] = React.useState<any>(cached || null);
    const [loading, setLoading] = React.useState(!cached);
    const [imgError, setImgError] = React.useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (apiCache.has(url)) {
            setData(apiCache.get(url));
            setLoading(false);
            return;
        }

        let cancelled = false;
        fetch(`https://tiktok-api-discord.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`)
            .then(r => r.json())
            .then(d => {
                if (cancelled) return;
                if (d?.ok) {
                    apiCache.set(url, d);
                    setData(d);
                }
                setLoading(false);
            })
            .catch(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [url]);

    const color = cfg("embedColor");
    const colorHex = `#${color.toString(16).padStart(6, "0")}`;
    const pluginName = cfg("pluginName");
    const maxDesc = cfg("maxDescLength");

    // Loading
    if (loading) {
        return (
            <View style={st.wrap}>
                <View style={[st.embed, { borderLeftColor: colorHex }]}>
                    <Text style={st.loadingText}>⏳ Loading TikTok...</Text>
                </View>
            </View>
        );
    }

    if (!data) {
        return (
            <View style={st.wrap}>
                <View style={[st.embed, { borderLeftColor: "#ff0050" }]}>
                    <Text style={st.loadingText}>❌ Failed to load TikTok</Text>
                </View>
            </View>
        );
    }

    // ── Sensitive ────────────────────────────────────────────────────
    if (data.type === "sensitive" || data.sensitive) {
        const bypass = cfg("sensitiveBypass");
        const videoId = data.id;
        const playerUrl = data.playerUrl || (videoId ? `https://www.tiktok.com/player/v1/${videoId}` : null);

        if (bypass && playerUrl) {
            return (
                <View style={st.wrap}>
                    <View style={[st.embed, { borderLeftColor: colorHex }]}>
                        <Text style={st.statsLine}>**⚠️ Sensitive Content** (bypass)</Text>
                        <TouchableOpacity
                            style={st.bypassBtn}
                            onPress={() => Linking.openURL(playerUrl)}
                        >
                            <Text style={st.bypassBtnText}>▶ Open in TikTok Player</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL(data.resolved_url || url)}>
                            <Text style={[st.footer, { color: "#7289da" }]}>Open on TikTok ↗</Text>
                        </TouchableOpacity>
                        <Text style={st.footer}>{pluginName} • 18+</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={st.wrap}>
                <View style={[st.embed, st.sensitiveWrap]}>
                    <Text style={st.sensitiveTitle}>{cfg("sensitiveTitle")}</Text>
                    <Text style={st.sensitiveDesc}>{cfg("sensitiveDesc")}</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(data.resolved_url || url)}>
                        <Text style={[st.footer, { color: "#7289da" }]}>Open on TikTok ↗</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Shared data ──────────────────────────────────────────────────
    const author = data.author || {};
    const stats = data.stats || {};
    const media = data.media || {};
    const username = author.username || "unknown";
    const nickname = author.nickname || "Unknown";
    const ts = fmtDate(data.publish);
    const desc = truncDesc(data.description || "", maxDesc);

    const statsText = `❤️ ${fmtCount(stats.likes)}  💬 ${fmtCount(stats.comments)}  🔁 ${fmtCount(stats.shares)}`;
    const tiktokUrl = data.resolved_url || data.input_url || url;

    // ── Photo ────────────────────────────────────────────────────────
    if (data.type === "photo") {
        const photos: string[] = (media.photos || []).slice(0, 4);
        const total = media.photoCount || photos.length;
        const range = total <= 4 ? `1 - ${total}` : `1 - 4 of ${total}`;

        return (
            <View style={st.wrap}>
                <View style={[st.embed, { borderLeftColor: colorHex }]}>
                    {/* Author */}
                    <TouchableOpacity
                        style={st.authorRow}
                        onPress={() => Linking.openURL(`https://tiktok.com/@${username}`)}
                    >
                        {author.avatar ? (
                            <Image
                                source={{ uri: author.avatar }}
                                style={st.avatar}
                            />
                        ) : (
                            <View style={st.avatar} />
                        )}
                        <Text style={st.authorName}>{nickname} (@{username})</Text>
                    </TouchableOpacity>

                    {/* Stats */}
                    <Text style={st.statsLine}>{statsText}</Text>

                    {/* Description */}
                    {desc ? <Text style={st.description} numberOfLines={3}>{desc}</Text> : null}

                    {/* Photo 2x2 Grid */}
                    <View style={st.photoGrid}>
                        {photos.map((photoUrl: string, idx: number) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => Linking.openURL(tiktokUrl)}
                            >
                                {!imgError[photoUrl] ? (
                                    <Image
                                        source={{ uri: photoUrl }}
                                        style={st.photoItem}
                                        resizeMode="cover"
                                        onError={() => setImgError(prev => ({ ...prev, [photoUrl]: true }))}
                                    />
                                ) : (
                                    <View style={[st.photoItem, { alignItems: "center", justifyContent: "center" }]}>
                                        <Text style={{ color: "#6b6b8a", fontSize: 11 }}>📷</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Footer */}
                    <Text style={st.footer}>{pluginName} • {range} • {ts}</Text>
                </View>
            </View>
        );
    }

    // ── Video (default) ──────────────────────────────────────────────
    const coverUrl = media.cover || media.originCover || media.dynamicCover || "";
    const videoUrl = media.videoUrl || `https://offload.tnktok.com/generate/video/${data.id || ""}`;

    return (
        <View style={st.wrap}>
            <View style={[st.embed, { borderLeftColor: colorHex }]}>
                {/* Author */}
                <TouchableOpacity
                    style={st.authorRow}
                    onPress={() => Linking.openURL(`https://tiktok.com/@${username}`)}
                >
                    {author.avatar ? (
                        <Image
                            source={{ uri: author.avatar }}
                            style={st.avatar}
                        />
                    ) : (
                        <View style={st.avatar} />
                    )}
                    <Text style={st.authorName}>{nickname} (@{username})</Text>
                </TouchableOpacity>

                {/* Stats */}
                <Text style={st.statsLine}>{statsText}</Text>

                {/* Description */}
                {desc ? <Text style={st.description} numberOfLines={3}>{desc}</Text> : null}

                {/* Video Cover + Play Button */}
                <TouchableOpacity
                    style={{ position: "relative", marginBottom: 4 }}
                    onPress={() => Linking.openURL(tiktokUrl)}
                    activeOpacity={0.8}
                >
                    {coverUrl && !imgError["cover"] ? (
                        <Image
                            source={{ uri: coverUrl }}
                            style={st.videoCover}
                            resizeMode="cover"
                            onError={() => setImgError(prev => ({ ...prev, cover: true }))}
                        />
                    ) : (
                        <View style={[st.videoCover, { alignItems: "center", justifyContent: "center" }]}>
                            <Text style={{ color: "#6b6b8a" }}>Video</Text>
                        </View>
                    )}
                    <View style={st.playOverlay}>
                        <View style={st.playBtn}>
                            <Text style={st.playIcon}>▶</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Footer */}
                <Text style={st.footer}>{pluginName} • {ts}</Text>
            </View>
        </View>
    );
}
