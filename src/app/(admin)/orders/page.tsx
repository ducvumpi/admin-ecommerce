"use client";
import React, { useState } from 'react';
import {
  Table, Space, Tag, Input, Select, Card, Row, Col, Statistic,
  DatePicker, Modal, Form, Typography, Button, message, Tabs, Upload, Image
} from "antd";
import {
  ShoppingCartOutlined, ClockCircleOutlined, SyncOutlined, CarOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, DownloadOutlined,
  EyeOutlined, RollbackOutlined, ExclamationCircleOutlined
} from "@ant-design/icons";
import { useTable } from "@refinedev/antd";
import { useList, useInvalidate } from "@refinedev/core"; import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { supabase } from "../../libs/supabaseClient";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────
interface Refund {
  id: string;
  order_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  reason: string;
  note?: string;
  images?: string[];
  payment_method?: string;
  refund_amount?: number;
  bank_info?: string;
  admin_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  refunded_at?: string;
  orders?: any;
}

// ─── Constants ────────────────────────────────────────────
const statusOptions = [
  { value: "pending", label: "Đã đặt hàng", color: "gold", icon: <ShoppingCartOutlined /> },
  { value: "paid", label: "Đã thanh toán", color: "cyan", icon: <CheckCircleOutlined /> },
  { value: "packing", label: "Đang đóng gói", color: "orange", icon: <SyncOutlined spin /> },
  { value: "shipping", label: "Đang giao hàng", color: "purple", icon: <CarOutlined /> },
  { value: "completed", label: "Hoàn thành", color: "green", icon: <CheckCircleOutlined /> },
  { value: "cancelled", label: "Đã hủy", color: "red", icon: <CloseCircleOutlined /> },
];

const refundStatusOptions = [
  { value: "pending", label: "Chờ duyệt", color: "gold" },
  { value: "approved", label: "Đã duyệt", color: "blue" },
  { value: "rejected", label: "Từ chối", color: "red" },
  { value: "refunded", label: "Đã hoàn tiền", color: "green" },
];

const getStatusStyle = (status: string) =>
  statusOptions.find(s => s.value === status) ?? { color: "default", icon: <ClockCircleOutlined />, label: status };

const getStatusText = (status: string) =>
  statusOptions.find(s => s.value === status)?.label ?? status;

const getRefundStatusStyle = (status: string) =>
  refundStatusOptions.find(s => s.value === status) ?? { color: "default", label: status };

const formatCurrency = (amount: any) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

// ═══════════════════════════════════════════════════════════
// Tab 1 — Danh sách đơn hàng
// ═══════════════════════════════════════════════════════════
function OrderTab() {
  const invalidate = useInvalidate();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  // Refund request modal (admin tạo thay khách)
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { tableProps } = useTable({
    resource: "orders",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    meta: {
      select: `
        id, user_id, address_id, total_price, status, created_at, note,
        payment_method,
        addresses ( full_name, phone, mail, address_line, ward, city,
          communes ( name, provinces!fk_communes_province ( name ) )
        ),
        order_items ( quantity )
      `,
    },
  });

  const { result } = useList({
    resource: "orders",
    pagination: { mode: "off" },
    meta: { select: "id, status" },
  });
  const resultData = result?.data;

  const stats = React.useMemo(() => {
    const s = { total: 0, pending: 0, paid: 0, packing: 0, shipping: 0, completed: 0, cancelled: 0 };
    resultData?.forEach((o: any) => {
      s.total++;
      const k = o.status as keyof typeof s;
      if (k in s) s[k]++;
    });
    return s;
  }, [resultData]);

  const rawData: any[] = (tableProps.dataSource as any[]) ?? [];
  const filteredOrders = rawData.filter(order => {
    const addr = order.addresses;
    const q = searchText.trim().toLowerCase();
    const matchSearch = !q ||
      (addr?.full_name ?? '').toLowerCase().includes(q) ||
      (addr?.phone ?? '').toLowerCase().includes(q) ||
      String(order.id).includes(q);
    const matchStatus = !statusFilter || order.status === statusFilter;
    const matchDate = (() => {
      if (!dateRange?.[0] || !dateRange?.[1]) return true;
      const d = dayjs(order.created_at).tz("Asia/Ho_Chi_Minh");
      return d.isAfter(dateRange[0].startOf("day").subtract(1, "ms")) &&
        d.isBefore(dateRange[1].endOf("day").add(1, "ms"));
    })();
    return matchSearch && matchStatus && matchDate;
  });

  const handleChangeStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) { message.error("Cập nhật thất bại: " + error.message); return; }
    message.success("Đã cập nhật trạng thái");
    invalidate({ resource: "orders", invalidates: ["list"] });
  };

  // Admin tạo refund request cho đơn
  const handleOpenRefund = (record: any) => {
    setSelectedOrder(record);
    refundForm.setFieldsValue({
      refund_amount: record.total_price,
      payment_method: record.payment_method ?? 'bank_transfer',
    });
    setIsRefundOpen(true);
  };

  const handleSubmitRefund = async (values: any) => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("refunds").insert({
        order_id: selectedOrder.id,
        user_id: selectedOrder.user_id,
        status: 'pending',
        reason: values.reason,
        note: values.note ?? null,
        refund_amount: values.refund_amount,
        payment_method: values.payment_method,
        bank_info: values.bank_info ?? null,
        reviewed_by: user?.id ?? null,
      });
      if (error) throw error;

      // Cập nhật status đơn → cancelled nếu admin chọn
      if (values.cancel_order) {
        await supabase.from("orders").update({ status: 'cancelled' }).eq("id", selectedOrder.id);
        invalidate({ resource: "orders", invalidates: ["list"] });
      }

      message.success("Đã tạo yêu cầu hoàn tiền");
      invalidate({ resource: "refunds", invalidates: ["list"] });
      refundForm.resetFields();
      setIsRefundOpen(false);
    } catch (err: any) {
      message.error(err.message ?? "Lỗi tạo hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!filteredOrders.length) { message.warning("Không có dữ liệu"); return; }
    const exportData = filteredOrders.map((order: any, i: number) => {
      const addr = order.addresses;
      return {
        "STT": i + 1,
        "Mã đơn": `#${order.id}`,
        "Khách hàng": addr?.full_name ?? "–",
        "SĐT": addr?.phone ?? "–",
        "Email": addr?.mail ?? "–",
        "Địa chỉ": [addr?.address_line, addr?.communes?.name, addr?.communes?.provinces?.name].filter(Boolean).join(", ") || "–",
        "Tổng tiền": order.total_price ?? 0,
        "Trạng thái": getStatusText(order.status),
        "Ghi chú": order.note ?? "",
        "Ngày đặt": dayjs.utc(order.created_at).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm"),
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Đơn hàng");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `don-hang_${dayjs().format("DDMMYYYY-HHmm")}.xlsx`);
  };

  return (
    <>
      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {[
          { label: "Tổng đơn", value: stats.total, color: "#1890ff", icon: <ShoppingCartOutlined /> },
          { label: "Chờ xử lý", value: stats.pending, color: "#faad14", icon: <ClockCircleOutlined /> },
          { label: "Đã thanh toán", value: stats.paid, color: "#13c2c2", icon: <CheckCircleOutlined /> },
          { label: "Đang giao", value: stats.shipping, color: "#722ed1", icon: <CarOutlined /> },
          { label: "Hoàn thành", value: stats.completed, color: "#52c41a", icon: <CheckCircleOutlined /> },
          { label: "Đã hủy", value: stats.cancelled, color: "#ff4d4f", icon: <CloseCircleOutlined /> },
        ].map(s => (
          <Col key={s.label} xs={24} sm={12} md={8} lg={4}>
            <Card><Statistic title={s.label} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} /></Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input placeholder="Tìm mã đơn, khách hàng..." prefix={<SearchOutlined />} allowClear
              value={searchText} onChange={e => setSearchText(e.target.value)} />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select placeholder="Lọc trạng thái" style={{ width: '100%' }} allowClear
              value={statusFilter} onChange={setStatusFilter}>
              {statusOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  <Tag icon={opt.icon} color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['Từ ngày', 'Đến ngày']}
              value={dateRange} onChange={d => setDateRange(d as any)} />
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text type="secondary">{filteredOrders.length} / {rawData.length} đơn hàng</Text>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Xuất Excel</Button>
        </div>
        <Table {...tableProps} dataSource={filteredOrders} rowKey="id">
          <Table.Column dataIndex="id" title="Mã đơn" render={v => <Text strong>#{v}</Text>} />
          <Table.Column title="Khách hàng" render={(_, r: any) => (
            <div>
              <Text strong>{r.addresses?.full_name ?? "–"}</Text><br />
              <Text type="secondary" style={{ fontSize: 12 }}>{r.addresses?.phone ?? ""}</Text>
            </div>
          )} />
          <Table.Column title="Email" render={(_, r: any) => <Text type="secondary">{r.addresses?.mail ?? "–"}</Text>} />
          <Table.Column dataIndex="created_at" title="Ngày đặt"
            render={v => dayjs.utc(v).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")} />
          <Table.Column dataIndex="total_price" title="Tổng tiền"
            render={v => <Text strong style={{ whiteSpace: 'nowrap' }}>{formatCurrency(v)}</Text>} />
          <Table.Column dataIndex="status" title="Trạng thái"
            render={(status, record: any) => (
              <Select value={status} style={{ minWidth: 160 }} variant="borderless"
                onChange={v => handleChangeStatus(record.id, v)} popupMatchSelectWidth={false}>
                {statusOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    <Tag icon={opt.icon} color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            )} />
          <Table.Column dataIndex="note" title="Ghi chú"
            render={v => <Text type="secondary">{v ?? "–"}</Text>} />
          <Table.Column title="Thao tác" render={(_, record: any) => (
            <Space>
              <Button icon={<EyeOutlined />} onClick={() => { setSelectedOrder(record); setIsViewOpen(true); }} />
              <Button
                icon={<RollbackOutlined />}
                danger
                disabled={['pending', 'cancelled'].includes(record.status) === false ? false :
                  record.status === 'cancelled'}
                onClick={() => handleOpenRefund(record)}
                title="Tạo yêu cầu hoàn tiền"
              />
            </Space>
          )} />
        </Table>
      </Card>

      {/* View Modal */}
      <Modal title={`Chi tiết đơn #${selectedOrder?.id ?? ''}`} open={isViewOpen}
        onCancel={() => setIsViewOpen(false)} footer={<Button onClick={() => setIsViewOpen(false)}>Đóng</Button>} width={600}>
        {selectedOrder && (
          <>
            <Card title="Thông tin khách hàng" style={{ marginBottom: 16 }}>
              <p><strong>Họ tên:</strong> {selectedOrder.addresses?.full_name ?? "–"}</p>
              <p><strong>Email:</strong> {selectedOrder.addresses?.mail ?? "–"}</p>
              <p><strong>SĐT:</strong> {selectedOrder.addresses?.phone ?? "–"}</p>
              <p><strong>Địa chỉ:</strong> {[
                selectedOrder.addresses?.address_line,
                selectedOrder.addresses?.communes?.name,
                selectedOrder.addresses?.communes?.provinces?.name,
              ].filter(Boolean).join(", ") || "–"}</p>
            </Card>
            <Card title="Thông tin đơn hàng">
              <p><strong>Mã đơn:</strong> #{selectedOrder.id}</p>
              <p><strong>Ngày đặt:</strong> {dayjs.utc(selectedOrder.created_at).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")}</p>
              <p><strong>Tổng tiền:</strong> <Text strong style={{ color: '#1890ff', fontSize: 18 }}>{formatCurrency(selectedOrder.total_price)}</Text></p>
              <p><strong>Trạng thái:</strong> <Tag icon={getStatusStyle(selectedOrder.status).icon} color={getStatusStyle(selectedOrder.status).color}>{getStatusText(selectedOrder.status)}</Tag></p>
              <p><strong>Ghi chú:</strong> {selectedOrder.note ?? "–"}</p>
            </Card>
          </>
        )}
      </Modal>

      {/* Refund Request Modal */}
      <Modal title={`Tạo hoàn tiền — Đơn #${selectedOrder?.id ?? ''}`} open={isRefundOpen}
        onCancel={() => { setIsRefundOpen(false); refundForm.resetFields(); }}
        onOk={() => refundForm.submit()} okText="Tạo yêu cầu" confirmLoading={submitting} width={560}>
        <Form form={refundForm} layout="vertical" onFinish={handleSubmitRefund}>
          <Form.Item name="refund_amount" label="Số tiền hoàn" rules={[{ required: true }]}>
            <Input type="number" addonAfter="₫" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do hoàn tiền" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Select placeholder="Chọn lý do">
              <Select.Option value="customer_request">Khách yêu cầu hủy</Select.Option>
              <Select.Option value="wrong_item">Sai sản phẩm</Select.Option>
              <Select.Option value="damaged">Hàng bị hỏng</Select.Option>
              <Select.Option value="not_delivered">Không nhận được hàng</Select.Option>
              <Select.Option value="other">Khác</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="payment_method" label="Phương thức hoàn">
            <Select>
              <Select.Option value="bank_transfer">Chuyển khoản ngân hàng</Select.Option>
              <Select.Option value="vnpay">VNPAY</Select.Option>
              <Select.Option value="cash">Tiền mặt</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="bank_info" label="Thông tin tài khoản">
            <Input.TextArea rows={2} placeholder="Ngân hàng, số TK, chủ TK..." />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="cancel_order" valuePropName="checked">
            <input type="checkbox" /> <Text style={{ marginLeft: 8 }}>Đồng thời hủy đơn hàng này</Text>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Tab 2 — Quản lý hoàn tiền
// ═══════════════════════════════════════════════════════════
function RefundTab() {
  const invalidate = useInvalidate();
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { tableProps } = useTable({
    resource: "refunds",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    meta: {
      select: `
        *,
        orders ( id, total_price, status,
          addresses ( full_name, phone, mail )
        )
      `,
    },
  });

  const rawData: any[] = (tableProps.dataSource as any[]) ?? [];
  const filteredRefunds = statusFilter
    ? rawData.filter(r => r.status === statusFilter)
    : rawData;

  const handleOpenReview = (record: Refund) => {
    setSelectedRefund(record);
    reviewForm.setFieldsValue({
      status: record.status,
      admin_note: record.admin_note,
      bank_info: record.bank_info,
    });
    setIsReviewOpen(true);
  };

  const handleReview = async (values: any) => {
    if (!selectedRefund) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const updatePayload: any = {
        status: values.status,
        admin_note: values.admin_note ?? null,
        reviewed_by: user?.id ?? null,
        reviewed_at: now,
        updated_at: now,
      };

      // Nếu đánh dấu đã hoàn tiền
      if (values.status === 'refunded') {
        updatePayload.refunded_at = now;
        updatePayload.payment_method = values.payment_method;
        updatePayload.bank_info = values.bank_info ?? null;
      }

      const { error } = await supabase.from("refunds").update(updatePayload).eq("id", selectedRefund.id);
      if (error) throw error;

      // Nếu approved/refunded → cập nhật đơn hàng → cancelled
      if (['approved', 'refunded'].includes(values.status) && selectedRefund.order_id) {
        await supabase.from("orders").update({ status: 'cancelled' }).eq("id", selectedRefund.order_id);
        invalidate({ resource: "orders", invalidates: ["list"] });
      }

      message.success("Đã cập nhật yêu cầu hoàn tiền");
      invalidate({ resource: "refunds", invalidates: ["list"] });
      setIsReviewOpen(false);
    } catch (err: any) {
      message.error(err.message ?? "Lỗi cập nhật");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Select placeholder="Lọc trạng thái hoàn tiền" style={{ width: '100%' }} allowClear
              value={statusFilter} onChange={setStatusFilter}>
              {refundStatusOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  <Tag color={opt.color} style={{ margin: 0 }}>{opt.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table {...tableProps} dataSource={filteredRefunds} rowKey="id">
          <Table.Column dataIndex="id" title="Mã hoàn" render={v => <Text code style={{ fontSize: 11 }}>{String(v).slice(0, 8)}...</Text>} />
          <Table.Column title="Đơn hàng" render={(_, r: any) => (
            <div>
              <Text strong>#{r.order_id?.slice(0, 8)}...</Text><br />
              <Text type="secondary" style={{ fontSize: 12 }}>{r.orders?.addresses?.full_name ?? "–"}</Text>
            </div>
          )} />
          <Table.Column title="SĐT" render={(_, r: any) => <Text>{r.orders?.addresses?.phone ?? "–"}</Text>} />
          <Table.Column dataIndex="reason" title="Lý do" render={v => (
            <Tag>{({
              customer_request: 'Khách hủy',
              wrong_item: 'Sai hàng',
              damaged: 'Hỏng hàng',
              not_delivered: 'Chưa nhận',
              other: 'Khác',
            } as any)[v] ?? v}</Tag>
          )} />
          <Table.Column dataIndex="refund_amount" title="Số tiền hoàn"
            render={v => <Text strong style={{ color: '#f5222d' }}>{formatCurrency(v)}</Text>} />
          <Table.Column dataIndex="status" title="Trạng thái"
            render={v => { const s = getRefundStatusStyle(v); return <Tag color={s.color}>{s.label}</Tag>; }} />
          <Table.Column dataIndex="created_at" title="Ngày tạo"
            render={v => dayjs.utc(v).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")} />
          <Table.Column title="Thao tác" render={(_, record: any) => (
            <Space>
              <Button size="small" icon={<EyeOutlined />}
                onClick={() => { setSelectedRefund(record); setIsViewOpen(true); }}>Xem</Button>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                disabled={record.status === 'refunded' || record.status === 'rejected'}
                onClick={() => handleOpenReview(record)}>Duyệt</Button>
            </Space>
          )} />
        </Table>
      </Card>

      {/* View Refund Detail */}
      <Modal title="Chi tiết yêu cầu hoàn tiền" open={isViewOpen}
        onCancel={() => setIsViewOpen(false)} footer={<Button onClick={() => setIsViewOpen(false)}>Đóng</Button>} width={560}>
        {selectedRefund && (
          <>
            <Card title="Thông tin khách hàng" size="small" style={{ marginBottom: 12 }}>
              <p><strong>Họ tên:</strong> {selectedRefund.orders?.addresses?.full_name ?? "–"}</p>
              <p><strong>SĐT:</strong> {selectedRefund.orders?.addresses?.phone ?? "–"}</p>
              <p><strong>Email:</strong> {selectedRefund.orders?.addresses?.mail ?? "–"}</p>
            </Card>
            <Card title="Chi tiết hoàn tiền" size="small" style={{ marginBottom: 12 }}>
              <p><strong>Số tiền hoàn:</strong> <Text strong style={{ color: '#f5222d' }}>{formatCurrency(selectedRefund.refund_amount)}</Text></p>
              <p><strong>Lý do:</strong> {selectedRefund.reason}</p>
              <p><strong>Ghi chú KH:</strong> {selectedRefund.note ?? "–"}</p>
              <p><strong>TT thanh toán:</strong> {selectedRefund.payment_method ?? "–"}</p>
              <p><strong>Thông tin TK:</strong> {selectedRefund.bank_info ?? "–"}</p>
              <p><strong>Trạng thái:</strong> <Tag color={getRefundStatusStyle(selectedRefund.status).color}>{getRefundStatusStyle(selectedRefund.status).label}</Tag></p>
              {selectedRefund.admin_note && <p><strong>Ghi chú admin:</strong> {selectedRefund.admin_note}</p>}
              {selectedRefund.refunded_at && <p><strong>Hoàn tiền lúc:</strong> {dayjs.utc(selectedRefund.refunded_at).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")}</p>}
            </Card>
            {(selectedRefund.images ?? []).length > 0 && (
              <Card title="Hình ảnh đính kèm" size="small">
                <Space wrap>
                  {selectedRefund.images!.map((img, i) => (
                    <Image key={i} src={img} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 6 }} />
                  ))}
                </Space>
              </Card>
            )}
          </>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal title="Xử lý hoàn tiền" open={isReviewOpen}
        onCancel={() => setIsReviewOpen(false)} onOk={() => reviewForm.submit()}
        okText="Xác nhận" confirmLoading={submitting} width={500}>
        <Form form={reviewForm} layout="vertical" onFinish={handleReview}>
          <Form.Item name="status" label="Cập nhật trạng thái" rules={[{ required: true }]}>
            <Select>
              {refundStatusOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  <Tag color={opt.color}>{opt.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.status !== cur.status}>
            {({ getFieldValue }) => getFieldValue('status') === 'refunded' && (
              <>
                <Form.Item name="payment_method" label="Phương thức hoàn tiền" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="bank_transfer">Chuyển khoản ngân hàng</Select.Option>
                    <Select.Option value="vnpay">VNPAY</Select.Option>
                    <Select.Option value="cash">Tiền mặt</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item name="bank_info" label="Thông tin tài khoản / Mã giao dịch">
                  <Input.TextArea rows={2} placeholder="Số TK, ngân hàng, mã GD VNPAY..." />
                </Form.Item>
              </>
            )}
          </Form.Item>
          <Form.Item name="admin_note" label="Ghi chú admin">
            <Input.TextArea rows={3} placeholder="Lý do duyệt / từ chối..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════
export default function OrderManagement() {
  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      <Title level={2}><ShoppingCartOutlined /> Quản lý đơn hàng</Title>
      <Tabs
        defaultActiveKey="orders"
        items={[
          { key: "orders", label: "📦 Đơn hàng", children: <OrderTab /> },
          { key: "refunds", label: "↩️ Hoàn tiền", children: <RefundTab /> },
        ]}
      />
    </div>
  );
}