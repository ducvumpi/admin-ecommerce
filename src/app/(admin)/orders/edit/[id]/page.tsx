"use client";

import { Edit, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select, InputNumber } from "antd";
import React from "react";

export default function ProductEdit() {
  const { formProps, saveButtonProps } = useForm({
    action: "edit",
    resource: "products",
    redirect: "list",
    meta: {
      // nếu bảng Supabase có quan hệ category → join để load data
      select: "*, categories(*)",
    },
  });

  // ------------------------
  // LOAD CATEGORY SELECT
  // ------------------------
  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
    optionLabel: "name",
    optionValue: "id",
  });
  const [form] = Form.useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form form={form} {...formProps} layout="vertical">
        <Form.Item
          label="Tên sản phẩm"
          name="title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Mô tả" name="description">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item
          label="Giá"
          name="price"
          rules={[{ required: true }]}
        >
          <InputNumber style={{ width: "100%" }} />
        </Form.Item>

        {/* CATEGORY */}
        <Form.Item
          label="Bộ sưu tập"
          name="category_id"
          rules={[{ required: true }]}
        >
          <Select {...categorySelectProps} />
        </Form.Item>

        {/* IMAGES: Supabase expects text[] */}
        <Form.Item
          label="Hình ảnh (cách nhau bằng dấu phẩy)"
          name="images"
          normalize={(value) =>
            typeof value === "string"
              ? value.split(",").map((s: string) => s.trim())
              : value
          }
        >
          <Input />
        </Form.Item>

      </Form>
    </Edit>
  );
}
