"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";
import React from "react";

export default function CategoryCreate() {
  const { formProps, saveButtonProps } = useForm({});
  const [form] = Form.useForm();

  return (
    <Form form={form}>
      <Create saveButtonProps={saveButtonProps}>
        <Form {...formProps} layout="vertical">
          <Form.Item
            label={"Tên sản phẩm"}
            name={["name"]}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={"Mô tả"}
            name={["description"]}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={"Tag"}
            name={["tag"]}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={"Slug"}
            name={["slug"]}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={"Hình ảnh"}
            name={"image"}
            rules={[{
              required: true,
            },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Create >    </Form>
  );

}