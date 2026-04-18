"use client";

import { Edit, useForm, useSelect } from "@refinedev/antd";
import { useCreate, useDelete, useList, useUpdate } from "@refinedev/core";
import { Button, Form, Input, InputNumber, Select, Tag, message } from "antd";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { Image, Upload } from "antd";
import { supabase } from "@app/libs/supabaseClient";
// ─── Types ────────────────────────────────────────────────────────────────────
interface SizeEntry {
  id?: number;
  tempId: string;
  size: string;
  stock: number;
  price: number; // 👈 thêm
  _deleted?: boolean;
}
interface ColorEntry {
  tempId: string;
  color: string;
  colorName: string;
  sizes: SizeEntry[];
  _deleted?: boolean;
}

export interface VariantEditorRef {
  save: () => Promise<void>;
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Badge tồn kho ────────────────────────────────────────────────────────────
function StockBadge({ stock }: { stock: number }) {
  const style: React.CSSProperties = {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 8,
    fontWeight: 500,
    flexShrink: 0,
  };
  if (stock === 0)
    return (
      <span style={{ ...style, background: "#FCEBEB", color: "#A32D2D" }}>
        Hết
      </span>
    );
  if (stock < 10)
    return (
      <span style={{ ...style, background: "#FAEEDA", color: "#854F0B" }}>
        Sắp hết
      </span>
    );
  return (
    <span style={{ ...style, background: "#EAF3DE", color: "#3B6D11" }}>
      Còn hàng
    </span>
  );
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────
function CurrentVariantsSummary({
  snapshot,
}: {
  snapshot: ColorEntry[] | null;
}) {
  if (!snapshot) {
    return (
      <div
        style={{
          padding: "10px 14px",
          background: "#fafafa",
          borderRadius: 8,
          fontSize: 13,
          color: "#bbb",
          border: "0.5px solid #eee",
        }}
      >
        Đang tải dữ liệu cũ…
      </div>
    );
  }

  if (snapshot.length === 0) {
    return (
      <div
        style={{
          padding: "10px 14px",
          background: "#fafafa",
          borderRadius: 8,
          fontSize: 13,
          color: "#bbb",
          border: "0.5px solid #eee",
        }}
      >
        Chưa có biến thể nào.
      </div>
    );
  }

  return (
    <div
      style={{
        border: "0.5px solid #d9d9d9",
        borderRadius: 10,
        padding: "12px 14px",
        background: "#fafafa",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#888",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        📋 Biến thể hiện tại (chỉ xem)
      </div>

      {snapshot.map((entry) => (
        <div
          key={entry.tempId}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 10,
            padding: "8px 10px",
            background: "#fff",
            borderRadius: 8,
            border: "0.5px solid #ebebeb",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 110 }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: /^#/.test(entry.color) ? entry.color : "#888",
                border: "1px solid #ccc",
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>
              {entry.colorName || entry.color}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {entry.sizes.map((sz) => (
              <Tag
                key={sz.tempId}
                style={{
                  margin: 0,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                <span style={{ fontWeight: 600 }}>{sz.size}</span>
                <span style={{ color: "#999" }}>×</span>
                <span>{sz.stock}</span>
                <StockBadge stock={sz.stock} />
              </Tag>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Variant Editor ───────────────────────────────────────────────────────────
const VariantEditor = React.forwardRef<
  VariantEditorRef,
  { productId: string }
>(({ productId }, ref) => {
  const [entries, setEntries] = useState<ColorEntry[]>([]);
  const [snapshot, setSnapshot] = useState<ColorEntry[] | null>(null);
  const snapshotSet = useRef(false);

  const {
    result: { data: variantData = [] },
    query: { isLoading },
  } = useList({
    resource: "product_variants",
    filters: [{ field: "product_id", operator: "eq", value: productId }],
    pagination: { pageSize: 200 },
  });

  const { mutateAsync: createVariant } = useCreate();
  const { mutateAsync: updateVariant } = useUpdate();
  const { mutateAsync: deleteVariant } = useDelete();

  function buildEntries(list: any[]): ColorEntry[] {
    const map = new Map<string, ColorEntry>();
    list.forEach((v: any) => {
      const colorKey = v.color && v.color.trim() ? v.color : "no-color";
      if (!map.has(colorKey)) {
        map.set(colorKey, {
          tempId: uid(),
          color: /^#/.test(colorKey) ? colorKey : "#888888",
          colorName: colorKey !== "no-color" ? colorKey : "Không màu",
          sizes: [],
        });
      }
      map.get(colorKey)!.sizes.push({
        id: v.id,
        tempId: uid(),
        size: v.size ?? "",
        stock: v.stock ?? 0,
        price: v.price ?? 0, // 👈 THÊM DÒNG NÀY
      });
    });
    return Array.from(map.values());
  }

  useEffect(() => {
    setEntries(buildEntries(variantData));
  }, [variantData]);

  useEffect(() => {
    if (isLoading || snapshotSet.current) return;
    setSnapshot(JSON.parse(JSON.stringify(buildEntries(variantData))));
    snapshotSet.current = true;
  }, [isLoading, variantData]);

  // Expose save() ra ngoài qua ref
  // Expose save() ra ngoài qua ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      // Build map snapshot theo id để so sánh nhanh
      const snapshotMap = new Map<number, { color: string; size: string; stock: number }>();
      snapshot?.forEach((entry) => {
        const color = entry.colorName.trim() || entry.color;
        entry.sizes.forEach((sz) => {
          if (sz.id) snapshotMap.set(sz.id, { color, size: sz.size, stock: sz.stock });
        });
      });

      for (const entry of entries) {
        const colorLabel = entry.colorName.trim() || entry.color;
        for (const sz of entry.sizes) {
          const shouldDelete = entry._deleted || sz._deleted;

          if (shouldDelete) {
            // Chỉ xóa nếu bản ghi thực sự tồn tại trong DB
            if (sz.id) {
              await deleteVariant({ resource: "product_variants", id: sz.id });
            }
          } else if (sz.id) {
            // Chỉ update nếu có thay đổi so với snapshot
            const orig = snapshotMap.get(sz.id);
            const changed =
              !orig ||
              orig.color !== colorLabel ||
              orig.size !== sz.size ||
              orig.stock !== sz.stock;
            if (changed) {
              await updateVariant({
                resource: "product_variants",
                id: sz.id,
                values: {
                  color: colorLabel,
                  size: sz.size,
                  stock: sz.stock,
                  price: sz.price, // 👈 thêm
                },
              });
            }
          } else {
            // Chỉ insert nếu size không rỗng
            if (!sz.size.trim()) continue;
            await createVariant({
              resource: "product_variants",
              values: {
                product_id: productId,
                color: colorLabel,
                size: sz.size,
                stock: sz.stock,
                price: sz.price, // 👈 thêm
              },
            });
          }
        }
      }
    },
  }));

  function updateEntry(tempId: string, patch: Partial<ColorEntry>) {
    setEntries((p) =>
      p.map((e) => (e.tempId === tempId ? { ...e, ...patch } : e))
    );
  }

  function updateSize(cTid: string, sTid: string, patch: Partial<SizeEntry>) {
    setEntries((p) =>
      p.map((e) =>
        e.tempId !== cTid
          ? e
          : {
            ...e,
            sizes: e.sizes.map((s) =>
              s.tempId === sTid ? { ...s, ...patch } : s
            ),
          }
      )
    );
  }

  function addColor() {
    setEntries((p) => [
      ...p,
      {
        tempId: uid(),
        color: "#888888",
        colorName: "",
        price: 0, // 👈 thêm
        sizes: [{ tempId: uid(), size: "", stock: 0, price: 0 }],
      },
    ]);
  }

  function removeColor(tempId: string) {
    setEntries((p) =>
      p.map((e) => (e.tempId === tempId ? { ...e, _deleted: true } : e))
    );
  }

  function addSize(cTid: string) {
    setEntries((p) =>
      p.map((e) =>
        e.tempId !== cTid
          ? e
          : { ...e, sizes: [...e.sizes, { tempId: uid(), size: "", stock: 0, price: 0 }] }
      )
    );
  }

  function removeSize(cTid: string, sTid: string) {
    setEntries((p) =>
      p.map((e) =>
        e.tempId !== cTid
          ? e
          : {
            ...e,
            sizes: e.sizes.map((s) =>
              s.tempId === sTid ? { ...s, _deleted: true } : s
            ),
          }
      )
    );
  }

  const visible = entries.filter((e) => !e._deleted);
  // Hàm upload ảnh lên Supabase Storage

  return (
    <div>
      <CurrentVariantsSummary snapshot={snapshot} />

      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#888",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        ✏️ Chỉnh sửa biến thể
      </div>

      {visible.map((entry) => (
        <div
          key={entry.tempId}
          style={{
            border: "0.5px solid var(--ant-color-border-secondary)",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 10,
            background: "var(--ant-color-bg-container)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <input
              type="color"
              value={/^#/.test(entry.color) ? entry.color : "#888888"}
              onChange={(e) =>
                updateEntry(entry.tempId, { color: e.target.value })
              }
              style={{
                width: 32,
                height: 32,
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
              title="Chọn màu"
            />
            <Input
              placeholder="Tên màu (vd: Đỏ, Navy, Xanh lá...)"
              value={entry.colorName}
              onChange={(e) =>
                updateEntry(entry.tempId, { colorName: e.target.value })
              }
              style={{ flex: 1 }}
            />
            <Button
              danger
              type="text"
              size="small"
              onClick={() => removeColor(entry.tempId)}
            >
              Xóa màu
            </Button>
          </div>

          <div
            style={{
              border: "0.5px solid var(--ant-color-border-secondary)",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>
              Size & Tồn kho
            </div>

            {entry.sizes
              .filter((s) => !s._deleted)
              .map((sz) => (
                <div
                  key={sz.tempId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 0",
                    borderBottom:
                      "0.5px solid var(--ant-color-border-tertiary)",
                  }}
                >
                  <Input
                    placeholder="Size"
                    value={sz.size}
                    onChange={(e) =>
                      updateSize(entry.tempId, sz.tempId, {
                        size: e.target.value,
                      })
                    }
                    style={{ width: 80, textAlign: "center" }}
                  />
                  <InputNumber
                    min={0}
                    placeholder="SL"
                    value={sz.stock}
                    onChange={(v) =>
                      updateSize(entry.tempId, sz.tempId, { stock: v ?? 0 })
                    }
                    style={{ width: 90 }}
                  />
                  <StockBadge stock={sz.stock} />
                  <Button
                    danger
                    type="text"
                    size="small"
                    onClick={() => removeSize(entry.tempId, sz.tempId)}
                  >
                    ✕
                  </Button>
                </div>
              ))}

            <Button
              type="dashed"
              size="small"
              onClick={() => addSize(entry.tempId)}
              style={{ marginTop: 8, width: "100%" }}
            >
              + Thêm size
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="dashed"
        onClick={addColor}
        style={{ width: "100%", marginBottom: 8 }}
      >
        + Thêm màu mới
      </Button>
    </div>
  );
});

VariantEditor.displayName = "VariantEditor";

// ─── Main Edit Page ───────────────────────────────────────────────────────────
export default function ProductEdit() {
  const variantRef = useRef<VariantEditorRef>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [inputUrl, setInputUrl] = useState("");
  // Thêm state lưu file chờ upload
  const [pendingFiles, setPendingFiles] = useState<{ tempUrl: string; file: File }[]>([]);
  const { formProps, saveButtonProps, id } = useForm({
    action: "edit",
    resource: "products",
    redirect: "list",
    meta: { select: "*, categories(*)" },
  });
  useEffect(() => {
    const urls = formProps?.initialValues?.image_url;
    if (urls) setImageUrls(Array.isArray(urls) ? urls : [urls]);
  }, [formProps?.initialValues]);
  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
    optionLabel: "name",
    optionValue: "id",
  });

  // Wrap onFinish để lưu biến thể cùng lúc với form
  const handleFinish = async (values: any) => {
    try {
      // Upload tất cả file đang pending
      let finalUrls = [...imageUrls];

      for (const { tempUrl, file } of pendingFiles) {
        const realUrl = await uploadImage(file);
        if (realUrl) {
          // Thay thế blob URL bằng URL thật
          finalUrls = finalUrls.map(u => u === tempUrl ? realUrl : u);
          // Giải phóng blob URL
          URL.revokeObjectURL(tempUrl);
        }
      }

      setPendingFiles([]);
      setImageUrls(finalUrls);

      await variantRef.current?.save();
      await formProps.onFinish?.({ ...values, image_url: finalUrls });
    } catch {
      message.error("Lỗi khi lưu");
    }
  };
  const [form] = Form.useForm();
  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("image products") // ← đồng bộ tên bucket
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) { message.error("Upload thất bại: " + error.message); return null; }

    const { data } = supabase.storage.from("image products").getPublicUrl(fileName);
    return data.publicUrl;
  };
  const deleteImage = async (url: string) => {
    if (url.startsWith("blob:")) return;

    const bucketName = "image products";

    const marker = "/object/public/image%20products/";
    const marker2 = "/object/public/image products/";

    let path = "";
    if (url.includes(marker)) {
      path = decodeURIComponent(url.split(marker)[1]);
    } else if (url.includes(marker2)) {
      path = url.split(marker2)[1];
    }

    if (!path) { message.error("Không tìm được path ảnh"); return; }

    const { error } = await supabase.storage.from(bucketName).remove([path]);
    if (error) message.error("Xóa ảnh thất bại: " + error.message);
  };
  return (
    <Edit saveButtonProps={saveButtonProps}
      title="Chỉnh sửa sản phẩm">

      <Form form={form} {...formProps} onFinish={handleFinish} layout="vertical">
        <Form.Item
          label="Tên sản phẩm"
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item label="Giá" name="base_price" rules={[{ required: true }]}>
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Bộ sưu tập"
          name="category_id"
          rules={[{ required: true }]}
        >
          <Select {...categorySelectProps} />
        </Form.Item>

        {/* <Form.Item
          label="Giá theo màu & size"
          name="price"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item> */}
        <Form.Item label="Hình ảnh sản phẩm" name="image_url">
          {/* Preview grid */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            {imageUrls.map((url, i) => (
              <div key={i} style={{ position: "relative", width: 100, height: 100 }}>
                <Image
                  src={url}
                  alt=""
                  width={100}
                  height={100}
                  style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="
                />
                <button
                  onClick={async () => {
                    const urlToRemove = imageUrls[i];
                    const next = imageUrls.filter((_, idx) => idx !== i);
                    setImageUrls(next);
                    formProps.form?.setFieldValue("image_url", next);

                    if (urlToRemove.startsWith("blob:")) {
                      // Ảnh chưa upload → chỉ revoke, không cần xóa Storage
                      setPendingFiles(prev => prev.filter(p => p.tempUrl !== urlToRemove));
                      URL.revokeObjectURL(urlToRemove);
                    } else {
                      // Ảnh đã upload → xóa trên Storage
                      await deleteImage(urlToRemove);
                    }
                  }}
                  style={{
                    position: "absolute", top: -8, right: -8,
                    width: 22, height: 22, borderRadius: "50%",
                    background: "#ff4d4f", border: "none", color: "#fff",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11,
                    boxShadow: "0 2px 6px rgba(0,0,0,.2)",
                  }}
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))}

            {/* Upload button */}
            <Upload
              accept="image/*"
              showUploadList={false}
              multiple
              customRequest={async ({ file }) => {
                // Chỉ tạo preview local, chưa upload
                const tempUrl = URL.createObjectURL(file as File);
                setPendingFiles(prev => [...prev, { tempUrl, file: file as File }]);
                setImageUrls(prev => [...prev, tempUrl]);
                formProps.form?.setFieldValue("image_url", [...imageUrls, tempUrl]);
              }}
            >
              <div style={{
                width: 100, height: 100, border: "1.5px dashed #d9d9d9",
                borderRadius: 8, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 4, cursor: "pointer", background: "#fafafa",
                transition: "border-color .2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#1677ff")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#d9d9d9")}
              >
                <PlusOutlined style={{ fontSize: 18, color: "#aaa" }} />
                <span style={{ fontSize: 11, color: "#aaa", textAlign: "center", lineHeight: 1.3 }}>
                  Upload<br />hoặc URL
                </span>
              </div>
            </Upload>
          </div>

          {/* Input URL */}
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              placeholder="Hoặc dán URL ảnh vào đây..."
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onPressEnter={() => {
                const url = inputUrl.trim();
                if (!url) return;
                const next = [...imageUrls, url];
                setImageUrls(next);
                formProps.form?.setFieldValue("image_url", next);
                setInputUrl("");
              }}
            />
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                const url = inputUrl.trim();
                if (!url) return;
                const next = [...imageUrls, url];
                setImageUrls(next);
                formProps.form?.setFieldValue("image_url", next);
                setInputUrl("");
              }}
            >
              Thêm
            </Button>
          </div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
            Kéo thả / click để upload từ máy, hoặc nhập URL
          </div>
        </Form.Item>

        <Form.Item label="Biến thể (màu & size & tồn kho)">
          {id ? (
            <VariantEditor ref={variantRef} productId={id as string} />
          ) : (
            <span style={{ fontSize: 13, color: "#bbb" }}>Đang tải...</span>
          )}
        </Form.Item>
      </Form>
    </Edit>
  );
}