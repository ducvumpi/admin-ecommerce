"use client";

import { Create, useForm, useSelect } from "@refinedev/antd";
import { List, } from "antd";
import React, { useState } from "react";
import ImgCrop from "antd-img-crop";
import { UploadOutlined } from "@ant-design/icons";
import uploadFile from "../../../api/uploadFile";
import { supabase } from "@app/libs/supabaseClient";
import { Row, Col, Form, Input, Select, Upload, Button, UploadFile, UploadProps } from "antd";
import { useNavigation } from "@refinedev/core";
import { useNotification } from "@refinedev/core";


type FileType = Parameters<
  NonNullable<UploadProps["beforeUpload"]>
>[0];
export default function BlogPostCreate() {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { open } = useNotification();

  const { list } = useNavigation();

  const resizeImage = (
    file: File,
    width = 1200,
    height = 630
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        if (!e.target?.result) return reject();
        img.src = e.target.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject();

        // 👉 crop center
        const scale = Math.max(
          width / img.width,
          height / img.height
        );

        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;

        ctx.drawImage(
          img,
          x,
          y,
          img.width * scale,
          img.height * scale
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject();

            const resizedFile = new File([blob], file.name, {
              type: file.type,
            });

            resolve(resizedFile);
          },
          file.type,
          0.9 // quality
        );
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };



  const uploadAndSet = async (file: FileType) => {
    try {
      // 🔥 RESIZE TRƯỚC KHI UPLOAD
      const resizedFile = await resizeImage(
        file as File,
        1200,
        630
      );

      const path = await uploadFile(resizedFile);
      console.log("UPLOAD PATH =", path);

      if (!path) return false;

      const currentImages =
        formProps.form?.getFieldValue("image_url") || [];

      formProps.form?.setFieldValue("image_url", [
        ...currentImages,
        path,
      ]);

      setFileList((prev) =>
        prev.map((f) =>
          f.uid === file.uid
            ? { ...f, status: "done", url: path }
            : f
        )
      );
    } catch (err) {
      console.error(err);
    }

    return false; // ⛔ chặn upload mặc định của AntD
  };


  const { formProps, saveButtonProps, form } = useForm({
    action: "create",
    resource: "products",
    redirect: "list",
    mutationMode: "pessimistic",
  });


  const { selectProps: categorySelectProps } = useSelect({
    resource: "categories",
    optionLabel: "name",
    optionValue: "id",
  });


  const handleFinish = async (values: any) => {
    try {
      console.log("VALUES =", values);

      const productPayload = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        base_price: values.base_price,
        gender_id: values.gender_id,        // ✅ FK int
        category_id: values.category_id,
        image_url: values.image_url ?? [],        // ✅ array
      };

      const { data: product, error } = await supabase
        .from("products")
        .insert(productPayload)
        .select()
        .single();

      if (error) { console.error("INSERT PRODUCT ERROR =", error); throw error; }

      const variants = (values.color as string[]).flatMap((color: string) =>
        (values.size as string[]).map((size: string) => ({
          product_id: product.id,
          color,
          size,
          price: Number(values.price),        // ✅ giá theo variant
          stock: Number(values.stock),      // ✅ stock cho tất cả variants
        }))
      );

      const { error: variantError } = await supabase
        .from("product_variants")
        .insert(variants);

      if (variantError) { console.error("INSERT VARIANT ERROR =", variantError); throw variantError; }

      open?.({ type: "success", message: "Tạo sản phẩm thành công" });
      list("products");

    } catch (err: any) {
      console.error("ERROR =", err?.message || err);
      open?.({ type: "error", message: err?.message || "Có lỗi xảy ra" });
    }
  };

  return (
    <Create
      saveButtonProps={{
        children: "Tạo mới sản phẩm",
        onClick: () => form.submit(), // 🔥 chỉ submit AntD form
      }}
      title="Tạo mới sản phẩm"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        {/* CỘT TRÁI – 16/24 */}
        <Col span={16}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Tên sản phẩm"
                name="name"
                rules={[{ required: true }]}
              >
                <Input placeholder="Nhập tên sản phẩm" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="Slug (SEO)"
                name="slug"
                rules={[{ required: true }]}
              >
                <Input placeholder="slug-san-pham" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Mô tả"
            name="description"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={5} placeholder="Mô tả chi tiết sản phẩm" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Giá"
                name="base_price"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Màu sắc"
                name="color"
                rules={[{ required: true, message: "Nhập ít nhất 1 màu" }]}
              >
                <Select
                  mode="tags"
                  placeholder="Nhập màu rồi Enter (vd: Đỏ, Xanh)"
                  tokenSeparators={[","]}
                  open={false}
                  suffixIcon={null}
                />
              </Form.Item>
            </Col>


            <Col span={8}>
              <Form.Item
                label="Kích thước"
                name="size"
                rules={[{ required: true, message: "Nhập ít nhất 1 size" }]}
              >
                <Select
                  mode="tags"
                  placeholder="Nhập size rồi Enter (vd: S, M, L)"
                  tokenSeparators={[","]}
                  open={false}
                  suffixIcon={null}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Giá theo màu sắc & kích thước"
                name="price"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Tồn kho"
                name="stock"
                rules={[{ required: true }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Giới tính"
                name="gender_id"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { label: "Nam", value: 1 },
                    { label: "Nữ", value: 2 },
                    { label: "Unisex", value: 3 },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Bộ sưu tập"
            name="category_id"
            rules={[{ required: true }]}
          >
            <Select {...categorySelectProps} />
          </Form.Item>
        </Col>

        {/* CỘT PHẢI – 8/24 */}
        <Col span={8}>
          <Form.Item label="Hình ảnh sản phẩm">
            <Upload
              multiple
              listType="picture"
              fileList={fileList}
              beforeUpload={uploadAndSet}
              onRemove={(file) => {
                setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
              }}
              onPreview={(file) => window.open(file.url || "")}
            >
              {fileList.length < 5 && "+ Upload"}
            </Upload>
          </Form.Item>
        </Col>

        {/* Field ẩn */}
        <Form.Item name="image_url" hidden>
          <Input type="hidden" />
        </Form.Item>
      </Form>
    </Create>


  );
}






