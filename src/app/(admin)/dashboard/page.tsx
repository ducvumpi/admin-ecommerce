"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@app/libs/supabaseClient";
// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
    blue: "#2563EB",
    green: "#059669",
    amber: "#D97706",
    red: "#DC2626",
    purple: "#7C3AED",
    slate: "#64748B",
    bg: "var(--color-background-tertiary)",
    card: "var(--color-background-primary)",
    border: "var(--color-border-tertiary)",
    text: "var(--color-text-primary)",
    muted: "var(--color-text-secondary)",
};
type Channel = {
    name: string;
    rev: number;
    pct: number;
    color?: string;
};

type Segment = {
    label: string;
    rev: number;
    cnt: number;
    aov: number;
};

type PeriodData = {
    rev: number;
    revPrev: number;
    ord: number;
    ordPrev: number;
    aov: number;
    aovPrev: number;
    conv: number;
    convPrev: number;
    refund: number;
    refundPrev: number;
    gross: number;
    cogs: number;
    daily: number[];
    labels: string[];
    channels: Channel[];
    segments: Segment[];
};
declare global {
    interface Window {
        Chart: any;
        sendPrompt: (text: string) => void; // ✅
    }
}
// ─── Static data ──────────────────────────────────────────────────────────────
// const PERIOD_DATA = {
//     7: {
//         rev: 68.2, revPrev: 61.4, ord: 924, ordPrev: 887,
//         aov: 73800, aovPrev: 69200, conv: 3.5, convPrev: 3.1,
//         refund: 5.2, refundPrev: 6.1, gross: 81.3, cogs: 13.1,
//         daily: [8.2, 9.1, 7.8, 10.4, 11.2, 10.8, 10.7],
//         labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
//         channels: [{ name: "Website", rev: 30.7, pct: 45, color: T.blue },
//         { name: "App", rev: 20.5, pct: 30, color: T.green },
//         { name: "Shopee", rev: 10.2, pct: 15, color: T.amber },
//         { name: "Lazada", rev: 6.8, pct: 10, color: T.red }],
//         segments: [{ label: "Khách VIP", rev: 24.5, cnt: 102, aov: 240200 },
//         { label: "Khách cũ", rev: 28.1, cnt: 541, aov: 51900 },
//         { label: "Khách mới", rev: 15.6, cnt: 281, aov: 55500 }],
//     },
//     30: {
//         rev: 284.5, revPrev: 253.1, ord: 3842, ordPrev: 3553,
//         aov: 74000, aovPrev: 71200, conv: 3.8, convPrev: 3.3,
//         refund: 4.8, refundPrev: 5.9, gross: 339.1, cogs: 54.6,
//         daily: [7, 9, 8, 12, 10, 11, 9, 8, 10, 13, 14, 11, 10, 9, 8, 11, 12, 10, 9, 8, 11, 13, 15, 14, 12, 10, 9, 8, 11, 12],
//         labels: Array.from({ length: 30 }, (_, i) => { const d = new Date("2026-04-18"); d.setDate(d.getDate() - 29 + i); return `${d.getMonth() + 1}/${d.getDate()}`; }),
//         channels: [{ name: "Website", rev: 128.0, pct: 45, color: T.blue },
//         { name: "App", rev: 85.4, pct: 30, color: T.green },
//         { name: "Shopee", rev: 42.7, pct: 15, color: T.amber },
//         { name: "Lazada", rev: 28.4, pct: 10, color: T.red }],
//         segments: [{ label: "Khách VIP", rev: 102.4, cnt: 421, aov: 243200 },
//         { label: "Khách cũ", rev: 117.2, cnt: 2281, aov: 51380 },
//         { label: "Khách mới", rev: 64.9, cnt: 1140, aov: 56930 }],
//     },
//     90: {
//         rev: 812.3, revPrev: 714.8, ord: 11204, ordPrev: 10102,
//         aov: 72500, aovPrev: 70800, conv: 4.1, convPrev: 3.7,
//         refund: 4.1, refundPrev: 5.4, gross: 968.4, cogs: 156.1,
//         daily: Array.from({ length: 90 }, (_, i) => Math.round(7 + Math.sin(i / 7) * 3 + Math.random() * 4)),
//         labels: Array.from({ length: 90 }, (_, i) => { const d = new Date("2026-04-18"); d.setDate(d.getDate() - 89 + i); return `${d.getMonth() + 1}/${d.getDate()}`; }),
//         channels: [{ name: "Website", rev: 365.5, pct: 45, color: T.blue },
//         { name: "App", rev: 243.7, pct: 30, color: T.green },
//         { name: "Shopee", rev: 121.8, pct: 15, color: T.amber },
//         { name: "Lazada", rev: 81.3, pct: 10, color: T.red }],
//         segments: [{ label: "Khách VIP", rev: 292.4, cnt: 1204, aov: 242900 },
//         { label: "Khách cũ", rev: 334.2, cnt: 6520, aov: 51260 },
//         { label: "Khách mới", rev: 185.7, cnt: 3480, aov: 53360 }],
//     },
// };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number, d = 1) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(d);
const fmtNumber = (v: number) => {
    if (!v) return "0";
    return v.toLocaleString("vi-VN");
};
const fmtVND = (v: number) => {
    if (!v) return "₫0";

    const abs = Math.abs(v);

    if (abs >= 1_000_000_000_000)
        return `₫${(v / 1_000_000_000_000).toFixed(1)}T`; // nghìn tỷ

    if (abs >= 1_000_000_000)
        return `₫${(v / 1_000_000_000).toFixed(1)}B`; // tỷ

    if (abs >= 1_000_000)
        return `₫${(v / 1_000_000).toFixed(1)}M`; // triệu

    if (abs >= 1_000)
        return `₫${(v / 1_000).toFixed(0)}K`; // nghìn

    return `₫${v}`;
};
const fmtM = (v: number) => `₫${v.toFixed(1)}M`;
const fmtV = (v: number) => `₫${(v / 1000).toFixed(0)}K`;
const delta = (cur: number, prev: number) => (((cur - prev) / prev) * 100).toFixed(1);
const up = (cur: number, prev: number) => cur >= prev;

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data = [], color, height = 40 }: any) {
    const safeData = Array.isArray(data) ? data : [];

    if (safeData.length === 0) {
        return null; // hoặc return skeleton UI
    }

    const w = 120, h = height;
    const min = Math.min(...safeData);
    const max = Math.max(...safeData);
    const range = max - min || 1;
    const pts = safeData.map((v, i) => [
        (i / (safeData.length - 1)) * w,
        h - ((v - min) / range) * (h - 4) - 2,
    ]);
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const area = `${d} L${w},${h} L0,${h} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
            <path d={area} fill={color + "18"} />
            <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, prev, format, sparkData, color, suffix = "" }: any) {
    const d = delta(value, prev);
    const isUp = up(value, prev);
    return (
        <div style={{
            background: T.card, border: `0.5px solid ${T.border}`,
            borderRadius: "var(--border-radius-lg)", padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 4,
        }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: T.text, lineHeight: 1.2 }}>
                {format(value)}{suffix}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                    fontSize: 11, padding: "1px 6px", borderRadius: 4,
                    background: isUp ? "#dcfce7" : "#fee2e2",
                    color: isUp ? "#166534" : "#991b1b",
                }}>
                    {isUp ? "▲" : "▼"} {Math.abs(parseFloat(d))}%
                </span>
                <div style={{ width: 80 }}>
                    <Sparkline data={sparkData} color={color} />
                </div>
            </div>
        </div>
    );
}

function RevenueChart({ data, labels, color }: any) {
    const ref = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null); // ✅ fix 'never'

    const build = useCallback(() => {
        if (!window.Chart || !ref.current) return;

        const chartData = Array.isArray(data)
            ? data.map((d: any) => typeof d === "object" ? d.rev : d)
            : [];

        const chartLabels = Array.isArray(labels)
            ? labels.map((l: any) => typeof l === "object" ? l : l)
            : [];

        if (chartRef.current) chartRef.current.destroy(); // ✅ không lỗi nữa
        chartRef.current = new window.Chart(ref.current, {
            type: "bar",
            data: {
                labels: chartLabels,
                datasets: [{
                    label: "Doanh thu (triệu ₫)",
                    data: chartData,
                    backgroundColor: color + "cc",
                    borderRadius: 3,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ₫${ctx.parsed.y.toFixed(1)}M` } } },
                scales: {
                    x: { ticks: { maxTicksLimit: 10, font: { size: 10 } }, grid: { display: false } },
                    y: { ticks: { callback: (v: number) => v + "M", font: { size: 10 } }, grid: { color: "rgba(128,128,128,0.08)" } },
                },
            },
        });
    }, [data, labels, color]);

    useEffect(() => {
        if (window.Chart) { build(); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
        s.onload = build;
        document.head.appendChild(s);
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [build]);

    return (
        <canvas ref={ref} role="img" aria-label="Biểu đồ doanh thu theo ngày">
            Doanh thu theo ngày.
        </canvas>
    );
}


// ─── Channel breakdown ────────────────────────────────────────────────────────
function ChannelBreakdown({ channels }: any) {
    const safeChannels = channels ?? [];
    const max = safeChannels.length ? Math.max(...safeChannels.map((c: { rev: number }) => c.rev)) : 1; return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {safeChannels.map((c: { name: string; rev: number; pct: number, color: string }) => (
                <div key={c.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{c.name}</span>
                        <span style={{ fontSize: 12, color: T.muted }}>{fmtM(c.rev)} · {c.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${(c.rev / max) * 100}%`, height: "100%", background: c.color, borderRadius: 4, transition: "width .6s ease" }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Segment table ────────────────────────────────────────────────────────────
function SegmentTable({ segments }: any) {
    const safeSegments = segments ?? [];
    const total = safeSegments.reduce((s: number, r: { rev: number }) => s + r.rev, 0); return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
                <tr>
                    {["Phân khúc", "Doanh thu", "% tổng", "Đơn", "AOV"].map(h => (
                        <th key={h} style={{
                            textAlign: h === "Phân khúc" ? "left" : "right",
                            fontWeight: 500, fontSize: 10, color: T.muted,
                            padding: "0 0 8px", textTransform: "uppercase", letterSpacing: ".04em",
                            borderBottom: `0.5px solid ${T.border}`,
                        }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {segments.map((s: { label: string; rev: number; cnt: number; aov: number }, i: number) => (
                    <tr key={s.label}>
                        <td style={{ padding: "8px 0", borderBottom: i < segments.length - 1 ? `0.5px solid ${T.border}` : "none", color: T.text, fontWeight: 500 }}>{s.label}</td>
                        <td style={{ padding: "8px 0", borderBottom: i < segments.length - 1 ? `0.5px solid ${T.border}` : "none", textAlign: "right", color: T.text }}>{fmtM(s.rev)}</td>
                        <td style={{ padding: "8px 0", borderBottom: i < segments.length - 1 ? `0.5px solid ${T.border}` : "none", textAlign: "right", color: T.muted }}>{((s.rev / total) * 100).toFixed(1)}%</td>
                        <td style={{ padding: "8px 0", borderBottom: i < segments.length - 1 ? `0.5px solid ${T.border}` : "none", textAlign: "right", color: T.muted }}>{s.cnt.toLocaleString()}</td>
                        <td style={{ padding: "8px 0", borderBottom: i < segments.length - 1 ? `0.5px solid ${T.border}` : "none", textAlign: "right", color: T.text }}>{fmtV(s.aov)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}


function InsightPanel({ period, data }: { period: number; data: PeriodData }) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [activePrompt, setActivePrompt] = useState<string | null>(null);

    const d = data;
    const ch = d.channels ?? [];

    const channelText = [
        `Website ${ch[0]?.pct ?? 0}%`,
        `App ${ch[1]?.pct ?? 0}%`,
        `Shopee ${ch[2]?.pct ?? 0}%`,
        `Lazada ${ch[3]?.pct ?? 0}%`,
    ].join(", ");

    const mg = d.gross
        ? (((d.gross - d.cogs) / d.gross) * 100).toFixed(1)
        : "0.0";
    const vip = d.segments?.[0];
    const vipPct =
        vip && d.rev ? ((vip.rev / d.rev) * 100).toFixed(1) : "0.0";
    const vipAov = vip?.aov ? (vip.aov / 1000).toFixed(0) : "0";

    const baseContext = [
        `Dữ liệu ecommerce — kỳ ${period} ngày gần nhất:`,
        `• Doanh thu ${fmtVND(d.rev)} (kỳ trước ${fmtVND(d.revPrev)}, ${delta(d.rev, d.revPrev)}%)`,
        `• Đơn hàng ${fmtNumber(d.ord)} (kỳ trước ${fmtNumber(d.ordPrev)})`,
        `• AOV ₫${(d.aov / 1000).toFixed(0)}K (kỳ trước ₫${(d.aovPrev / 1000).toFixed(0)}K)`,
        `• Tỉ lệ chuyển đổi ${d.conv}% (kỳ trước ${d.convPrev}%)`,
        `• Tỉ lệ hoàn trả ${d.refund}% (kỳ trước ${d.refundPrev}%)`,
        `• Biên lợi nhuận gộp ${mg}%`,
        `• Kênh: ${channelText}`,
        `• Khách VIP chiếm ${vipPct}% doanh thu, AOV ₫${vipAov}K`,
    ].join("\n");

    const QUICK_PROMPTS: { label: string; icon: string; question: string }[] = [
        {
            icon: "📈",
            label: "Xu hướng & cơ hội",
            question: `${baseContext}\n\nPhân tích xu hướng nổi bật và 2–3 cơ hội tăng trưởng cụ thể với ước tính tác động.`,
        },
        {
            icon: "⚠️",
            label: "Rủi ro cần theo dõi",
            question: `${baseContext}\n\nChỉ ra các rủi ro tiềm ẩn (hoàn trả cao, kênh yếu, AOV giảm...) và đề xuất hành động cụ thể.`,
        },
        {
            icon: "👑",
            label: "Phân tích khách VIP",
            question: `${baseContext}\n\nPhân tích sâu về nhóm khách VIP: tỉ trọng, AOV so với trung bình, và chiến lược giữ chân / upsell.`,
        },
        {
            icon: "🛒",
            label: "Tối ưu kênh bán",
            question: `${baseContext}\n\nSo sánh hiệu quả các kênh, kênh nào đang under-perform, đề xuất phân bổ ngân sách marketing.`,
        },
    ];

    const ask = async (question: string, label: string) => {
        setLoading(true);
        setActivePrompt(label);
        setResult(null);
        try {
            const res = await fetch("/api/ai-analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "mistral-small-latest",
                    max_tokens: 1000,
                    system: "Bạn là chuyên gia phân tích dữ liệu ecommerce. Trả lời súc tích bằng tiếng Việt, dùng bullet points, tối đa 250 từ.",
                    messages: [{ role: "user", content: question }],
                }),
            });

            const json = await res.json();

            // ← Mistral dùng format OpenAI, khác với Anthropic
            const text = json.choices?.[0]?.message?.content ?? null;

            if (!text) {
                setResult(`❌ Không parse được:\n${JSON.stringify(json, null, 2)}`);
                return;
            }
            setResult(text);


        } catch {
            setResult("❌ Lỗi kết nối. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    // Render markdown-like: bold **text**, bullet •
    const renderResult = (text: string) => {
        return text.split("\n").map((line, i) => {
            const formatted = line
                .split(/(\*\*[^*]+\*\*)/)
                .map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={j}>{part.slice(2, -2)}</strong>
                    ) : (
                        part
                    )
                );
            return (
                <div
                    key={i}
                    style={{
                        lineHeight: 1.7,
                        marginBottom: line.trim() === "" ? 6 : 0,
                        paddingLeft:
                            line.trim().startsWith("•") || line.trim().startsWith("-")
                                ? 4
                                : 0,
                    }}
                >
                    {formatted}
                </div>
            );
        });
    };

    return (
        <div
            style={{
                background: T.card,
                border: `0.5px solid ${T.border}`,
                borderRadius: "var(--border-radius-lg)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
                        Phân tích AI
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                        Chọn câu hỏi bên dưới — kết quả hiển thị ngay tại đây
                    </div>
                </div>
                {result && (
                    <button
                        onClick={() => {
                            setResult(null);
                            setActivePrompt(null);
                        }}
                        style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            borderRadius: "var(--border-radius-md)",
                            border: `0.5px solid ${T.border}`,
                            background: "transparent",
                            color: T.muted,
                            cursor: "pointer",
                        }}
                    >
                        Xoá kết quả
                    </button>
                )}
            </div>

            {/* Quick prompt buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {QUICK_PROMPTS.map((p) => (
                    <button
                        key={p.label}
                        onClick={() => ask(p.question, p.label)}
                        disabled={loading}
                        style={{
                            fontSize: 12,
                            padding: "6px 14px",
                            borderRadius: 20,
                            border: `0.5px solid ${activePrompt === p.label ? T.blue : T.border
                                }`,
                            background:
                                activePrompt === p.label
                                    ? T.blue + "14"
                                    : "var(--color-background-secondary)",
                            color: activePrompt === p.label ? T.blue : T.text,
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading && activePrompt !== p.label ? 0.5 : 1,
                            transition: "all .15s",
                            fontWeight: activePrompt === p.label ? 500 : 400,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <span>{p.icon}</span>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Result area */}
            {(loading || result) && (
                <div
                    style={{
                        background: "var(--color-background-secondary)",
                        borderRadius: "var(--border-radius-md)",
                        padding: 16,
                        minHeight: 80,
                        position: "relative",
                    }}
                >
                    {loading ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                color: T.muted,
                                fontSize: 12,
                            }}
                        >
                            {/* Animated dots */}
                            <div style={{ display: "flex", gap: 4 }}>
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: "50%",
                                            background: T.blue,
                                            animation: `bounce 1.2s ease-in-out ${i * 0.2
                                                }s infinite`,
                                        }}
                                    />
                                ))}
                            </div>
                            <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }`}</style>
                            Đang phân tích...
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.7 }}>
                            {/* Active prompt label */}
                            <div
                                style={{
                                    fontSize: 11,
                                    color: T.blue,
                                    fontWeight: 500,
                                    marginBottom: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                }}
                            >
                                <span>
                                    {QUICK_PROMPTS.find((p) => p.label === activePrompt)?.icon}
                                </span>
                                {activePrompt}
                            </div>
                            {renderResult(result!)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
// ─── Profit margin bar ────────────────────────────────────────────────────────
function MarginBar({ gross, cogs }: any) {
    const net = gross - cogs;
    const margin = ((net / gross) * 100).toFixed(1);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11, color: T.muted }}>Tổng doanh thu gộp</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{fmtVND(gross)}</span>
            </div>
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 1 }}>
                <div style={{ flex: net, background: T.green }} />
                <div style={{ flex: cogs, background: T.red + "99" }} />
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.muted }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: T.green, marginRight: 4 }} />Lợi nhuận gộp {fmtVND(net)} ({margin}%)</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: T.red + "99", marginRight: 4 }} />COGS {fmtVND(cogs)}</span>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RevenueDashboard() {
    const [period, setPeriod] = useState(7);
    const [data, setData] = useState<PeriodData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            const { data, error } = await supabase
                .rpc("get_period_data", { p: period });

            if (error) {
                console.error("RPC ERROR:", error);
                setData(null);
                setLoading(false);
                return;
            }

            // ⚠️ FIX: RPC thường trả array → lấy phần tử đầu
            const result = Array.isArray(data) ? data[0] : data;

            setData(result ?? null);
            setLoading(false);
        }

        fetchData();
    }, [period]);

    const defaultData: PeriodData = {
        rev: 0,
        revPrev: 0,
        ord: 0,
        ordPrev: 0,
        aov: 0,
        aovPrev: 0,
        conv: 0,
        convPrev: 0,
        refund: 0,
        refundPrev: 0,
        gross: 0,
        cogs: 0,
        daily: [],
        labels: [],
        channels: [],
        segments: []
    };

    const d = data ?? defaultData;
    const ch = d.channels ?? [];

    const channelText = [
        `Website ${ch[0]?.pct ?? 0}%`,
        `App ${ch[1]?.pct ?? 0}%`,
        `Shopee ${ch[2]?.pct ?? 0}%`,
        `Lazada ${ch[3]?.pct ?? 0}%`,
    ].join(", ");
    const handleAnalyze = () => {
        const mg = d.gross
            ? (((d.gross - d.cogs) / d.gross) * 100).toFixed(1)
            : "0.0";

        const vip = d.segments?.[0];

        const vipPct =
            vip && d.rev
                ? ((vip.rev / d.rev) * 100).toFixed(1)
                : "0.0";

        const vipAov = vip?.aov
            ? (vip.aov / 1000).toFixed(0)
            : "0";

        const prompt = [
            `Phân tích chuyên sâu doanh thu ecommerce — kỳ ${period} ngày gần nhất:`,
            `• Doanh thu ${fmtVND(d.rev)} (kỳ trước ${fmtVND(d.revPrev)}, tăng ${delta(d.rev, d.revPrev)}%)`,
            `• Đơn hàng ${fmtNumber(d.ord)} (kỳ trước ${fmtNumber(d.ordPrev)})`,
            `• AOV ₫${(d.aov / 1000).toFixed(0)}K (kỳ trước ₫${(d.aovPrev / 1000).toFixed(0)}K)`,
            `• Tỉ lệ chuyển đổi ${d.conv}% (kỳ trước ${d.convPrev}%)`,
            `• Tỉ lệ hoàn trả ${d.refund}% (kỳ trước ${d.refundPrev}%)`,
            `• Biên lợi nhuận gộp ${mg}%`,
            `• Kênh: ${channelText}`,
            `• Khách VIP chiếm ${vipPct}% doanh thu, AOV ₫${vipAov}K`,
            `Hãy phân tích: xu hướng nổi bật, rủi ro cần theo dõi, và 2–3 cơ hội tăng trưởng cụ thể với ước tính tác động.`,
        ].join("\n");

        if (typeof window !== "undefined" && window.sendPrompt) {
            window.sendPrompt(prompt);
        }
    };

    const KPIS = [
        { label: "Doanh thu", value: d.rev, prev: d.revPrev, format: fmtVND, color: T.blue, sparkData: (d.daily ?? []).slice(-7) },
        {
            label: "Đơn hàng",
            value: d.ord,
            prev: d.ordPrev,
            format: fmtNumber,   // ✅ dùng cái này
            color: T.green,
            sparkData: (d.daily ?? []).slice(-7)
        }, { label: "AOV", value: d.aov, prev: d.aovPrev, format: fmtVND, color: T.amber, sparkData: (d.daily ?? []).slice(-7) },
        { label: "Tỉ lệ chuyển đổi", value: d.conv, prev: d.convPrev, format: (v: number) => `${v}`, suffix: "%", color: T.purple, sparkData: (d.daily ?? []).slice(-7) },
        {
            label: "Tỉ lệ hoàn trả",
            value: d.refund,
            prev: d.refundPrev,
            format: (v: number) => v.toFixed(1),   // hoặc toFixed(0) nếu không muốn số lẻ
            suffix: "%",
            color: T.red
        }];

    const S = {
        card: { background: T.card, border: `0.5px solid ${T.border}`, borderRadius: "var(--border-radius-lg)", padding: 16 },
        label: { fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 12 },
    };

    return (
        <div style={{ padding: 20, background: "white", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, color: T.text, margin: 0 }}>Phân tích doanh thu</h1>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Tất cả kênh · Cập nhật hôm nay</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                    {[7, 30, 90].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            style={{
                                fontSize: 12, padding: "5px 12px",
                                borderRadius: "var(--border-radius-md)",
                                border: `0.5px solid ${period === p ? T.blue : T.border}`,
                                background: period === p ? T.blue : "transparent",
                                color: period === p ? "#fff" : T.muted,
                                cursor: "pointer", transition: "all .15s",
                            }}
                        >
                            {p}N
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
                {KPIS.map(k => <KpiCard key={k.label} {...k} />)}
            </div>

            {/* Revenue chart + Channel */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div style={S.card}>
                    <div style={S.label}>Doanh thu theo ngày</div>
                    <div style={{ position: "relative", width: "100%", height: 200 }}>
                        <RevenueChart data={d.daily} labels={d.labels} color={T.blue} />
                    </div>
                </div>
                <div style={S.card}>
                    <div style={S.label}>Phân bổ theo kênh</div>
                    <ChannelBreakdown channels={d.channels} />
                </div>
            </div>

            {/* Margin + Segment */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div style={S.card}>
                    <div style={S.label}>Biên lợi nhuận</div>
                    <MarginBar gross={d.gross} cogs={d.cogs} />
                </div>
                <div style={S.card}>
                    <div style={S.label}>Doanh thu theo phân khúc khách hàng</div>
                    <SegmentTable segments={d.segments} />
                </div>
            </div>


            <InsightPanel period={period} data={d} />
        </div>
    );
}