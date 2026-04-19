"use client";

import {
  DateField, DeleteButton, EditButton,
  List, useTable,
} from "@refinedev/antd";
import { type BaseRecord, useMany, useUpdate, useCreate, useInvalidate } from "@refinedev/core";
import {
  Input, Select, Space, Table, message, Button, Modal, Form,
  InputNumber, DatePicker, Tag, Tabs, Popconfirm
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import Image from "next/image";
import React, { useRef, useState, useEffect } from "react";
import dayjs from "dayjs";
import { supabase } from "../../libs/supabaseClient";

interface Category { id: number; name: string }
interface ProductVariant { id: number; size: string; color: string; stock: number }
interface Product { id: number; name: string; category_id: number; product_variants?: ProductVariant[] }
interface Coupon {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────
function badgeStyle(stock: number): React.CSSProperties {
  if (stock === 0) return { background: "#FCEBEB", color: "#A32D2D" };
  if (stock < 10) return { background: "#FAEEDA", color: "#854F0B" };
  return { background: "#EAF3DE", color: "#3B6D11" };
}

const fmtVND = (v: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v ?? 0);

const getCouponStatus = (record: Coupon) => {
  const now = dayjs();
  if (record.end_date && dayjs(record.end_date).isBefore(now))
    return { label: "Hết hạn", color: "red" };
  if (record.start_date && dayjs(record.start_date).isAfter(now))
    return { label: "Chưa bắt đầu", color: "orange" };
  return { label: "Đang hoạt động", color: "green" };
};

// ─── StockCell ────────────────────────────────────────────
function StockCell({ variant }: { variant: ProductVariant }) {
  const [editing, setEditing] = useState(false);
  const [stock, setStock] = useState(variant.stock ?? 0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: update } = useUpdate();

  function startEdit() { setEditing(true); setTimeout(() => { inputRef.current?.select(); }, 0); }

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

  if (editing) return (
    <input ref={inputRef} type="number" min={0} value={stock} disabled={saving}
      onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
      onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setStock(variant.stock); setEditing(false); } }}
      onBlur={save}
      style={{ width: 56, padding: "3px 6px", borderRadius: 6, textAlign: "center", border: "1.5px solid #378ADD", fontSize: 13, fontWeight: 500, outline: "none", color: "inherit", background: "inherit" }}
    />
  );

  return (
    <span onClick={startEdit} title="Nhấn để chỉnh sửa"
      style={{ ...badgeStyle(stock), display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", minWidth: 36, textAlign: "center", transition: "opacity .12s" }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = ".7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >{stock}</span>
  );
}

// ─── VariantMatrix ────────────────────────────────────────
function VariantMatrix({ variants }: { variants: ProductVariant[] }) {
  const unique = Array.from(new Map(variants.map((v) => [v.id, v])).values()) as ProductVariant[];
  const colorList = [...new Map(unique.map((v) => [v.color, { name: v.color, hex: v.color }])).values()];
  const sizeList = [...new Set(unique.map((v) => v.size))];
  const bg = "var(--ant-color-bg-container)";
  const bgSub = "var(--ant-color-fill-quaternary)";

  return (
    <div style={{ padding: "10px 48px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: `auto ${sizeList.map(() => "1fr").join(" ")}`, gap: 1, background: "var(--ant-color-border-secondary)", borderRadius: 10, overflow: "hidden", width: "fit-content", marginBottom: 10, maxWidth: "100%" }}>
        <div style={{ background: bgSub, padding: "8px 20px" }} />
        {sizeList.map((s) => (
          <div key={s} style={{ background: bgSub, padding: "8px 20px", textAlign: "center", fontSize: 11, color: "var(--ant-color-text-secondary)", fontWeight: 500, letterSpacing: ".4px" }}>{s}</div>
        ))}
        {colorList.map(({ name, hex }) => {
          const isHex = /^#|^rgb|^hsl/.test(hex ?? "");
          return (
            <React.Fragment key={name}>
              <div style={{ background: bgSub, padding: "10px 16px", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", flexShrink: 0, background: isHex ? hex : "#ccc", border: "1px solid rgba(0,0,0,0.12)", display: "inline-block" }} />
                <span style={{ fontSize: 12, color: "var(--ant-color-text)" }}>{name ?? "–"}</span>
              </div>
              {sizeList.map((s) => {
                const v = unique.find((u) => u.color === name && u.size === s);
                return (
                  <div key={s} style={{ background: bg, padding: "8px 12px", textAlign: "center", minWidth: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

// ─── CouponFormModal ──────────────────────────────────────
function CouponFormModal({ open, onClose, editRecord }: { open: boolean; onClose: () => void; editRecord?: Coupon | null }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { mutateAsync: createCoupon } = useCreate();
  const invalidate = useInvalidate();
  const isEdit = !!editRecord;

  useEffect(() => {
    if (open) {
      if (editRecord) {
        form.setFieldsValue({
          ...editRecord,
          start_date: editRecord.start_date ? dayjs(editRecord.start_date) : null,
          end_date: editRecord.end_date ? dayjs(editRecord.end_date) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editRecord, form]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        discount_type: values.discount_type,
        discount_value: values.discount_value,
        min_order_value: values.min_order_value ?? 0,
        max_discount: values.max_discount ?? null,
        start_date: values.start_date ? values.start_date.toISOString() : null,
        end_date: values.end_date ? values.end_date.toISOString() : null,
        usage_limit: values.usage_limit ?? null,
      };

      if (isEdit) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editRecord!.id);
        if (error) throw error;
        message.success("Cập nhật mã thành công");
      } else {
        await createCoupon({ resource: "coupons", values: payload });
        message.success("Tạo mã giảm giá thành công");
      }

      invalidate({ resource: "coupons", invalidates: ["list"] });
      form.resetFields();
      onClose();
    } catch (err: any) {
      message.error(err?.message ?? "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Chỉnh sửa mã giảm giá" : "Tạo mã giảm giá mới"}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={() => form.submit()}
      okText={isEdit ? "Cập nhật" : "Tạo mã"}
      confirmLoading={submitting}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="code" label="Mã giảm giá" rules={[{ required: true, message: "Nhập mã" }]}>
          <Input placeholder="VD: SALE50" onChange={e => form.setFieldValue("code", e.target.value.toUpperCase())} disabled={isEdit} />
        </Form.Item>

        <Form.Item name="discount_type" label="Loại giảm giá" rules={[{ required: true, message: "Chọn loại" }]}>
          <Select placeholder="Chọn loại">
            <Select.Option value="percent">Phần trăm (%)</Select.Option>
            <Select.Option value="fixed">Số tiền cố định (₫)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.discount_type !== cur.discount_type}>
          {({ getFieldValue }) => (
            <Form.Item
              name="discount_value"
              label={getFieldValue("discount_type") === "percent" ? "Phần trăm giảm (%)" : "Số tiền giảm (₫)"}
              rules={[{ required: true, message: "Nhập giá trị" }]}
            >
              <InputNumber min={0} max={getFieldValue("discount_type") === "percent" ? 100 : undefined}
                style={{ width: "100%" }} addonAfter={getFieldValue("discount_type") === "percent" ? "%" : "₫"} />
            </Form.Item>
          )}
        </Form.Item>

        <Form.Item name="min_order_value" label="Đơn tối thiểu (₫)">
          <InputNumber min={0} style={{ width: "100%" }} placeholder="0" addonAfter="₫" />
        </Form.Item>

        <Form.Item name="max_discount" label="Giảm tối đa (₫) — chỉ áp dụng cho loại %">
          <InputNumber min={0} style={{ width: "100%" }} placeholder="Không giới hạn" addonAfter="₫" />
        </Form.Item>

        <Form.Item name="usage_limit" label="Giới hạn số lần dùng">
          <InputNumber min={1} style={{ width: "100%" }} placeholder="Để trống = không giới hạn" />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Form.Item name="start_date" label="Ngày bắt đầu">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="end_date" label="Ngày kết thúc">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}

// ─── Tab Sản phẩm ─────────────────────────────────────────
function ProductTab() {
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "out" | "low" | "ok">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { tableProps } = useTable({
    resource: "products",
    meta: { select: `*, product_variants (id, size, color, stock)` },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: false,
    pagination: { pageSize: 1000 },
  });

  const products: any[] = (tableProps.dataSource as any[]) ?? [];
  const isLoading = tableProps.loading as boolean;
  const categoryIds = products.map((item: any) => Number(item.category_id)).filter(Number.isFinite);

  useEffect(() => { setCurrentPage(1); }, [query, filterStatus]);

  const { result: { data: categoryQuery }, query: { isLoading: categoryIsLoading } } = useMany({
    resource: "categories", ids: categoryIds,
  });

  const q = query.trim().toLowerCase();
  const filteredProducts = products.filter((item: any) => {
    const variants: ProductVariant[] = item.product_variants ?? [];
    const matchName = !q || item.name?.toLowerCase().includes(q);
    const matchVariant = !q || variants.some((v) => v.color?.toLowerCase().includes(q) || v.size?.toLowerCase().includes(q));
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

  const formatCurrency = (v: any) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
  const PAGE_SIZE = 10;
  const pagedData = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Input.Search placeholder="Tìm tên sản phẩm, màu, size…" allowClear value={query}
          onChange={(e) => setQuery(e.target.value)} onSearch={(v) => setQuery(v)} style={{ width: 300 }} />
        <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 160 }}
          options={[
            { value: "all", label: "Tất cả tồn kho" },
            { value: "ok", label: "✅ Còn hàng" },
            { value: "low", label: "⚠️ Sắp hết" },
            { value: "out", label: "❌ Hết hàng" },
          ]} />
        {(query || filterStatus !== "all") && (
          <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>
            {filteredProducts.length} / {products.length} sản phẩm
          </span>
        )}
      </div>

      <Table dataSource={pagedData} rowKey="id" loading={isLoading}
        pagination={{ pageSize: PAGE_SIZE, current: currentPage, onChange: (page) => setCurrentPage(page), total: filteredProducts.length, showTotal: (total) => `${total} sản phẩm` }}
        expandable={{
          expandedRowRender: (record: any) => <VariantMatrix variants={record.product_variants ?? []} />,
          rowExpandable: (record: any) => (record.product_variants ?? []).length > 0,
        }}
      >
        <Table.Column dataIndex="id" title="Mã sản phẩm" />
        <Table.Column dataIndex="name" title="Tên sản phẩm" />
        <Table.Column dataIndex="description" title="Mô tả" />
        <Table.Column dataIndex="base_price" title="Giá cơ bản" render={formatCurrency} />
        <Table.Column title="Bộ sưu tập" render={(record: Product) => {
          if (categoryIsLoading) return "Đang tải...";
          const cat = ((categoryQuery ?? []) as Category[]).find((c) => c.id === record.category_id);
          return cat?.name ?? "-";
        }} />
        <Table.Column title="Hình ảnh" dataIndex="image_url"
          render={(images: string[] | string | null) => {
            if (!images) return null;
            let list: string[] = [];
            try { list = typeof images === "string" ? JSON.parse(images) : images; } catch { list = []; }
            return <>{list?.map((img, i) => typeof img === "string" && img && (
              <Image key={i} src={img} alt="" width={50} height={50} style={{ marginRight: 8, borderRadius: 6 }} />
            ))}</>;
          }} />
        <Table.Column title="Tổng tồn kho" render={(record: any) => {
          const variants: ProductVariant[] = record.product_variants ?? [];
          const unique = Array.from(new Map(variants.map((v) => [v.id, v])).values()) as ProductVariant[];
          const total = unique.reduce((sum, v) => sum + (v.stock ?? 0), 0);
          if (!unique.length) return <span style={{ color: "#bbb" }}>–</span>;
          return <span style={{ ...badgeStyle(total), display: "inline-block", padding: "2px 10px", borderRadius: 10, fontSize: 12, fontWeight: 500 }}>{total}</span>;
        }} />
        <Table.Column dataIndex="created_at" title="Ngày khởi tạo" render={(v: any) => <DateField value={v} format="DD/MM/YYYY" />} />
        <Table.Column title="Hành động" render={(_, record: BaseRecord) => (
          <Space>
            <EditButton hideText size="small" recordItemId={record.id} />
            <DeleteButton hideText size="small" recordItemId={record.id} />
          </Space>
        )} />
      </Table>
    </>
  );
}

// ─── Tab Coupon ───────────────────────────────────────────
function CouponTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Coupon | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const invalidate = useInvalidate();

  const { tableProps } = useTable({
    resource: "coupons",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  const rawData: Coupon[] = (tableProps.dataSource as Coupon[]) ?? [];

  const filteredData = rawData.filter(c => {
    const matchSearch = !searchText || c.code.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = !statusFilter || getCouponStatus(c).label === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) { message.error("Xóa thất bại: " + error.message); return; }
    message.success("Đã xóa mã giảm giá");
    invalidate({ resource: "coupons", invalidates: ["list"] });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Input placeholder="Tìm mã giảm giá..." allowClear value={searchText}
            onChange={e => setSearchText(e.target.value)} style={{ width: 240 }} />
          <Select placeholder="Lọc trạng thái" allowClear style={{ width: 180 }}
            value={statusFilter} onChange={setStatusFilter}>
            <Select.Option value="Đang hoạt động">✅ Đang hoạt động</Select.Option>
            <Select.Option value="Chưa bắt đầu">🕐 Chưa bắt đầu</Select.Option>
            <Select.Option value="Hết hạn">❌ Hết hạn</Select.Option>
          </Select>
          {(searchText || statusFilter) && (
            <span style={{ fontSize: 12, color: "#888", alignSelf: "center" }}>
              {filteredData.length} / {rawData.length} mã
            </span>
          )}
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); setIsModalOpen(true); }}>
          Tạo mã mới
        </Button>
      </div>

      <Table {...tableProps} dataSource={filteredData} rowKey="id">
        <Table.Column dataIndex="code" title="Mã"
          render={v => <Tag color="blue" style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{v}</Tag>} />
        <Table.Column dataIndex="discount_type" title="Loại"
          render={v => <Tag color={v === "percent" ? "purple" : "cyan"}>{v === "percent" ? "Phần trăm" : "Cố định"}</Tag>} />
        <Table.Column title="Giá trị" render={(_, record: Coupon) => (
          record.discount_type === "percent"
            ? <span style={{ fontWeight: 600, color: "#7c3aed" }}>{record.discount_value}%</span>
            : <span style={{ fontWeight: 600, color: "#0891b2" }}>{fmtVND(record.discount_value)}</span>
        )} />
        <Table.Column dataIndex="min_order_value" title="Đơn tối thiểu" render={v => fmtVND(v ?? 0)} />
        <Table.Column dataIndex="max_discount" title="Giảm tối đa"
          render={v => v ? fmtVND(v) : <span style={{ color: "#bbb" }}>–</span>} />
        <Table.Column dataIndex="usage_limit" title="Giới hạn"
          render={v => v ?? <span style={{ color: "#bbb" }}>Không giới hạn</span>} />
        <Table.Column dataIndex="start_date" title="Bắt đầu"
          render={v => v ? dayjs(v).format("DD/MM/YYYY") : <span style={{ color: "#bbb" }}>–</span>} />
        <Table.Column dataIndex="end_date" title="Kết thúc"
          render={v => v ? dayjs(v).format("DD/MM/YYYY") : <span style={{ color: "#bbb" }}>–</span>} />
        <Table.Column title="Trạng thái" render={(_, record: Coupon) => {
          const s = getCouponStatus(record);
          return <Tag color={s.color}>{s.label}</Tag>;
        }} />
        <Table.Column title="Hành động" render={(_, record: Coupon) => (
          <Space>
            <Button size="small" icon={<EditOutlined />}
              onClick={() => { setEditRecord(record); setIsModalOpen(true); }} />
            <Popconfirm title="Xóa mã giảm giá?" description={`Xóa mã "${record.code}"?`}
              onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space>
        )} />
      </Table>

      <CouponFormModal open={isModalOpen} onClose={() => { setIsModalOpen(false); setEditRecord(null); }} editRecord={editRecord} />
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────
export default function BlogPostList() {
  return (
    <List title="Quản lý sản phẩm">
      <Tabs
        defaultActiveKey="products"
        items={[
          { key: "products", label: "📦 Sản phẩm", children: <ProductTab /> },
          { key: "coupons", label: "🏷️ Mã giảm giá", children: <CouponTab /> },
        ]}
      />
    </List>
  );
}