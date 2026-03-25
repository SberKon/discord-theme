import { Forms } from "@vendetta/ui/components";
import { React } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";

const { FormSection, FormRow, FormSwitch, FormDivider } = Forms;

const COLOR_PRESETS: { name: string; value: number }[] = [
    { name: "💜 Purple (tnktok)", value: 6513919 },
    { name: "❤️ Red (fixtiktok)", value: 16711760 },
    { name: "💗 Pink (TikTok)", value: 16657493 },
    { name: "💙 Blue", value: 3447003 },
    { name: "💚 Green", value: 5763719 },
];

export default () => {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    // Ensure defaults on first render
    if (storage.embedColor === undefined) storage.embedColor = 6513919;
    if (storage.showFooter === undefined) storage.showFooter = true;
    if (storage.sensitiveHandling === undefined) storage.sensitiveHandling = "warn";

    const currentColor = storage.embedColor as number;
    const preset = COLOR_PRESETS.find((p) => p.value === currentColor);
    const colorHex = `#${currentColor.toString(16).padStart(6, "0").toUpperCase()}`;

    return (
        <FormSection title="TikTok Embed Fix">
            {/* ── Show Footer ── */}
            <FormRow
                label='Show "TikTok" Footer'
                subLabel="Display footer text at the bottom of embeds"
                trailing={
                    <FormSwitch
                        value={storage.showFooter !== false}
                        onValueChange={(v: boolean) => {
                            storage.showFooter = v;
                            forceUpdate();
                        }}
                    />
                }
            />
            <FormDivider />

            {/* ── Sensitive Content ── */}
            <FormRow
                label="Hide Sensitive Content"
                subLabel="Remove age-restricted embeds instead of showing a warning"
                trailing={
                    <FormSwitch
                        value={storage.sensitiveHandling === "hide"}
                        onValueChange={(v: boolean) => {
                            storage.sensitiveHandling = v ? "hide" : "warn";
                            forceUpdate();
                        }}
                    />
                }
            />
            <FormDivider />

            {/* ── Color Preset ── */}
            <FormRow
                label="Embed Color"
                subLabel={`${preset?.name || "Custom"} — ${colorHex}`}
                onPress={() => {
                    const idx = COLOR_PRESETS.findIndex(
                        (p) => p.value === currentColor
                    );
                    const next =
                        COLOR_PRESETS[(idx + 1) % COLOR_PRESETS.length];
                    storage.embedColor = next.value;
                    forceUpdate();
                }}
            />
        </FormSection>
    );
};