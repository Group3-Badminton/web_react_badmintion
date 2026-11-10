import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Typography,
  Drawer,
  Divider,
  Statistic,
  Modal,
  Radio,
  message,
  Descriptions
} from 'antd';
import {
  FileTextOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  QrcodeOutlined,
  PrinterOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  PlayCircleOutlined,
  TagOutlined
} from '@ant-design/icons';
import { invoiceService } from '../../services/invoiceService';

const { Title, Text } = Typography;
const { Option } = Select;

export default function PaymentHistoryPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [stats, setStats] = useState({ totalRevenue: 0, totalPaidCount: 0, totalCash: 0, totalTransfer: 0 });

  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [invoiceToSettle, setInvoiceToSettle] = useState(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState('CASH');
  const [settleCashReceived, setSettleCashReceived] = useState(0);
  const [settleVoucherCode, setSettleVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    fetchInvoices(1);
  }, [orderType, paymentMethod, paymentStatus]);

  const fetchInvoices = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pagination.pageSize,
        search: search.trim(),
        orderType,
        paymentMethod,
        paymentStatus
      };

      const res = await invoiceService.getInvoices(params);
      const data = res?.data || res;
      setInvoices(data.invoices || []);
      setPagination({
        current: data.pagination?.page || page,
        pageSize: data.pagination?.limit || 10,
        total: data.pagination?.total || 0
      });
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải lịch sử thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    fetchInvoices(newPagination.current);
  };

  const handleOpenDrawer = async (record) => {
    setSelectedInvoice(record);
    setDrawerVisible(true);
    try {
      const res = await invoiceService.getInvoiceById(record._id);
      if (res?.data) {
        setSelectedInvoice(res.data);
      }
    } catch (e) {}
  };

  const handleOpenSettleModal = (record) => {
    setInvoiceToSettle(record);
    setSettlePaymentMethod('CASH');
    const initTotal = Number(record.totalAmount) || Number(record.subtotal) || 0;
    setSettleCashReceived(initTotal);
    setSettleVoucherCode('');
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setSettleModalVisible(true);
  };

  const handleApplySettleVoucher = async () => {
    if (!settleVoucherCode.trim()) {
      message.warning('Vui lòng nhập mã giảm giá!');
      return;
    }
    const orderAmt = Number(invoiceToSettle?.subtotal) || Number(invoiceToSettle?.totalAmount) || 0;
    setValidatingVoucher(true);
    try {
      const res = await invoiceService.validateVoucher({
        code: settleVoucherCode.trim(),
        orderAmount: orderAmt
      });
      const data = res?.data || res;
      setAppliedVoucher(data.voucher);
      setDiscountAmount(data.discountAmount || 0);
      message.success(res?.message || 'Áp dụng mã giảm giá thành công!');
    } catch (err) {
      message.error(err.response?.data?.message || 'Mã giảm giá không hợp lệ!');
      setAppliedVoucher(null);
      setDiscountAmount(0);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveSettleVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setSettleVoucherCode('');
  };

  const handleSettleSubmit = async () => {
    if (!invoiceToSettle) return;
    const finalAmt = Number(invoiceToSettle.subtotal) || Number(invoiceToSettle.totalAmount) || 0;
    const numCash = Number(settleCashReceived) || 0;

    if (settlePaymentMethod === 'CASH' && numCash < finalAmt) {
      message.error('Số tiền khách đưa không được nhỏ hơn tổng tiền phải thanh toán!');
      return;
    }

    setSettling(true);
    try {
      await invoiceService.settleSessionInvoice(invoiceToSettle._id, {
        paymentMethod: settlePaymentMethod,
        cashReceived: settlePaymentMethod === 'CASH' ? numCash : finalAmt,
        transactionReference: '',
        voucherCode: ''
      });
      message.success('Thanh toán hóa đơn ca chơi thành công!');
      setSettleModalVisible(false);
      fetchInvoices(pagination.current);
    } catch (err) {
      message.error(err.response?.data?.message || 'Thanh toán thất bại!');
    } finally {
      setSettling(false);
    }
  };

  const columns = [
    {
      title: 'Mã Hóa Đơn',
      dataIndex: 'invoiceCode',
      key: 'invoiceCode',
      render: (code) => <Tag color="blue" style={{ fontWeight: 700 }}>{code}</Tag>
    },
    {
      title: 'Loại Đơn',
      dataIndex: 'orderType',
      key: 'orderType',
      render: (type) =>
        type === 'POS' ? (
          <Tag color="orange" icon={<ShoppingOutlined />}>Bán lẻ POS</Tag>
        ) : (
          <Tag color="green" icon={<PlayCircleOutlined />}>Ca chơi</Tag>
        )
    },
    {
      title: 'Khách Hàng',
      key: 'customer',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {r.customer?.fullName || r.playingSessionId?.customerDisplayName || 'Khách lẻ'}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {r.customer?.phone || r.playingSessionId?.customerDisplayPhone || '--'}
          </div>
        </div>
      )
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (v) => (
        <span style={{ fontWeight: 800, color: '#009B60', fontSize: 14 }}>
          {(v || 0).toLocaleString('vi-VN')} đ
        </span>
      )
    },
    {
      title: 'Phương Thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => {
        if (method === 'CASH') return <Tag color="cyan"><DollarOutlined /> Tiền mặt</Tag>;
        if (method === 'TRANSFER' || method === 'VIETQR') return <Tag color="purple"><QrcodeOutlined /> Chuyển khoản QR</Tag>;
        return <Tag>{method}</Tag>;
      }
    },
    {
      title: 'Thu Ngân',
      key: 'staff',
      render: (_, r) => r.staffId?.fullName || '--'
    },
    {
      title: 'Thời Gian',
      key: 'paidAt',
      render: (_, r) => {
        const time = r.paidAt || r.createdAt;
        return time ? new Date(time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '--';
      }
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (st) =>
        st === 'PAID' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>Đã thanh toán</Tag>
        ) : (
          <Tag color="warning">Chưa thanh toán</Tag>
        )
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size={6}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDrawer(record)}
          >
            Chi tiết
          </Button>
          {record.paymentStatus === 'UNPAID' && (
            <Button
              type="primary"
              size="small"
              style={{ background: '#009B60', borderColor: '#009B60' }}
              onClick={() => handleOpenSettleModal(record)}
            >
              Thanh toán
            </Button>
          )}
        </Space>
      )
    }
  ];

  const currentSettleSubtotal = Number(invoiceToSettle?.subtotal) || Number(invoiceToSettle?.totalAmount) || 0;
  const currentSettleFinal = currentSettleSubtotal; // Loại bỏ voucher khỏi thanh toán hóa đơn ca chơi tại quầy
  const currentSettleNumCash = Number(settleCashReceived) || 0;
  const currentSettleChange = currentSettleNumCash >= currentSettleFinal ? currentSettleNumCash - currentSettleFinal : 0;

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color: '#111827' }}>
          <FileTextOutlined style={{ marginRight: 8, color: '#009B60' }} />
          Lịch Sử Thanh Toán & Quản Lý Hóa Đơn
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Theo dõi toàn bộ giao dịch thanh toán ca chơi và bán lẻ POS tại quầy
        </Text>
      </div>

      <Row gutter={[14, 14]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }} bodyStyle={{ padding: 14 }}>
            <Statistic
              title={<span style={{ color: '#166534', fontSize: 13, fontWeight: 600 }}>Tổng doanh thu</span>}
              value={stats.totalRevenue || 0}
              precision={0}
              suffix="đ"
              valueStyle={{ color: '#009B60', fontWeight: 800, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe' }} bodyStyle={{ padding: 14 }}>
            <Statistic
              title={<span style={{ color: '#1e40af', fontSize: 13, fontWeight: 600 }}>Hóa đơn đã chốt</span>}
              value={stats.totalPaidCount || 0}
              valueStyle={{ color: '#2563eb', fontWeight: 800, fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#ecfeff', border: '1px solid #a5f3fc' }} bodyStyle={{ padding: 14 }}>
            <Statistic
              title={<span style={{ color: '#155e75', fontSize: 13, fontWeight: 600 }}>Tiền mặt</span>}
              value={stats.totalCash || 0}
              precision={0}
              suffix="đ"
              valueStyle={{ color: '#0891b2', fontWeight: 800, fontSize: 19 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, background: '#faf5ff', border: '1px solid #e9d5ff' }} bodyStyle={{ padding: 14 }}>
            <Statistic
              title={<span style={{ color: '#6b21a8', fontSize: 13, fontWeight: 600 }}>Chuyển khoản QR</span>}
              value={stats.totalTransfer || 0}
              precision={0}
              suffix="đ"
              valueStyle={{ color: '#9333ea', fontWeight: 800, fontSize: 19 }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder="Tìm mã HĐ, tên khách, SĐT, mã giao dịch..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchInvoices(1)}
            style={{ width: 280 }}
            allowClear
          />

          <Select value={orderType} onChange={setOrderType} style={{ width: 140 }}>
            <Option value="ALL">Tất cả loại đơn</Option>
            <Option value="PLAYING_SESSION">Ca chơi</Option>
            <Option value="POS">Bán lẻ POS</Option>
          </Select>

          <Select value={paymentMethod} onChange={setPaymentMethod} style={{ width: 155 }}>
            <Option value="ALL">Tất cả phương thức</Option>
            <Option value="CASH">Tiền mặt</Option>
            <Option value="TRANSFER">Chuyển khoản QR</Option>
          </Select>

          <Select value={paymentStatus} onChange={setPaymentStatus} style={{ width: 155 }}>
            <Option value="ALL">Tất cả trạng thái</Option>
            <Option value="PAID">Đã thanh toán</Option>
            <Option value="UNPAID">Chưa thanh toán</Option>
          </Select>

          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => fetchInvoices(1)}
            style={{ background: '#009B60', borderColor: '#009B60' }}
          >
            Tìm kiếm
          </Button>

          <Button icon={<ReloadOutlined />} onClick={() => fetchInvoices(pagination.current)}>
            Làm mới
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          size="middle"
        />
      </Card>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ color: '#009B60' }} />
            <span>Chi Tiết Hóa Đơn {selectedInvoice?.invoiceCode}</span>
          </div>
        }
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={520}
        extra={
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            style={{ background: '#009B60', borderColor: '#009B60' }}
          >
            In hóa đơn
          </Button>
        }
      >
        {selectedInvoice && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0, color: '#009B60' }}>
                {selectedInvoice.orderType === 'POS' ? 'HÓA ĐƠN BÁN LẺ POS' : 'HÓA ĐƠN DỊCH VỤ CA CHƠI'}
              </Title>
              <Text type="secondary">Mã HĐ: {selectedInvoice.invoiceCode}</Text>
            </div>

            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Khách hàng">
                {selectedInvoice.customer?.fullName || 'Khách lẻ'}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedInvoice.customer?.phone || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="Thu ngân thực hiện">
                {selectedInvoice.staffId?.fullName || '--'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian thanh toán">
                {new Date(selectedInvoice.paidAt || selectedInvoice.createdAt).toLocaleString('vi-VN')}
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                {selectedInvoice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VietQR'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {selectedInvoice.paymentStatus === 'PAID' ? (
                  <Tag color="success">Đã thanh toán</Tag>
                ) : (
                  <Tag color="warning">Chưa thanh toán</Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            {selectedInvoice.orderType === 'PLAYING_SESSION' && selectedInvoice.sessionDetails && (
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>
                  Bảng kê chi tiết ca chơi:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Sân: {selectedInvoice.sessionDetails.courtName || '--'}</span>
                  <span>Thời lượng: {selectedInvoice.sessionDetails.scheduledDurationHours > 0 ? selectedInvoice.sessionDetails.scheduledDurationHours : 1} tiếng</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Tiền giờ chơi tiêu chuẩn:</span>
                  <span>{(selectedInvoice.sessionDetails.baseCourtFee || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                {selectedInvoice.sessionDetails.earlyCheckInFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#2563eb' }}>
                    <span>Phụ phí vào sân sớm:</span>
                    <span>+ {(selectedInvoice.sessionDetails.earlyCheckInFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {selectedInvoice.sessionDetails.extensionFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#2563eb' }}>
                    <span>Phí gia hạn thời gian:</span>
                    <span>+ {(selectedInvoice.sessionDetails.extensionFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {selectedInvoice.sessionDetails.consumableFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>Đồ uống & dịch vụ phát sinh:</span>
                    <span>+ {(selectedInvoice.sessionDetails.consumableFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {selectedInvoice.sessionDetails.rentalDamageFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#ea580c' }}>
                    <span>Bồi thường hư hỏng đồ thuê:</span>
                    <span>+ {(selectedInvoice.sessionDetails.rentalDamageFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
              </div>
            )}

            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Chi tiết mặt hàng / Dịch vụ:</div>
                <Table
                  dataSource={selectedInvoice.items}
                  rowKey={(r, i) => i}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Tên SP', dataIndex: 'productName', key: 'productName' },
                    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 45, align: 'center' },
                    {
                      title: 'Đơn giá',
                      dataIndex: 'unitPrice',
                      key: 'unitPrice',
                      align: 'right',
                      render: (v) => (v || 0).toLocaleString('vi-VN')
                    },
                    {
                      title: 'Thành tiền',
                      dataIndex: 'subtotal',
                      key: 'subtotal',
                      align: 'right',
                      render: (v) => <b>{(v || 0).toLocaleString('vi-VN')}</b>
                    }
                  ]}
                />
              </div>
            )}

            <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Tạm tính:</Text>
                <Text strong>{(selectedInvoice.subtotal || 0).toLocaleString('vi-VN')} đ</Text>
              </div>

              {selectedInvoice.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ea580c', marginBottom: 6 }}>
                  <span>Giảm giá Voucher ({selectedInvoice.voucherCode}):</span>
                  <span style={{ fontWeight: 700 }}>- {(selectedInvoice.discountAmount || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              )}

              <Divider style={{ margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 15 }}>Tổng thanh toán:</Text>
                <Text style={{ fontSize: 20, fontWeight: 800, color: '#009B60' }}>
                  {(selectedInvoice.totalAmount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </div>

              {selectedInvoice.paymentMethod === 'CASH' && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tiền khách đưa:</span>
                    <span>{(selectedInvoice.cashReceived || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tiền thừa trả khách:</span>
                    <span>{(selectedInvoice.changeAmount || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#009B60' }}>
            <DollarOutlined />
            <span>Thanh Toán Hóa Đơn Ca Chơi {invoiceToSettle?.invoiceCode}</span>
          </div>
        }
        open={settleModalVisible}
        onCancel={() => setSettleModalVisible(false)}
        onOk={handleSettleSubmit}
        confirmLoading={settling}
        okText="Xác nhận thanh toán"
        cancelText="Hủy"
        width={480}
      >
        {invoiceToSettle && (
          <div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Khách hàng:</span>
                <b>{invoiceToSettle.customer?.fullName || 'Khách lẻ'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Sân chơi:</span>
                <b>{invoiceToSettle.sessionDetails?.courtName || '--'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Tạm tính tiền ca:</span>
                <b>{currentSettleSubtotal.toLocaleString('vi-VN')} đ</b>
              </div>
            </div>

            {/* Đã loại bỏ voucher tại thanh toán hóa đơn ca chơi theo yêu cầu nghiệp vụ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text strong style={{ fontSize: 15 }}>Tổng cần thu:</Text>
              <Text style={{ fontSize: 22, fontWeight: 800, color: '#009B60' }}>
                {currentSettleFinal.toLocaleString('vi-VN')} đ
              </Text>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Radio.Group
                value={settlePaymentMethod}
                onChange={(e) => setSettlePaymentMethod(e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%', display: 'flex' }}
              >
                <Radio.Button value="CASH" style={{ flex: 1, textAlign: 'center' }}>
                  Tiền mặt
                </Radio.Button>
                <Radio.Button value="TRANSFER" style={{ flex: 1, textAlign: 'center' }}>
                  Chuyển khoản VietQR
                </Radio.Button>
              </Radio.Group>
            </div>

            {settlePaymentMethod === 'CASH' ? (
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tiền khách đưa:</div>
                <InputNumber
                  style={{ width: '100%', fontSize: 16, fontWeight: 700, marginBottom: 8 }}
                  value={settleCashReceived}
                  onChange={(val) => setSettleCashReceived(val || 0)}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  placeholder="Nhập số tiền khách đưa..."
                  addonAfter="đ"
                  size="large"
                />
                <Space size={6} wrap style={{ marginBottom: 10 }}>
                  {[currentSettleFinal, 50000, 100000, 200000, 500000].map((amt, idx) => (
                    <Button
                      key={idx}
                      size="small"
                      onClick={() => setSettleCashReceived(amt)}
                      style={{ fontSize: 12 }}
                    >
                      {amt === currentSettleFinal ? `Đủ tiền (${amt.toLocaleString('vi-VN')} đ)` : `${amt.toLocaleString('vi-VN')} đ`}
                    </Button>
                  ))}
                </Space>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ fontWeight: 600 }}>Tiền thừa trả khách:</span>
                  <span style={{ fontWeight: 800, color: currentSettleChange > 0 ? '#2563eb' : '#059669', fontSize: 16 }}>
                    {currentSettleChange.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', background: '#f8fafc', padding: 14, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  Quét mã QR qua ứng dụng ngân hàng để thanh toán:
                </div>
                <img
                  src={`https://img.vietqr.io/image/MB-0382379374-compact2.png?amount=${currentSettleFinal}&addInfo=${encodeURIComponent(`HD ${invoiceToSettle.invoiceCode}`)}&accountName=SAN%20CAU%20LONG%20BCMS`}
                  alt="VietQR"
                  style={{ maxWidth: 180, borderRadius: 8, border: '1px solid #cbd5e1' }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
