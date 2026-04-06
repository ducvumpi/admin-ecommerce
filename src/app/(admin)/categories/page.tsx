"use client";

import {
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import type { BaseRecord } from "@refinedev/core";
import { useInvalidate } from "@refinedev/core";
import { Space, Table } from "antd";
import { useRouter } from "next/navigation";
import Image from "next/image";
import React from "react";

export default function CategoryList() {
  const router = useRouter();
  const invalidate = useInvalidate();

  const { tableProps } = useTable({
    syncWithLocation: true,
  });

  const pagination = tableProps.pagination as any;
  const current = pagination?.current ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const total = pagination?.total ?? 0;

  function handleDeleteSuccess() {
    const itemsOnCurrentPage = total - (current - 1) * pageSize;
    if (current > 1 && itemsOnCurrentPage <= 1) {
      window.location.href = `?currentPage=1&pageSize=${pageSize}`;
    } else {
      window.location.reload();
    }
  }
  return (
    <List title={"Danh mục sản phẩm"}>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title={"ID"} />
        <Table.Column dataIndex="name" title={"Tên sản phẩm"} />
        <Table.Column dataIndex="image" title={"Hình ảnh"} key="image"
          render={(value) => (
            <Image alt="" width={50} height={50} src={value} />
          )}
        />
        <Table.Column
          title={"Hành động"}
          dataIndex="actions"
          render={(_, record: BaseRecord) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <ShowButton hideText size="small" recordItemId={record.id} />
              <DeleteButton
                hideText
                size="small"
                recordItemId={record.id}
                onSuccess={handleDeleteSuccess}
              />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}