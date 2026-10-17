import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  TimePicker,
  Popconfirm,
  Typography,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Descriptions
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  FilterOutlined,
  SearchOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { pricingService } from '../../services/pricingService';

dayjs.extend(customParseFormat);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Định nghĩa nhãn và màu cho các loại sân
const COURT_TYPE_CONFIG = {
  ALL: { label: 'Tất cả loại sân', color: 'blue' },
  STANDARD: { label: 'Sân Tiêu Chuẩn', color: 'green' },
  VIP: { label: 'Sân VIP', color: 'gold' },
  PREMIUM: { label: 'Sân Thi Đấu', color: 'purple' }
};

// Danh sách các ngày trong tuần (0: CN, 1: T2, ... 6: T7)
const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ Nhật' }
];

export default function PricingManagementPage() {
  const [priceRules, setPriceRules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [filterCourtType, setFilterCourtType] = useState('ALL_TYPES');
  const [filterStatus, setFilterStatus] = useState('ALL_STATUS');
  const [filterDay, setFilterDay] = useState('ALL_DAYS');
  const [searchText, setSearchText] = useState('');

  // Modal Create / Update
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [editingRule, setEditingRule] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Modal Chi tiết (View Detail)
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetailRule, setSelectedDetailRule] = useState(null);

  // Tải danh sách quy tắc giá
  const fetchPriceRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCourtType !== 'ALL_TYPES') params.courtType = filterCourtType;
      if (filterStatus !== 'ALL_STATUS') params.status = filterStatus;
      if (filterDay !== 'ALL_DAYS') params.dayOfWeek = filterDay;
      if (searchText.trim()) params.search = searchText.trim();

      const res = await pricingService.getAll(params);
      if (res.success && Array.isArray(res.data)) {
        setPriceRules(res.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách quy tắc giá!');
    } finally {
      setLoading(false);
    }
  }, [filterCourtType, filterStatus, filterDay, searchText]);

  useEffect(() => {
    fetchPriceRules();
  }, [fetchPriceRules]);

  const handleOpenDetailModal = (record) => {
    setSelectedDetailRule(record);
    setDetailVisible(true);
  };

  // Thống kê nhanh
  const stats = {
    total: priceRules.length,
    active: priceRules.filter((r) => r.status === 'ACTIVE').length,
    inactive: priceRules.filter((r) => r.status === 'INACTIVE').length
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      courtType: 'ALL',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      startTime: dayjs('06:00', 'HH:mm'),
      endTime: dayjs('17:00', 'HH:mm'),
      pricePerHour: 100000
    });
    setModalVisible(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (record) => {
    setModalMode('EDIT');
    setEditingRule(record);
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      courtType: record.courtType,
      daysOfWeek: record.daysOfWeek,
      startTime: dayjs(record.startTime, 'HH:mm'),
      endTime: dayjs(record.endTime, 'HH:mm'),
      pricePerHour: record.pricePerHour,
      description: record.description
    });
    setModalVisible(true);
  };

  // Xử lý submit Form (Create hoặc Update)
  const handleFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const startTimeStr = values.startTime.format('HH:mm');
      const endTimeStr = values.endTime.format('HH:mm');

      // Kiểm tra logic giờ
      if (startTimeStr >= endTimeStr) {
        message.error('Giờ bắt đầu phải trước giờ kết thúc!');
        setSubmitting(false);
        return;
      }

      const payload = {
        name: values.name.trim(),
        courtType: values.courtType,
        daysOfWeek: values.daysOfWeek,
        startTime: startTimeStr,
        endTime: endTimeStr,
        pricePerHour: values.pricePerHour,
        description: values.description ? values.description.trim() : ''
      };

      if (modalMode === 'CREATE') {
        const res = await pricingService.create(payload);
        if (res.success) {
          message.success('Tạo quy tắc giá mới thành công!');
          setModalVisible(false);
          fetchPriceRules();
        }
      } else {
        const res = await pricingService.update(editingRule._id, payload);
        if (res.success) {
          message.success('Cập nhật quy tắc giá thành công!');
          setModalVisible(false);
          fetchPriceRules();
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  // UC-18.4: Vô hiệu hóa quy tắc giá (Soft Deactivate)
  const handleDeactivate = async (record) => {
    try {
      const res = await pricingService.deactivate(record._id);
      if (res.success) {
        message.success(`Đã vô hiệu hóa quy tắc "${record.name}" thành công!`);
        fetchPriceRules();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Vô hiệu hóa thất bại!');
    }
  };

  // Kích hoạt lại quy tắc giá
  const handleActivate = async (record) => {
    try {
      const res = await pricingService.activate(record._id);
      if (res.success) {
        message.success(`Đã kích hoạt lại quy tắc "${record.name}"!`);
        fetchPriceRules();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Kích hoạt thất bại!');
    }
  };

  // Chuyển mảng thứ trong tuần sang chuỗi hiển thị dễ hiểu
  const renderDaysOfWeek = (days) => {
    if (!days || days.length === 0) return <Text type="secondary">Chưa chọn</Text>;
    if (days.length === 7) return <Tag color="cyan">Cả tuần (T2 - CN)</Tag>;
    const weekdays = [1, 2, 3, 4, 5];
    const weekends = [6, 0];
    const isWeekdaysOnly = days.length === 5 && weekdays.every((d) => days.includes(d));
    if (isWeekdaysOnly) return <Tag color="geekblue">Thứ 2 - Thứ 6</Tag>;
    const isWeekendsOnly = days.length === 2 && weekends.every((d) => days.includes(d));
    if (isWeekendsOnly) return <Tag color="volcano">Cuối tuần (T7 & CN)</Tag>;

    const labelMap = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };
    return (
      <Space size={[0, 4]} wrap>
        {days
          .slice()
          .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
          .map((d) => (
            <Tag key={d} style={{ fontSize: 11 }}>
              {labelMap[d]}
            </Tag>
          ))}
      </Space>
    );
  };

  // Cấu hình các cột bảng
  const columns = [
    {
      title: 'Tên quy tắc giá',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {text}
          </Text>
          {record.description && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {record.description}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Loại sân áp dụng',
      dataIndex: 'courtType',
      key: 'courtType',
      render: (type) => {
        const config = COURT_TYPE_CONFIG[type] || { label: type, color: 'default' };
        return <Tag color={config.color} style={{ fontWeight: 600 }}>{config.label}</Tag>;
      }
    },
    {
      title: 'Ngày trong tuần',
      dataIndex: 'daysOfWeek',
      key: 'daysOfWeek',
      render: (days) => renderDaysOfWeek(days)
    },
    {
      title: 'Khung giờ',
      key: 'timeRange',
      render: (_, record) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#009B60' }} />
          <Text strong>
            {record.startTime} - {record.endTime}
          </Text>
        </Space>
      )
    },
    {
      title: 'Giá thuê / giờ',
      dataIndex: 'pricePerHour',
      key: 'pricePerHour',
      render: (price) => (
        <Text strong style={{ color: '#009B60', fontSize: 14 }}>
          {Number(price).toLocaleString('vi-VN')} đ
        </Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) =>
        status === 'ACTIVE' ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Đang áp dụng
          </Tag>
        ) : (
          <Tag color="default" icon={<StopOutlined />}>
            Đã vô hiệu hóa
          </Tag>
        )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {/* Xem chi tiết quy tắc giá */}
          <Tooltip title="Xem thông tin chi tiết về giá">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#009B60' }} />}
              onClick={() => handleOpenDetailModal(record)}
            >
              Chi tiết
            </Button>
          </Tooltip>

          {/* UC-18.3: Update Price */}
          <Tooltip title="Chỉnh sửa quy tắc giá">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleOpenEditModal(record)}
            >
              Sửa
            </Button>
          </Tooltip>

          {/* UC-18.4: Deactivate Price */}
          {record.status === 'ACTIVE' ? (
            <Popconfirm
              title="Vô hiệu hóa quy tắc giá này?"
              description={
                <div style={{ maxWidth: 300 }}>
                  Quy tắc giá này sẽ không còn áp dụng cho các lượt đặt sân mới. Dữ liệu lịch sử vẫn được bảo toàn.
                </div>
              }
              onConfirm={() => handleDeactivate(record)}
              okText="Đồng ý vô hiệu hóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Vô hiệu hóa quy tắc giá">
                <Button type="text" danger icon={<StopOutlined />}>
                  Vô hiệu hóa
                </Button>
              </Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip title="Kích hoạt lại quy tắc giá này">
              <Button
                type="text"
                style={{ color: '#009B60' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleActivate(record)}
              >
                Kích hoạt lại
              </Button>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Header trang */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
            Quản Lý Bảng Giá Thuê Sân
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            Thiết lập bảng giá linh hoạt theo từng loại sân, khung giờ trong ngày và ngày trong tuần (UC-18).
          </Paragraph>
        </div>

        {/* Nút Tạo mới UC-18.2 */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          style={{
            background: 'linear-gradient(135deg, #009B60, #057a44)',
            borderColor: '#009B60',
            fontWeight: 600,
            height: 40,
            borderRadius: 8
          }}
        >
          Thêm Quy Tắc Giá Mới
        </Button>
      </div>

      {/* Thẻ thống kê */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Tổng số quy tắc giá"
              value={stats.total}
              prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đang áp dụng"
              value={stats.active}
              valueStyle={{ color: '#009B60' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <Statistic
              title="Đã vô hiệu hóa"
              value={stats.inactive}
              valueStyle={{ color: '#94a3b8' }}
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc và tìm kiếm */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm theo tên hoặc mô tả..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filterCourtType}
              onChange={setFilterCourtType}
            >
              <Option value="ALL_TYPES">Tất cả loại sân</Option>
              <Option value="STANDARD">Sân Tiêu Chuẩn</Option>
              <Option value="VIP">Sân VIP</Option>
              <Option value="PREMIUM">Sân Thi Đấu</Option>
              <Option value="ALL">Áp dụng chung (ALL)</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filterDay}
              onChange={setFilterDay}
            >
              <Option value="ALL_DAYS">Tất cả các ngày</Option>
              <Option value={1}>Thứ 2</Option>
              <Option value={2}>Thứ 3</Option>
              <Option value={3}>Thứ 4</Option>
              <Option value={4}>Thứ 5</Option>
              <Option value={5}>Thứ 6</Option>
              <Option value={6}>Thứ 7</Option>
              <Option value={0}>Chủ Nhật</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
            >
              <Option value="ALL_STATUS">Tất cả trạng thái</Option>
              <Option value="ACTIVE">Đang áp dụng</Option>
              <Option value="INACTIVE">Đã vô hiệu hóa</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6} style={{ textAlign: 'right' }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchPriceRules}
              loading={loading}
            >
              Làm mới danh sách
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Bảng danh sách UC-18.1 */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={priceRules}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 8,
            showTotal: (total) => `Tổng cộng ${total} quy tắc giá`,
            showSizeChanger: true
          }}
          locale={{
            emptyText: 'Chưa có quy tắc giá nào phù hợp với bộ lọc.'
          }}
        />
      </Card>

      {/* Modal Thêm mới (UC-18.2) & Chỉnh sửa (UC-18.3) */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#009B60' }} />
            <span>
              {modalMode === 'CREATE'
                ? 'Thêm Quy Tắc Giá Thuê Sân Mới'
                : 'Chỉnh Sửa Quy Tắc Giá Thuê Sân'}
            </span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
        width={650}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          style={{ marginTop: 16 }}
        >
          {/* Tên quy tắc */}
          <Form.Item
            name="name"
            label="Tên quy tắc giá"
            rules={[
              { required: true, message: 'Vui lòng nhập tên quy tắc giá!' },
              { whitespace: true, message: 'Tên không được chỉ chứa khoảng trắng!' }
            ]}
          >
            <Input placeholder="VD: Sân Tiêu Chuẩn - Giờ vàng tối trong tuần" />
          </Form.Item>

          <Row gutter={16}>
            {/* Loại sân áp dụng */}
            <Col xs={24} sm={12}>
              <Form.Item
                name="courtType"
                label="Loại sân áp dụng"
                rules={[{ required: true, message: 'Vui lòng chọn loại sân!' }]}
              >
                <Select placeholder="Chọn loại sân">
                  <Option value="ALL">Áp dụng cho mọi loại sân (ALL)</Option>
                  <Option value="STANDARD">Sân Tiêu Chuẩn</Option>
                  <Option value="VIP">Sân VIP</Option>
                  <Option value="PREMIUM">Sân Thi Đấu</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Giá thuê mỗi giờ */}
            <Col xs={24} sm={12}>
              <Form.Item
                name="pricePerHour"
                label="Giá thuê mỗi giờ (VNĐ)"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá thuê mỗi giờ!' },
                  {
                    type: 'number',
                    min: 0,
                    message: 'Giá thuê phải lớn hơn hoặc bằng 0 đ!'
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  step={10000}
                  addonAfter="đ/h"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Ngày áp dụng trong tuần */}
          <Form.Item
            name="daysOfWeek"
            label={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>Ngày áp dụng trong tuần</span>
                <Space size="small">
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => form.setFieldValue('daysOfWeek', [1, 2, 3, 4, 5, 6, 0])}
                  >
                    Cả tuần
                  </Button>
                  <span>|</span>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => form.setFieldValue('daysOfWeek', [1, 2, 3, 4, 5])}
                  >
                    T2 - T6
                  </Button>
                  <span>|</span>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0 }}
                    onClick={() => form.setFieldValue('daysOfWeek', [6, 0])}
                  >
                    T7 & CN
                  </Button>
                </Space>
              </Space>
            }
            rules={[{ required: true, message: 'Vui lòng chọn ít nhất một ngày áp dụng!' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn các ngày trong tuần"
              options={DAYS_OF_WEEK}
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* Khung giờ áp dụng */}
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="startTime"
                label="Giờ bắt đầu"
                rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu!' }]}
              >
                <TimePicker
                  format="HH:mm"
                  minuteStep={15}
                  style={{ width: '100%' }}
                  placeholder="Chọn giờ bắt đầu"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="endTime"
                label="Giờ kết thúc"
                rules={[{ required: true, message: 'Vui lòng chọn giờ kết thúc!' }]}
              >
                <TimePicker
                  format="HH:mm"
                  minuteStep={15}
                  style={{ width: '100%' }}
                  placeholder="Chọn giờ kết thúc"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Mô tả / Ghi chú điều kiện */}
          <Form.Item name="description" label="Ghi chú / Điều kiện áp dụng">
            <Input.TextArea
              rows={3}
              placeholder="VD: Áp dụng cho các ca đấu đặt trong khung giờ vàng buổi tối..."
            />
          </Form.Item>

          {/* Footer nút hành động */}
          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy bỏ</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  background: '#009B60',
                  borderColor: '#009B60'
                }}
              >
                {modalMode === 'CREATE' ? 'Tạo Quy Tắc Giá' : 'Lưu Thay Đổi'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal Xem chi tiết quy tắc giá (View Detail) */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#009B60' }} />
            <span>Chi Tiết Quy Tắc Giá Thuê Sân</span>
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            Đóng
          </Button>,
          <Button
            key="edit"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              const rule = selectedDetailRule;
              setDetailVisible(false);
              handleOpenEditModal(rule);
            }}
            style={{ background: '#009B60', borderColor: '#009B60' }}
          >
            Chỉnh sửa quy tắc này
          </Button>
        ]}
        width={650}
      >
        {selectedDetailRule && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Tên quy tắc giá">
              <Text strong style={{ fontSize: 15 }}>{selectedDetailRule.name}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Loại sân áp dụng">
              <Tag
                color={COURT_TYPE_CONFIG[selectedDetailRule.courtType]?.color || 'default'}
                style={{ fontWeight: 600, fontSize: 13 }}
              >
                {COURT_TYPE_CONFIG[selectedDetailRule.courtType]?.label || selectedDetailRule.courtType}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Ngày áp dụng trong tuần">
              <div>{renderDaysOfWeek(selectedDetailRule.daysOfWeek)}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                Chi tiết:{' '}
                {selectedDetailRule.daysOfWeek
                  ?.slice()
                  .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                  .map((d) => (d === 0 ? 'Chủ Nhật' : `Thứ ${d + 1}`))
                  .join(', ')}
              </div>
            </Descriptions.Item>

            <Descriptions.Item label="Khung giờ áp dụng">
              <Space>
                <ClockCircleOutlined style={{ color: '#009B60' }} />
                <Text strong style={{ fontSize: 14 }}>
                  {selectedDetailRule.startTime} - {selectedDetailRule.endTime}
                </Text>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Giá thuê mỗi giờ">
              <Text strong style={{ color: '#009B60', fontSize: 16 }}>
                {Number(selectedDetailRule.pricePerHour).toLocaleString('vi-VN')} đ/giờ
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái">
              {selectedDetailRule.status === 'ACTIVE' ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Đang áp dụng
                </Tag>
              ) : (
                <Tag color="default" icon={<StopOutlined />}>
                  Đã vô hiệu hóa
                </Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Điều kiện áp dụng / Ghi chú">
              {selectedDetailRule.description ? (
                <Paragraph style={{ margin: 0 }}>{selectedDetailRule.description}</Paragraph>
              ) : (
                <Text type="secondary">Không có ghi chú điều kiện</Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày tạo">
              {selectedDetailRule.createdAt
                ? dayjs(selectedDetailRule.createdAt).format('DD/MM/YYYY HH:mm:ss')
                : 'Chưa có'}
            </Descriptions.Item>

            <Descriptions.Item label="Cập nhật lần cuối">
              {selectedDetailRule.updatedAt
                ? dayjs(selectedDetailRule.updatedAt).format('DD/MM/YYYY HH:mm:ss')
                : 'Chưa có'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
