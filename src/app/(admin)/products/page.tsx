"use client";

import {
  DateField, DeleteButton, EditButton,
  List, ShowButton, useTable,
} from "@refinedev/antd";
import { type BaseRecord, useMany, useUpdate } from "@refinedev/core";
import { Input, Select, Space, Table, message } from "antd";
import Image from "next/image";
import React, { useRef, useState, useEffect } from "react";

interface Category { id: number; name: string }
interface ProductVariant { id: number; size: string; color: string; stock: number }
interface Product { id: number; name: string; category_id: number; product_variants?: ProductVariant[] }

function badgeStyle(stock: number): React.CSSProperties {
  if (stock === 0) return { background: "#FCEBEB", color: "#A32D2D" };
  if (stock < 10) return { background: "#FAEEDA", color: "#854F0B" };
  return { background: "#EAF3DE", color: "#3B6D11" };
}

// ─── Ô stock ──────────────────────────────────────────────────────────────────
function StockCell({ variant }: { variant: ProductVariant }) {
  const [editing, setEditing] = useState(false);
  const [stock, setStock] = useState(variant.stock ?? 0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: update } = useUpdate();

  function startEdit() {
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  }

  function save() {
    if (stock === variant.stock) { setEditing(false); return; }
    setSaving(true);
    update(
      { resource: "product_variants", id: variant.id, values: { stock } },
      {
        onSuccess: () => { setSaving(false); setEditing(false); message.success("Đã cập nhật"); },
        onError: () => { setSaving(false); setStock(variant.stock); setEditing(false); message.error("Lỗi cập nhật"); },
      }
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef} type="number" min={0} value={stock} disabled={saving}
        onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setStock(variant.stock); setEditing(false); } }}
        onBlur={save}
        style={{
          width: 56, padding: "3px 6px", borderRadius: 6, textAlign: "center",
          border: "1.5px solid #378ADD", fontSize: 13, fontWeight: 500,
          outline: "none", color: "inherit", background: "inherit",
        }}
      />
    );
  }

  return (
    <span
      onClick={startEdit} title="Nhấn để chỉnh sửa"
      style={{
        ...badgeStyle(stock), display: "inline-block", padding: "3px 10px",
        borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer",
        minWidth: 36, textAlign: "center", transition: "opacity .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = ".7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {stock}
    </span>
  );
}

// ─── Ma trận size × màu ───────────────────────────────────────────────────────
function VariantMatrix({ variants }: { variants: ProductVariant[] }) {
  const unique = Array.from(new Map(variants.map((v) => [v.id, v])).values()) as ProductVariant[];
  const colorList = [...new Map(unique.map((v) => [v.color, { name: v.color, hex: v.color }])).values()];
  const sizeList = [...new Set(unique.map((v) => v.size))];
  const bg = "var(--ant-color-bg-container)";
  const bgSub = "var(--ant-color-fill-quaternary)";

  return (
    <div style={{ padding: "10px 48px 16px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: `auto ${sizeList.map(() => "1fr").join(" ")}`,
        gap: 1, background: "var(--ant-color-border-secondary)",
        borderRadius: 10, overflow: "hidden", width: "fit-content",
        marginBottom: 10, maxWidth: "100%",
      }}>
        <div style={{ background: bgSub, padding: "8px 20px" }} />
        {sizeList.map((s) => (
          <div key={s} style={{
            background: bgSub, padding: "8px 20px", textAlign: "center",
            fontSize: 11, color: "var(--ant-color-text-secondary)",
            fontWeight: 500, letterSpacing: ".4px",
          }}>{s}</div>
        ))}
        {colorList.map(({ name, hex }) => {
          const isHex = /^#|^rgb|^hsl/.test(hex ?? "");
          return (
            <React.Fragment key={name}>
              <div style={{
                background: bgSub, padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
              }}>
                <span style={{
                  width: 11, height: 11, borderRadius: "50%", flexShrink: 0,
                  background: isHex ? hex : "#ccc", border: "1px solid rgba(0,0,0,0.12)",
                  display: "inline-block",
                }} />
                <span style={{ fontSize: 12, color: "var(--ant-color-text)" }}>{name ?? "–"}</span>
              </div>
              {sizeList.map((s) => {
                const v = unique.find((u) => u.color === name && u.size === s);
                return (
                  <div key={s} style={{
                    background: bg, padding: "8px 12px", textAlign: "center",
                    minWidth: 80, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {v ? <StockCell variant={v} /> : <span style={{ color: "#ccc", fontSize: 13 }}>–</span>}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 4 }}>
        {[
          { bg: "#EAF3DE", bd: "#C0DD97", label: "Còn hàng" },
          { bg: "#FAEEDA", bd: "#FAC775", label: "Sắp hết (<10)" },
          { bg: "#FCEBEB", bd: "#F7C1C1", label: "Hết hàng" },
        ].map(({ bg, bd, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#888" }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${bd}`, display: "inline-block" }} />
            {label}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: "#bbb" }}>Nhấn vào số để chỉnh sửa · Enter để lưu · Esc để huỷ</div>
    </div>
  );
}

// ─── Main List ────────────────────────────────────────────────────────────────
export default function BlogPostList() {
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "out" | "low" | "ok">("all");
  const [currentPage, setCurrentPage] = useState(1);
  // ✅ ĐÚNG cho @refinedev/antd v6 + @refinedev/core v5
  const { tableProps } = useTable({
    resource: "products",
    meta: { select: `*, product_variants (id, size, color, stock)` },
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc", // 🔥 mới nhất lên đầu
        },
      ],
    },
    syncWithLocation: false,
    pagination: { pageSize: 1000 },
  });

  // Lấy data và loading trực tiếp từ tableProps — luôn hoạt động mọi version
  const products: any[] = (tableProps.dataSource as any[]) ?? [];
  const isLoading = tableProps.loading as boolean;

  const categoryIds = products.map((item: any) => Number(item.category_id)).filter(Number.isFinite);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterStatus]);

  const { result: { data: categoryQuery }, query: { isLoading: categoryIsLoading } } = useMany({
    resource: "categories", ids: categoryIds,
  });

  // ── Filter logic ──
  const q = query.trim().toLowerCase();
  const filteredProducts = products.filter((item: any) => {
    const variants: ProductVariant[] = item.product_variants ?? [];
    const matchName = !q || item.name?.toLowerCase().includes(q);
    const matchVariant = !q || variants.some((v) =>
      v.color?.toLowerCase().includes(q) || v.size?.toLowerCase().includes(q)
    );
    const passText = matchName || matchVariant;
    const unique = Array.from(new Map(variants.map((v) => [v.id, v])).values()) as ProductVariant[];
    const total = unique.reduce((sum, v) => sum + (v.stock ?? 0), 0);
    const passStock =
      filterStatus === "all" ||
      (filterStatus === "out" && total === 0) ||
      (filterStatus === "low" && total > 0 && total < 10) ||
      (filterStatus === "ok" && total >= 10);
    return passText && passStock;
  });

  const formatCurrency = (v: any) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

  // ✅ Slice thủ công — AntD không tự tính index gốc nữa
  const PAGE_SIZE = 10;
  const pagedData = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <List title="Sản phẩm">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Input.Search
          placeholder="Tìm tên sản phẩm, màu, size…"
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={(v) => setQuery(v)}
          style={{ width: 300 }}
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          style={{ width: 160 }}
          options={[
            { value: "all", label: "Tất cả tồn kho" },
            { value: "ok", label: "✅ Còn hàng" },
            { value: "low", label: "⚠️ Sắp hết" },
            { value: "out", label: "❌ Hết hàng" },
          ]}
        />
        {(query || filterStatus !== "all") && (
          <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>
            {filteredProducts.length} / {products.length} sản phẩm
          </span>
        )}
      </div>

      <Table
        dataSource={pagedData}        // ✅ bỏ {...tableProps}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: PAGE_SIZE,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          total: filteredProducts.length,
          showTotal: (total) => `${total} sản phẩm`,
        }}
        expandable={{
          expandedRowRender: (record: any) => (
            <VariantMatrix variants={record.product_variants ?? []} />
          ),
          rowExpandable: (record: any) => (record.product_variants ?? []).length > 0,
        }}
      >
        {/* <Table.Column dataIndex="id" title="ID" width={60} /> */}
        <Table.Column dataIndex="id" title={"Mã đơn hàng"} />
        <Table.Column dataIndex="name" title="Tên sản phẩm" />
        <Table.Column dataIndex="description" title="Mô tả" />
        <Table.Column dataIndex="base_price" title="Giá cơ bản" render={formatCurrency} />
        <Table.Column
          title="Bộ sưu tập"
          render={(record: Product) => {
            if (categoryIsLoading) return "Đang tải...";
            const cat = ((categoryQuery ?? []) as Category[]).find((c) => c.id === record.category_id);
            return cat?.name ?? "-";
          }}
        />
        <Table.Column
          title="Hình ảnh" dataIndex="image_url"
          render={(images: string[] | string | null) => {
            if (!images) return null;
            let list: string[] = [];
            try { list = typeof images === "string" ? JSON.parse(images) : images; } catch { list = []; }
            return <>{list?.map((img, i) => typeof img === "string" && img && (
              <Image key={i} src={img} alt="" width={50} height={50} style={{ marginRight: 8, borderRadius: 6 }} />
            ))}</>;
          }}
        />
        <Table.Column
          title="Tổng tồn kho"
          render={(record: any) => {
            const variants: ProductVariant[] = record.product_variants ?? [];
            const unique = Array.from(new Map(variants.map((v) => [v.id, v])).values()) as ProductVariant[];
            const total = unique.reduce((sum, v) => sum + (v.stock ?? 0), 0);
            if (!unique.length) return <span style={{ color: "#bbb" }}>–</span>;
            return (
              <span style={{ ...badgeStyle(total), display: "inline-block", padding: "2px 10px", borderRadius: 10, fontSize: 12, fontWeight: 500 }}>
                {total}
              </span>
            );
          }}
        />
        <Table.Column
          dataIndex="created_at"
          title="Ngày khởi tạo"
          render={(v: any) => (
            <DateField value={v} format="DD/MM/YYYY" />
          )}
        />
        <Table.Column
          title="Hành động"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              {/* <ShowButton hideText size="small" recordItemId={record.id} /> */}
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />

      </Table>
    </List>
  );
}