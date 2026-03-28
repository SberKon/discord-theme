import { Forms, General } from "@vendetta/ui/components";
import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { DEFAULTS } from "./index";

const { FormSection, FormRow, FormSwitch, FormInput, FormDivider, FormText } = Forms;
const { ScrollView, View, Text, TouchableOpacity, TextInput } = General;

// ─── Color presets ───────────────────────────────────────────────────
const COLOR_PRESETS = [
    { name: "💜 Purple", value: 0x638DFF, hex: "#638DFF" },
    { name: "❤️ Red", value: 0xFF0050, hex: "#FF0050" },
    { name: "💗 Pink", value: 0xFE2C55, hex: "#FE2C55" },
    { name: "💙 Blue", value: 0x3498DB, hex: "#3498DB" },
    { name: "💚 Green", value: 0x57F287, hex: "#57F287" },
    { name: "🤍 White", value: 0xFFFFFF, hex: "#FFFFFF" },
    { name: "🖤 Dark", value: 0x2B2D31, hex: "#2B2D31" },
];

// ─── Available tags ──────────────────────────────────────────────────
const TAGS = [
    { tag: "{likes}", desc: "Like count (45K, 1.2M)" },
    { tag: "{comments}", desc: "Comment count" },
    { tag: "{shares}", desc: "Share count" },
    { tag: "{views}", desc: "View count" },
    { tag: "{saves}", desc: "Save count" },
    { tag: "{description}", desc: "Post description (truncated)" },
    { tag: "{author}", desc: "Author nickname" },
    { tag: "{username}", desc: "Author @handle" },
];

// ─── Mock data for previews ──────────────────────────────────────────
const MOCK = {
    stats: { likes: 45200, comments: 630, shares: 1200, views: 892000, saves: 3100 },
    author: { nickname: "Sample User", username: "sampleuser", avatar: null },
    description: "This is a sample TikTok post description with some hashtags #fyp #viral",
    publish: { iso: new Date().toISOString() },
    media: { photoCount: 7 },
};

function fmtCount(v: number | null | undefined): string {
    if (v === null || v === undefined) return "0";
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(v);
}

function truncDesc(text: string, max: number): string {
    if (!text) return "";
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "...";
}

function previewReplace(template: string, maxDesc: number): string {
    return template
        .replace(/\{likes\}/g, fmtCount(MOCK.stats.likes))
        .replace(/\{comments\}/g, fmtCount(MOCK.stats.comments))
        .replace(/\{shares\}/g, fmtCount(MOCK.stats.shares))
        .replace(/\{views\}/g, fmtCount(MOCK.stats.views))
        .replace(/\{saves\}/g, fmtCount(MOCK.stats.saves))
        .replace(/\{description\}/g, truncDesc(MOCK.description, maxDesc))
        .replace(/\{author\}/g, MOCK.author.nickname)
        .replace(/\{username\}/g, `@${MOCK.author.username}`);
}

// ─── Styles ──────────────────────────────────────────────────────────
const s = {
    sectionHeader: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#1a1a2e",
        borderRadius: 10,
        marginHorizontal: 12,
        marginTop: 10,
    },
    sectionTitle: {
        color: "#e8e8f0",
        fontSize: 15,
        fontWeight: "700" as const,
    },
    arrow: {
        color: "#6b6b8a",
        fontSize: 14,
    },
    editorBody: {
        marginHorizontal: 12,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 14,
        backgroundColor: "#12121a",
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        borderWidth: 1,
        borderColor: "#2a2a40",
        borderTopWidth: 0,
    },
    tagListWrap: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 6,
        marginBottom: 10,
    },
    tagChip: {
        backgroundColor: "rgba(88,101,242,0.15)",
        borderWidth: 1,
        borderColor: "rgba(88,101,242,0.3)",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    tagText: {
        color: "#7289da",
        fontSize: 11,
        fontFamily: "monospace",
    },
    tagDesc: {
        color: "#6b6b8a",
        fontSize: 10,
        marginLeft: 4,
    },
    tagRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        marginBottom: 4,
    },
    input: {
        backgroundColor: "#1a1a28",
        borderWidth: 1,
        borderColor: "#2a2a40",
        borderRadius: 8,
        color: "#e8e8f0",
        fontSize: 13,
        fontFamily: "monospace",
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginVertical: 6,
    },
    previewWrap: {
        backgroundColor: "#313338",
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    previewEmbed: {
        borderLeftWidth: 4,
        borderLeftColor: "#638DFF",
        backgroundColor: "#2b2d31",
        borderRadius: 6,
        padding: 10,
    },
    previewAuthor: {
        color: "#ffffff",
        fontSize: 13,
        fontWeight: "600" as const,
        marginBottom: 4,
    },
    previewDesc: {
        color: "#dbdee1",
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 6,
    },
    previewFooter: {
        color: "#949ba4",
        fontSize: 11,
        marginTop: 6,
    },
    previewLabel: {
        color: "#6b6b8a",
        fontSize: 10,
        fontWeight: "600" as const,
        textTransform: "uppercase" as const,
        letterSpacing: 1,
        marginBottom: 4,
    },
    resetBtn: {
        alignSelf: "flex-end" as const,
        backgroundColor: "rgba(255,0,80,0.15)",
        borderWidth: 1,
        borderColor: "rgba(255,0,80,0.3)",
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginTop: 8,
    },
    resetText: {
        color: "#ff0050",
        fontSize: 11,
        fontWeight: "700" as const,
    },
    colorRow: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 8,
        marginVertical: 8,
        paddingHorizontal: 4,
    },
    colorDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
    },
    label: {
        color: "#6b6b8a",
        fontSize: 11,
        fontWeight: "600" as const,
        textTransform: "uppercase" as const,
        letterSpacing: 1,
        marginTop: 10,
        marginBottom: 4,
    },
};

// ─── Collapsible Editor Component ────────────────────────────────────
function CollapsibleEditor({
    title,
    icon,
    storageKey,
    defaultVal,
    showTags,
    extraFields,
    previewFn,
    forceUpdate,
}: {
    title: string;
    icon: string;
    storageKey: string;
    defaultVal: string;
    showTags: boolean;
    extraFields?: React.ReactNode;
    previewFn: (template: string) => React.ReactNode;
    forceUpdate: () => void;
}) {
    const [open, setOpen] = React.useState(false);
    const current = (storage as any)[storageKey] ?? defaultVal;

    return (
        <View>
            <TouchableOpacity
                style={s.sectionHeader}
                onPress={() => setOpen(!open)}
            >
                <Text style={s.sectionTitle}>{icon} {title}</Text>
                <Text style={s.arrow}>{open ? "▼" : "▶"}</Text>
            </TouchableOpacity>

            {open && (
                <View style={s.editorBody}>
                    {/* Tags reference */}
                    {showTags && (
                        <View>
                            <Text style={s.previewLabel}>Available tags</Text>
                            <View style={s.tagListWrap}>
                                {TAGS.map((t) => (
                                    <View key={t.tag} style={s.tagRow}>
                                        <View style={s.tagChip}>
                                            <Text style={s.tagText}>{t.tag}</Text>
                                        </View>
                                        <Text style={s.tagDesc}>{t.desc}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Template input */}
                    <Text style={s.label}>Template</Text>
                    <TextInput
                        style={s.input}
                        value={current}
                        onChangeText={(v: string) => {
                            (storage as any)[storageKey] = v;
                            forceUpdate();
                        }}
                        placeholder={defaultVal}
                        placeholderTextColor="#6b6b8a"
                        multiline
                    />

                    {/* Extra fields (e.g. sensitive title) */}
                    {extraFields}

                    {/* Live preview */}
                    <Text style={s.previewLabel}>Preview</Text>
                    {previewFn(current)}

                    {/* Reset button */}
                    <TouchableOpacity
                        style={s.resetBtn}
                        onPress={() => {
                            (storage as any)[storageKey] = defaultVal;
                            forceUpdate();
                        }}
                    >
                        <Text style={s.resetText}>↻ Reset to default</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Preview renders ─────────────────────────────────────────────────
function VideoPreview({ template }: { template: string }) {
    const plugin = (storage as any).pluginName || DEFAULTS.pluginName;
    const color = `#${((storage as any).embedColor || DEFAULTS.embedColor).toString(16).padStart(6, "0")}`;
    const maxDesc = (storage as any).maxDescLength || DEFAULTS.maxDescLength;
    const desc = previewReplace(template, maxDesc);
    const ts = "28.03.2026, 19:38";

    return (
        <View style={s.previewWrap}>
            <View style={[s.previewEmbed, { borderLeftColor: color }]}>
                <Text style={s.previewAuthor}>
                    {MOCK.author.nickname} (@{MOCK.author.username})
                </Text>
                <Text style={s.previewDesc}>{desc}</Text>
                <View style={{
                    backgroundColor: "#111",
                    borderRadius: 4,
                    width: 120,
                    height: 213,
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <Text style={{ color: "#6b6b8a", fontSize: 11 }}>▶ Video</Text>
                </View>
                <Text style={s.previewFooter}>{plugin} • {ts}</Text>
            </View>
        </View>
    );
}

function PhotoPreview({ template }: { template: string }) {
    const plugin = (storage as any).pluginName || DEFAULTS.pluginName;
    const color = `#${((storage as any).embedColor || DEFAULTS.embedColor).toString(16).padStart(6, "0")}`;
    const maxDesc = (storage as any).maxDescLength || DEFAULTS.maxDescLength;
    const desc = previewReplace(template, maxDesc);
    const ts = "28.03.2026, 19:38";
    const totalPhotos = MOCK.media.photoCount;
    const range = totalPhotos <= 4 ? `1 - ${totalPhotos}` : `1 - 4 of ${totalPhotos}`;

    return (
        <View style={s.previewWrap}>
            <View style={[s.previewEmbed, { borderLeftColor: color }]}>
                <Text style={s.previewAuthor}>
                    {MOCK.author.nickname} (@{MOCK.author.username})
                </Text>
                <Text style={s.previewDesc}>{desc}</Text>
                <View style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 4,
                }}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={{
                            backgroundColor: "#111",
                            borderRadius: 4,
                            width: 60,
                            height: 60,
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <Text style={{ color: "#6b6b8a", fontSize: 9 }}>📷 {i}</Text>
                        </View>
                    ))}
                </View>
                <Text style={s.previewFooter}>{plugin} • {range} • {ts}</Text>
            </View>
        </View>
    );
}

function SensitivePreview() {
    const title = (storage as any).sensitiveTitle || DEFAULTS.sensitiveTitle;
    const desc = (storage as any).sensitiveDesc || DEFAULTS.sensitiveDesc;

    return (
        <View style={s.previewWrap}>
            <View style={[s.previewEmbed, { borderLeftColor: "#faa61a" }]}>
                <Text style={[s.previewAuthor, { color: "#faa61a" }]}>{title}</Text>
                <Text style={s.previewDesc}>{desc}</Text>
            </View>
        </View>
    );
}

// ─── Main Settings ───────────────────────────────────────────────────
export default () => {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    // Init defaults
    if ((storage as any).pluginName === undefined) (storage as any).pluginName = DEFAULTS.pluginName;
    if ((storage as any).embedColor === undefined) (storage as any).embedColor = DEFAULTS.embedColor;
    if ((storage as any).maxDescLength === undefined) (storage as any).maxDescLength = DEFAULTS.maxDescLength;
    if ((storage as any).videoDescLine === undefined) (storage as any).videoDescLine = DEFAULTS.videoDescLine;
    if ((storage as any).photoDescLine === undefined) (storage as any).photoDescLine = DEFAULTS.photoDescLine;
    if ((storage as any).sensitiveTitle === undefined) (storage as any).sensitiveTitle = DEFAULTS.sensitiveTitle;
    if ((storage as any).sensitiveDesc === undefined) (storage as any).sensitiveDesc = DEFAULTS.sensitiveDesc;

    const color = (storage as any).embedColor as number;
    const colorHex = `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
    const colorPreset = COLOR_PRESETS.find((p) => p.value === color);

    return (
        <ScrollView>
            {/* ── General ── */}
            <FormSection title="⚙️ General">
                {/* Plugin Name */}
                <FormRow
                    label="Plugin Name (Footer)"
                    subLabel={`"${(storage as any).pluginName || DEFAULTS.pluginName}"`}
                />
                <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    <TextInput
                        style={s.input}
                        value={(storage as any).pluginName || ""}
                        onChangeText={(v: string) => {
                            (storage as any).pluginName = v;
                            forceUpdate();
                        }}
                        placeholder={DEFAULTS.pluginName}
                        placeholderTextColor="#6b6b8a"
                    />
                </View>
                <FormDivider />

                {/* Embed Color */}
                <FormRow
                    label="Embed Color"
                    subLabel={`${colorPreset?.name || "Custom"} — ${colorHex}`}
                />
                <View style={[s.colorRow, { paddingHorizontal: 16, paddingBottom: 8 }]}>
                    {COLOR_PRESETS.map((p) => (
                        <TouchableOpacity
                            key={p.value}
                            onPress={() => {
                                (storage as any).embedColor = p.value;
                                forceUpdate();
                            }}
                            style={[
                                s.colorDot,
                                {
                                    backgroundColor: p.hex,
                                    borderColor: p.value === color ? "#fff" : "transparent",
                                },
                            ]}
                        />
                    ))}
                </View>
                <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    <Text style={[s.label, { marginTop: 2 }]}>Custom HEX</Text>
                    <TextInput
                        style={s.input}
                        value={colorHex}
                        onChangeText={(v: string) => {
                            const hex = v.startsWith("#") ? v : `#${v}`;
                            if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                                (storage as any).embedColor = parseInt(hex.slice(1), 16);
                                forceUpdate();
                            }
                        }}
                        placeholder="#638DFF"
                        placeholderTextColor="#6b6b8a"
                        maxLength={7}
                        autoCapitalize="characters"
                    />
                </View>
                <FormDivider />

                {/* Max Description Length */}
                <FormRow
                    label="Max Description Length"
                    subLabel={`${(storage as any).maxDescLength || DEFAULTS.maxDescLength} characters`}
                />
                <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    <TextInput
                        style={s.input}
                        value={String((storage as any).maxDescLength || DEFAULTS.maxDescLength)}
                        onChangeText={(v: string) => {
                            const n = parseInt(v, 10);
                            if (!isNaN(n) && n > 0) {
                                (storage as any).maxDescLength = n;
                                forceUpdate();
                            }
                        }}
                        placeholder="150"
                        placeholderTextColor="#6b6b8a"
                        keyboardType="number-pad"
                    />
                </View>
            </FormSection>

            {/* ── Video Embed Editor ── */}
            <CollapsibleEditor
                title="Video Embed"
                icon="🎬"
                storageKey="videoDescLine"
                defaultVal={DEFAULTS.videoDescLine}
                showTags={true}
                forceUpdate={forceUpdate}
                previewFn={(tpl) => <VideoPreview template={tpl} />}
            />

            {/* ── Photo Embed Editor ── */}
            <CollapsibleEditor
                title="Photo Embed"
                icon="📷"
                storageKey="photoDescLine"
                defaultVal={DEFAULTS.photoDescLine}
                showTags={true}
                forceUpdate={forceUpdate}
                previewFn={(tpl) => <PhotoPreview template={tpl} />}
            />

            {/* ── Sensitive Content Editor ── */}
            <CollapsibleEditor
                title="Sensitive Content"
                icon="⚠️"
                storageKey="sensitiveDesc"
                defaultVal={DEFAULTS.sensitiveDesc}
                showTags={false}
                forceUpdate={forceUpdate}
                extraFields={
                    <View>
                        <Text style={s.label}>Title</Text>
                        <TextInput
                            style={s.input}
                            value={(storage as any).sensitiveTitle || ""}
                            onChangeText={(v: string) => {
                                (storage as any).sensitiveTitle = v;
                                forceUpdate();
                            }}
                            placeholder={DEFAULTS.sensitiveTitle}
                            placeholderTextColor="#6b6b8a"
                        />
                        {/* Reset title too */}
                        <TouchableOpacity
                            style={[s.resetBtn, { marginTop: 4 }]}
                            onPress={() => {
                                (storage as any).sensitiveTitle = DEFAULTS.sensitiveTitle;
                                (storage as any).sensitiveDesc = DEFAULTS.sensitiveDesc;
                                forceUpdate();
                            }}
                        >
                            <Text style={s.resetText}>↻ Reset title & description</Text>
                        </TouchableOpacity>
                    </View>
                }
                previewFn={() => <SensitivePreview />}
            />

            {/* ── About ── */}
            <FormSection title="ℹ️ About">
                <FormText style={{ padding: 12, opacity: 0.6, fontSize: 12 }}>
                    TikTok Embed Fix • Custom embeds via API.
                    {"\n"}Links are never modified. Template tags get replaced live.
                </FormText>
            </FormSection>
        </ScrollView>
    );
};