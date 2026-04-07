"use client";
import React, { useState } from 'react';
import { Table, Space, Tag, Input, Select, Card, Row, Col, Statistic, DatePicker, Modal, Form, Typography, Button, Dropdown, message, } from "antd";
import {
  ShoppingCartOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined
} from "@ant-design/icons";
import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { useSelect } from "@refinedev/antd";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { supabase } from "../../libs/supabaseClient";

import { useList, useInvalidate } from "@refinedev/core";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);


// Bên trong component:


interface Order {
  id: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  items: number;
  total_price: number;
  quantity: number;

  addresses?: {
    full_name: string;
    phone: string;
    mail: string;
    address_line: string;
    communes?: {
      name: string; // tên phường/xã
      provinces?: {
        name: string; // tên tỉnh
      };
    };
  };

  order_items?: {
    quantity: number;
  }[];
}
const { Title, Text } = Typography;
const orderstest = [
  {
    id: 1,
    order_code: "DH001",
    customer_name: "Nguyễn Văn A",
    phone: "0909123456",
    total_amount: 1500000,
    status: "Đã thanh toán",
    created_at: "2026-01-25",
  },
];

// Mock data
// const initialOrders = [
//   { id: 1, orderNumber: 'ORD001', customerName: 'Nguyễn Văn A', email: 'nguyenvana@email.com', total: 1250000, status: 'pending', date: '2025-01-20', items: 3, phone: '0901234567', address: 'Hà Nội' },
//   { id: 2, orderNumber: 'ORD002', customerName: 'Trần Thị B', email: 'tranthib@email.com', total: 2500000, status: 'processing', date: '2025-01-19', items: 5, phone: '0902234567', address: 'Hồ Chí Minh' },
//   { id: 3, orderNumber: 'ORD003', customerName: 'Lê Văn C', email: 'levanc@email.com', total: 850000, status: 'shipped', date: '2025-01-18', items: 2, phone: '0903234567', address: 'Đà Nẵng' },
//   { id: 4, orderNumber: 'ORD004', customerName: 'Phạm Thị D', email: 'phamthid@email.com', total: 3200000, status: 'delivered', date: '2025-01-17', items: 7, phone: '0904234567', address: 'Hải Phòng' },
//   { id: 5, orderNumber: 'ORD005', customerName: 'Hoàng Văn E', email: 'hoangvane@email.com', total: 950000, status: 'cancelled', date: '2025-01-16', items: 1, phone: '0905234567', address: 'Cần Thơ' },
//   { id: 6, orderNumber: 'ORD006', customerName: 'Đỗ Thị F', email: 'dothif@email.com', total: 1750000, status: 'pending', date: '2025-01-20', items: 4, phone: '0906234567', address: 'Huế' },
//   { id: 7, orderNumber: 'ORD007', customerName: 'Vũ Văn G', email: 'vuvang@email.com', total: 4200000, status: 'processing', date: '2025-01-19', items: 6, phone: '0907234567', address: 'Nha Trang' },
//   { id: 8, orderNumber: 'ORD008', customerName: 'Bùi Thị H', email: 'buithih@email.com', total: 1100000, status: 'shipped', date: '2025-01-18', items: 2, phone: '0908234567', address: 'Vũng Tàu' },
// ];



const OrderList = () => {
  const { tableProps } = useTable({
    resource: "orders",
    meta: {
      select: `
      id,
      user_id,
      address_id,
      total_price,
      status,
      created_at,
      note,
      addresses (
        full_name,
        phone,
        mail,
        address_line,
        ward,
        city,
        communes (
          name,
          province_code,
          provinces!fk_communes_province (
            name
          )
        )
      ),
      order_items (
        quantity
      )
    `,
    },
  });
  // const { selectProps } = useSelect({
  //   resource: "order_statuses",
  //   optionLabel: "label", // hiển thị
  //   optionValue: "id",    // value lưu vào DB
  // });
  const [orders, setOrders] = useState<Order[]>([]);
  // const [filteredOrders, setFilteredOrders] = useState(initialOrders);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const formatCurrency = (amount: any) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };


  const getStatusIcon = (code: string) => {
    const map: Record<string, React.ReactNode> = {
      pending: <ClockCircleOutlined />,
      processing: <SyncOutlined spin />,
      shipped: <CarOutlined />,
      delivered: <CheckCircleOutlined />,
      cancelled: <CloseCircleOutlined />,
    };
    return map[code];
  };

  const { result, } = useList({
    resource: "orders",
    pagination: { mode: "off" },
    meta: {
      select: `
      id, total_price, status, created_at, note,
      addresses (
        full_name, phone, mail, address_line,
        communes (
          name,
          provinces!fk_communes_province ( name )
        )
      ),
      order_items ( quantity )
    `,
    },
  });
  const getStatusText = (status: string) => {
    return statusOptions.find(s => s.value === status)?.label ?? status;
  };

  const getStatusColor = (status: string) => {
    return getStatusStyle(status).color;
  };

  // const getStatusIcon = (status) => {
  //   const icons = {
  //     pending: <ClockCircleOutlined />,
  //     processing: <SyncOutlined spin />,
  //     shipped: <CarOutlined />,
  //     delivered: <CheckCircleOutlined />,
  //     cancelled: <CloseCircleOutlined />
  //   };
  //   return icons[status];
  // };

  // Calculate statistics
  // ✅ MỚI — đúng với statusOptions trong DB
  const stats = React.useMemo(() => {
    const stats = {
      total: 0,
      pending: 0,
      paid: 0,
      packing: 0,
      shipping: 0,
      completed: 0,
      cancelled: 0,
    };

    if (!result?.data) return stats;
    stats.total = result.data.length;
    result.data.forEach((order) => {
      const key = order.status as keyof typeof stats;
      if (key in stats) stats[key]++;
    });
    return stats;
  }, [result]);
  const statusOptions = [
    { value: "pending", label: "Đã đặt hàng", color: "gold", icon: <ShoppingCartOutlined /> },
    { value: "paid", label: "Đã thanh toán", color: "cyan", icon: <CheckCircleOutlined /> },
    { value: "packing", label: "Đang đóng gói", color: "orange", icon: <SyncOutlined spin /> },
    { value: "shipping", label: "Đang giao hàng", color: "purple", icon: <CarOutlined /> },
    { value: "completed", label: "Hoàn thành", color: "green", icon: <CheckCircleOutlined /> },
    { value: "cancelled", label: "Đã hủy", color: "red", icon: <CloseCircleOutlined /> },
  ];

  const getStatusStyle = (status: string) => {
    return (
      statusOptions.find((s) => s.value === status) ?? {
        color: "default",
        icon: <ClockCircleOutlined />,
        label: status,
      }
    );
  };

  const invalidate = useInvalidate();
  const handleChangeStatus = async (orderId: number, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status }) // ← string trực tiếp
      .eq("id", orderId);

    if (error) {
      message.error("Cập nhật thất bại: " + error.message);
      return;
    }

    message.success("Đã cập nhật trạng thái");
    invalidate({ resource: "orders", invalidates: ["list"] });
  };
  // Filter orders
  // React.useEffect(() => {
  //   let result = orders;

  //   if (searchText) {
  //     result = result.filter(order =>
  //       order.orderNumber.toLowerCase().includes(searchText.toLowerCase()) ||
  //       order.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
  //       order.email.toLowerCase().includes(searchText.toLowerCase())
  //     );
  //   }

  //   if (statusFilter) {
  //     result = result.filter(order => order.status === statusFilter);
  //   }

  //   setFilteredOrders(result);
  // }, [searchText, statusFilter, orders]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const handleView = (record: Order) => {
    setSelectedOrder(record);
    setIsModalVisible(true);
    console.log("Selected Order:", record);
  };

  const handleEdit = (record: Order) => {
    setSelectedOrder(record);
    form.setFieldsValue(record);
    setIsEditModalVisible(true);
  };

  const handleDelete = (record: Order) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa đơn hàng ${record.id} ? `,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk() {
        setOrders(orders.filter(o => o.id !== record.id));
        message.success('Đã xóa đơn hàng thành công!');
      },
    });
  };

  const handleUpdateStatus = (values: any) => {
    if (!selectedOrder) return; // ← add this guard
    setOrders(orders.map(o =>
      o.id === selectedOrder.id ? { ...o, ...values } : o
    ));
    setIsEditModalVisible(false);
    message.success('Cập nhật đơn hàng thành công!');
  };
  const handleExport = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      message.warning("Không có dữ liệu để xuất Excel");
      return;
    }

    const exportData = filteredOrders.map((order: any, index: number) => {
      const addr = order.addresses;
      const fullAddress = [
        addr?.address_line,
        addr?.communes?.name,
        addr?.communes?.provinces?.name,
      ].filter(Boolean).join(", ");

      const totalQty = (order.order_items ?? []).reduce(
        (sum: number, item: any) => sum + (item.quantity ?? 0), 0
      );

      return {
        "STT": index + 1,
        "Mã đơn": `#${order.id}`,
        "Khách hàng": addr?.full_name ?? "–",
        "Số điện thoại": addr?.phone ?? "–",
        "Email": addr?.mail ?? "–",
        "Địa chỉ": fullAddress || "–",
        "Số lượng SP": totalQty,
        "Tổng tiền (VNĐ)": order.total_price ?? 0,
        "Trạng thái": getStatusText(order.status),
        "Ghi chú": order.note ?? "",
        "Ngày đặt": dayjs(order.created_at).format("DD/MM/YYYY HH:mm"),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...exportData.map((row) => String((row as Record<string, any>)[key] ?? "").length)
      ) + 2,
    }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Đơn hàng");

    // 🔥 Tên file có kèm khoảng thời gian nếu đang lọc ngày
    const dateSuffix = dateRange?.[0] && dateRange?.[1]
      ? `_${dateRange[0].format("DDMMYYYY")}-${dateRange[1].format("DDMMYYYY")}`
      : "";

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `don-hang${dateSuffix}_${dayjs().format("DDMMYYYY-HHmm")}.xlsx`);
  };

  // ✅ Lấy data gốc từ tableProps
  const rawData: any[] = (tableProps.dataSource as any[]) ?? [];

  // ✅ Filter client-side
  const filteredOrders = rawData.filter((order) => {
    const addr = order.addresses;
    const fullName = addr?.full_name?.toLowerCase() ?? "";
    const phone = addr?.phone?.toLowerCase() ?? "";
    const orderId = String(order.id);
    const q = searchText.trim().toLowerCase();

    const matchSearch =
      !q || fullName.includes(q) || phone.includes(q) || orderId.includes(q);

    const matchStatus = !statusFilter || order.status === statusFilter;

    // ✅ Lọc thời gian
    const matchDate = (() => {
      if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
      const orderDate = dayjs(order.created_at);
      return (
        orderDate.isAfter(dateRange[0].startOf("day").subtract(1, "ms")) &&
        orderDate.isBefore(dateRange[1].endOf("day").add(1, "ms"))
      );
    })();

    return matchSearch && matchStatus && matchDate;
  });

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <ShoppingCartOutlined /> Quản lý đơn hàng
        </Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
          style={{ float: 'right', marginTop: -40 }}
        >
          Xuất Excel
        </Button>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={stats.total}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Chờ xử lý"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Đã thanh toán"
              value={stats.paid}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Đã gửi hàng"
              value={stats.shipping}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Đã giao"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Đã hủy"
              value={stats.cancelled}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#fb0000' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Tìm kiếm theo mã đơn, khách hàng..."
                prefix={<SearchOutlined />}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Select
                placeholder="Lọc theo trạng thái"
                style={{ width: '100%' }}
                allowClear
                value={statusFilter}
                onChange={setStatusFilter}
              >
                {statusOptions.map((opt) => {
                  const s = getStatusStyle(opt.value);
                  return (
                    <Select.Option key={opt.value} value={opt.value}>
                      <Tag icon={s.icon} color={s.color} style={{ margin: 0 }}>
                        {opt.label}
                      </Tag>
                    </Select.Option>
                  );
                })}
              </Select>

            </Col>
            <Col xs={24} sm={12} md={8}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                placeholder={['Từ ngày', 'Đến ngày']}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as any)}
              />
            </Col>
          </Row>
        </Space>
      </Card>
      {(searchText || statusFilter) && (
        <span style={{ fontSize: 12, color: "#888" }}>
          {filteredOrders.length} / {rawData.length} đơn hàng
        </span>
      )}
      {/* Table */}
      <Card>
        <Table
          {...tableProps}
          dataSource={filteredOrders}  // ✅ dùng data đã filter
          rowKey="id"
        >
          <Table.Column
            dataIndex="id"
            title="Mã đơn"
            render={(v) => <Text strong>#{v}</Text>}
          />

          <Table.Column
            title="Khách hàng"
            render={(_, record: any) => (
              <div>
                <Text strong>{record.addresses?.full_name ?? "–"}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{record.addresses?.phone ?? ""}</Text>
              </div>
            )}
          />

          <Table.Column
            title="Email"
            render={(_, record: any) => (
              <Text type="secondary">{record.addresses?.mail ?? "–"}</Text>
            )}
          />

          <Table.Column
            title="Địa chỉ"
            render={(_, record: any) => {
              const addr = record.addresses;

              const fullAddress = [
                addr?.address_line,
                addr?.communes?.name,
                addr?.communes?.provinces?.name,
              ]
                .filter(Boolean)
                .join(", ");

              return <Text>{fullAddress || "–"}</Text>;
            }}
          />
          <Table.Column
            dataIndex="created_at"
            title="Ngày đặt"
            render={(value) => dayjs(value).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")}
          />

          <Table.Column
            dataIndex="total_price"
            title="Tổng tiền"
            render={(v) => (
              <Text strong style={{ whiteSpace: "nowrap" }}>
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(v)}
              </Text>
            )}
          />

          <Table.Column
            dataIndex="status"
            title="Trạng thái"
            render={(status: string, record: any) => {
              const st = getStatusStyle(status);
              return (
                <Select
                  value={status}
                  style={{ minWidth: 160 }}
                  onChange={(newStatus) => handleChangeStatus(record.id, newStatus)}
                  variant="borderless"
                  popupMatchSelectWidth={false}
                >
                  {statusOptions.map((opt) => {
                    const s = getStatusStyle(opt.value);
                    return (
                      <Select.Option key={opt.value} value={opt.value}>
                        <Tag icon={s.icon} color={s.color} style={{ margin: 0 }}>
                          {opt.label}
                        </Tag>
                      </Select.Option>
                    );
                  })}
                </Select>
              );
            }}
          />

          <Table.Column
            dataIndex="note"
            title="Ghi chú"
            render={(v) => v ? <Text type="secondary">{v}</Text> : <Text type="secondary">–</Text>}
          />

          <Table.Column
            title="Thao tác"
            render={(_, record: any) => (
              <Space>
                <Button icon={<EyeOutlined />} onClick={() => handleView(record)} />
              </Space>
            )}
          />
        </Table>

        <Table.Column
          title="Thao tác"
          render={(_, record) => (
            <Space>
              <Button icon={<EyeOutlined />} />
              {/* <Button icon={<EditOutlined />} />
                <Button danger icon={<DeleteOutlined />} /> */}
            </Space>
          )}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title={`Chi tiết đơn hàng #${selectedOrder?.id ?? ''}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedOrder && (
          <div>
            <Card title="Thông tin khách hàng" style={{ marginBottom: 16 }}>
              <p><strong>Họ tên:</strong> {selectedOrder.addresses?.full_name ?? "–"}</p>
              <p><strong>Email:</strong> {selectedOrder.addresses?.mail ?? "–"}</p>
              <p><strong>Số điện thoại:</strong> {selectedOrder.addresses?.phone ?? "–"}</p>
              <p>
                <strong>Địa chỉ:</strong>{" "}
                {selectedOrder.addresses
                  ? `${selectedOrder.addresses.address_line}, ${selectedOrder.addresses.communes?.name ?? ""}, ${selectedOrder.addresses.communes?.provinces?.name ?? ""}`
                  : "–"}
              </p>
            </Card>
            <Card title="Thông tin đơn hàng">
              <p><strong>Mã đơn:</strong> {selectedOrder.id}</p>
              <p>
                <strong>Ngày đặt:</strong>{" "}
                {new Date(selectedOrder.created_at).toLocaleString("vi-VN")}
              </p>
              <p>
                <strong>Số lượng sản phẩm:</strong>{" "}
                {(selectedOrder.order_items ?? []).reduce(
                  (sum: number, item: any) => sum + (item.quantity ?? 0), 0
                )}
              </p>
              <p><strong>Tổng tiền:</strong> <Text strong style={{ color: '#1890ff', fontSize: 18 }}>{formatCurrency(selectedOrder.total_price)}</Text></p>
              <p><strong>Trạng thái:</strong> <Tag icon={getStatusIcon(selectedOrder.status)} color={getStatusColor(selectedOrder.status)}>
                {getStatusText(selectedOrder.status)}
              </Tag></p>
            </Card>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={`Chỉnh sửa đơn hàng ${selectedOrder?.id || ''} `}
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={() => form.submit()}
        okText="Cập nhật"
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateStatus}
        >
          <Form.Item
            name="status"
            label="Trạng thái đơn hàng"
            rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
          >
            <Select placeholder="Chọn trạng thái">
              <Select.Option value="pending">
                <Tag icon={<ClockCircleOutlined />} color="gold">Chờ xử lý</Tag>
              </Select.Option>
              <Select.Option value="processing">
                <Tag icon={<SyncOutlined spin />} color="blue">Đang xử lý</Tag>
              </Select.Option>
              <Select.Option value="shipped">
                <Tag icon={<CarOutlined />} color="purple">Đã gửi hàng</Tag>
              </Select.Option>
              <Select.Option value="delivered">
                <Tag icon={<CheckCircleOutlined />} color="green">Đã giao</Tag>
              </Select.Option>
              <Select.Option value="cancelled">
                <Tag icon={<CloseCircleOutlined />} color="red">Đã hủy</Tag>
              </Select.Option>
            </Select>
          </Form.Item>
        </Form>

      </Modal>

    </div>

  );
};

const App = () => {
  return <OrderList />;
};

export default App;