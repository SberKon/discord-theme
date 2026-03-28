import { Forms, General } from "@vendetta/ui/components";
import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { DEFAULTS } from "./index";

const { FormSection, FormRow, FormSwitch, FormDivider, FormText } = Forms;
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
    { tag: "{likes}", desc: "Like count (45K)" },
    { tag: "{comments}", desc: "Comments" },
    { tag: "{shares}", desc: "Shares" },
    { tag: "{views}", desc: "Views" },
    { tag: "{saves}", desc: "Saves" },
    { tag: "{description}", desc: "Post text (truncated)" },
    { tag: "{author}", desc: "Nickname" },
    { tag: "{username}", desc: "@handle" },
];

// ─── Mock data for previews ──────────────────────────────────────────
const MOCK = {
    stats: { likes: 45200, comments: 630, shares: 1200, views: 892000, saves: 3100 },
    author: { nickname: "Sample User", username: "sampleuser" },
    description: "Sample TikTok post #fyp #viral",
    media: { photoCount: 7 },
};

function fmtCount(v: number): string {
    if (v >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(v);
}

function truncDesc(text: string, max: number): string {
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
    sectionTitle: { color: "#e8e8f0", fontSize: 15, fontWeight: "700" as const },
    arrow: { color: "#6b6b8a", fontSize: 14 },
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
    tagText: { color: "#7289da", fontSize: 11, fontFamily: "monospace" },
    tagDesc: { color: "#6b6b8a", fontSize: 10, marginLeft: 4 },
    tagRow: { flexDirection: "row" as const, alignItems: "center" as const, marginBottom: 4 },
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
    previewAuthor: { color: "#ffffff", fontSize: 13, fontWeight: "600" as const, marginBottom: 4 },
    previewDesc: { color: "#dbdee1", fontSize: 13, lineHeight: 18, marginBottom: 6 },
    previewFooter: { color: "#949ba4", fontSize: 11, marginTop: 6 },
    previewLabel: {
        color: "#6b6b8a", fontSize: 10, fontWeight: "600" as const,
        textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4,
    },
    label: {
        color: "#6b6b8a", fontSize: 11, fontWeight: "600" as const,
        textTransform: "uppercase" as const, letterSpacing: 1, marginTop: 10, marginBottom: 4,
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
    resetText: { color: "#ff0050", fontSize: 11, fontWeight: "700" as const },
    colorRow: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 8,
        marginVertical: 8,
        paddingHorizontal: 4,
    },
    colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
};

// ─── Collapsible Editor ──────────────────────────────────────────────
function CollapsibleEditor({
    title, icon, storageKey, defaultVal, showTags,
    extraFields, previewFn, forceUpdate,
}: {
    title: string; icon: string; storageKey: string; defaultVal: string;
    showTags: boolean; extraFields?: React.ReactNode;
    previewFn: (template: string) => React.ReactNode; forceUpdate: () => void;
}) {
    const [open, setOpen] = React.useState(false);
    const current = (storage as any)[storageKey] ?? defaultVal;

    return (
        <View>
            <TouchableOpacity style={s.sectionHeader} onPress={() => setOpen(!open)}>
                <Text style={s.sectionTitle}>{icon} {title}</Text>
                <Text style={s.arrow}>{open ? "▼" : "▶"}</Text>
            </TouchableOpacity>

            {open && (
                <View style={s.editorBody}>
                    {showTags && (
                        <View>
                            <Text style={s.previewLabel}>Available tags</Text>
                            <View style={s.tagListWrap}>
                                {TAGS.map(t => (
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

                    {extraFields}

                    <Text style={s.previewLabel}>Preview</Text>
                    {previewFn(current)}

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

    return (
        <View style={s.previewWrap}>
            <View style={[s.previewEmbed, { borderLeftColor: color }]}>
                <Text style={s.previewAuthor}>
                    {MOCK.author.nickname} (@{MOCK.author.username})
                </Text>
                <Text style={s.previewDesc}>{desc}</Text>
                <View style={{
                    backgroundColor: "#111", borderRadius: 4,
                    width: 120, height: 213,
                    alignItems: "center", justifyContent: "center",
                }}>
                    <Text style={{ color: "#6b6b8a", fontSize: 11 }}>▶ Video</Text>
                </View>
                <Text style={s.previewFooter}>{plugin} • 28.03.2026, 19:38</Text>
            </View>
        </View>
    );
}

function PhotoPreview({ template }: { template: string }) {
    const plugin = (storage as any).pluginName || DEFAULTS.pluginName;
    const color = `#${((storage as any).embedColor || DEFAULTS.embedColor).toString(16).padStart(6, "0")}`;
    const maxDesc = (storage as any).maxDescLength || DEFAULTS.maxDescLength;
    const desc = previewReplace(template, maxDesc);
    const total = MOCK.media.photoCount;
    const range = total <= 4 ? `1 - ${total}` : `1 - 4 of ${total}`;

    return (
        <View style={s.previewWrap}>
            <View style={[s.previewEmbed, { borderLeftColor: color }]}>
                <Text style={s.previewAuthor}>
                    {MOCK.author.nickname} (@{MOCK.author.username})
                </Text>
                <Text style={s.previewDesc}>{desc}</Text>
                <View style={{ backgroundColor: "#111", borderRadius: 4, width: 200, height: 120, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#6b6b8a", fontSize: 11 }}>📷 Photo (thumbnail)</Text>
                </View>
                <Text style={s.previewFooter}>{plugin} • {range} • 28.03.2026, 19:38</Text>
            </View>
        </View>
    );
}

function SensitivePreview() {
    const bypass = (storage as any).sensitiveBypass === true;
    const title = (storage as any).sensitiveTitle || DEFAULTS.sensitiveTitle;
    const desc = (storage as any).sensitiveDesc || DEFAULTS.sensitiveDesc;

    return (
        <View style={s.previewWrap}>
            <View style={[s.previewEmbed, { borderLeftColor: bypass ? "#638DFF" : "#faa61a" }]}>
                {bypass ? (
                    <View>
                        <Text style={s.previewAuthor}>@username</Text>
                        <Text style={s.previewDesc}>⚠️ Sensitive Content (bypass)</Text>
                        <View style={{
                            backgroundColor: "#111", borderRadius: 4,
                            width: 120, height: 213,
                            alignItems: "center", justifyContent: "center",
                        }}>
                            <Text style={{ color: "#6b6b8a", fontSize: 11 }}>▶ Video (forced)</Text>
                        </View>
                        <Text style={s.previewFooter}>fxTikTok • 18+</Text>
                    </View>
                ) : (
                    <View>
                        <Text style={[s.previewAuthor, { color: "#faa61a" }]}>{title}</Text>
                        <Text style={s.previewDesc}>{desc}</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

// ─── Main Settings Component ─────────────────────────────────────────
export default () => {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    // Init defaults
    for (const key of Object.keys(DEFAULTS)) {
        if ((storage as any)[key] === undefined) {
            (storage as any)[key] = DEFAULTS[key];
        }
    }

    const color = (storage as any).embedColor as number;
    const colorHex = `#${color.toString(16).padStart(6, "0").toUpperCase()}`;
    const colorPreset = COLOR_PRESETS.find(p => p.value === color);

    // Local state for hex input — allows free typing of partial values
    const [hexInput, setHexInput] = React.useState(colorHex);

    // Sync local input when color changes from presets
    React.useEffect(() => {
        setHexInput(colorHex);
    }, [color]);

    return (
        <ScrollView>
            {/* ── General Settings ── */}
            <FormSection title="⚙️ General">
                {/* Plugin Name */}
                <FormRow label="Plugin Name (Footer)" subLabel={`"${(storage as any).pluginName || DEFAULTS.pluginName}"`} />
                <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    <TextInput
                        style={s.input}
                        value={(storage as any).pluginName || ""}
                        onChangeText={(v: string) => { (storage as any).pluginName = v; forceUpdate(); }}
                        placeholder={DEFAULTS.pluginName}
                        placeholderTextColor="#6b6b8a"
                    />
                </View>
                <FormDivider />

                {/* Embed Color — presets */}
                <FormRow label="Embed Color" subLabel={`${colorPreset?.name || "Custom"} — ${colorHex}`} />
                <View style={[s.colorRow, { paddingHorizontal: 16, paddingBottom: 4 }]}>
                    {COLOR_PRESETS.map(p => (
                        <TouchableOpacity
                            key={p.value}
                            onPress={() => {
                                (storage as any).embedColor = p.value;
                                setHexInput(p.hex);
                                forceUpdate();
                            }}
                            style={[
                                s.colorDot,
                                { backgroundColor: p.hex, borderColor: p.value === color ? "#fff" : "transparent" },
                            ]}
                        />
                    ))}
                    {/* Custom indicator */}
                    <View style={[
                        s.colorDot,
                        {
                            borderColor: !colorPreset ? "#fff" : "transparent",
                            alignItems: "center", justifyContent: "center",
                        },
                    ]}>
                        <Text style={{ fontSize: 18 }}>🎨</Text>
                    </View>
                </View>

                {/* Custom HEX input — local state allows free typing */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                    <Text style={[s.label, { marginTop: 2 }]}>Custom HEX Color</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {/* Live color swatch preview */}
                        <View style={{
                            width: 40, height: 40, borderRadius: 8,
                            backgroundColor: /^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : colorHex,
                            borderWidth: 2, borderColor: "#2a2a40",
                        }} />
                        <TextInput
                            style={[s.input, { flex: 1, marginVertical: 0 }]}
                            value={hexInput}
                            onChangeText={(v: string) => {
                                setHexInput(v);
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
                </View>
                <FormDivider />

                {/* Max Description Length */}
                <FormRow label="Max Description Length" subLabel={`${(storage as any).maxDescLength || DEFAULTS.maxDescLength} characters`} />
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

            {/* ── Enable / Disable Embed Types ── */}
            <FormSection title="🎛 Embed Types">
                <FormRow
                    label="🎬 Video Embeds"
                    subLabel="Replace TikTok video embeds"
                    trailing={
                        <FormSwitch
                            value={(storage as any).enableVideo !== false}
                            onValueChange={(v: boolean) => { (storage as any).enableVideo = v; forceUpdate(); }}
                        />
                    }
                />
                <FormDivider />
                <FormRow
                    label="📷 Photo Embeds"
                    subLabel="Replace TikTok photo embeds"
                    trailing={
                        <FormSwitch
                            value={(storage as any).enablePhoto !== false}
                            onValueChange={(v: boolean) => { (storage as any).enablePhoto = v; forceUpdate(); }}
                        />
                    }
                />
                <FormDivider />
                <FormRow
                    label="⚠️ Sensitive Content Embeds"
                    subLabel="Replace age-restricted embeds"
                    trailing={
                        <FormSwitch
                            value={(storage as any).enableSensitive !== false}
                            onValueChange={(v: boolean) => { (storage as any).enableSensitive = v; forceUpdate(); }}
                        />
                    }
                />
                <FormDivider />
                <FormRow
                    label="🔓 Sensitive Content Bypass"
                    subLabel="Force video playback for age-restricted content"
                    trailing={
                        <FormSwitch
                            value={(storage as any).sensitiveBypass === true}
                            onValueChange={(v: boolean) => { (storage as any).sensitiveBypass = v; forceUpdate(); }}
                        />
                    }
                />
                <FormText style={{ padding: 12, opacity: 0.5, fontSize: 12 }}>
                    Bypass forces the video player with real dimensions so sensitive content can play.
                    Disable specific types above to keep Discord's original embed for that type.
                </FormText>
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
                            onChangeText={(v: string) => { (storage as any).sensitiveTitle = v; forceUpdate(); }}
                            placeholder={DEFAULTS.sensitiveTitle}
                            placeholderTextColor="#6b6b8a"
                        />
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
                    {"\n"}Media uses Discord's proxy URLs for compatibility.
                    {"\n"}Links are never modified.
                </FormText>
            </FormSection>
        </ScrollView>
    );
};