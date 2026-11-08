import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Typography,
  message,
  Popconfirm,
  Badge,
  Row,
  Col,
  Descriptions,
  Divider,
  Empty
} from 'antd';
import {
  BellOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckOutlined,
  ReloadOutlined,
  SearchOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function NotificationManagementPage() {
  const { user, isAdmin, isStaff, isCustomer } = useAuth();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    isRead: undefined,
    type: undefined
  });

  // Modal chi tiết thông báo
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch danh sách thông báo
  const fetchNotifications = useCallback(async (page = 1, pageSize = 10, currentFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        search: currentFilters.search || undefined,
        isRead: currentFilters.isRead !== undefined ? currentFilters.isRead : undefined,
        type: currentFilters.type !== 'ALL' ? currentFilters.type : undefined
      };

      let res;
      if (isCustomer) {
        res = await notificationService.getCustomerNotifications(params);
      } else {
        res = await notificationService.getStaffNotifications(params);
      }

      if (res?.success) {
        setData(res.data.items || []);
        setPagination({
          current: res.data.pagination.page,
          pageSize: res.data.pagination.limit,
          total: res.data.pagination.total
        });
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  }, [filters, isCustomer]);

  useEffect(() => {
    fetchNotifications(1, pagination.pageSize, filters);
  }, []);

  // Xử lý thay đổi bộ lọc
  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    fetchNotifications(1, pagination.pageSize, updated);
  };

  // Xem chi tiết thông báo (UC-15.2 / UC-15.5)
  const handleViewDetail = async (record) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await notificationService.getNotificationById(record._id);
      if (res?.success) {
        setSelectedNotif(res.data);
        // Cập nhật lại trạng thái isRead trong bảng nếu trước đó chưa đọc
        setData((prev) =>
          prev.map((item) => (item._id === record._id ? { ...item, isRead: true } : item))
        );
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải chi tiết thông báo');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Vô hiệu hóa thông báo (UC-15.3 / UC-15.6)
  const handleDeactivate = async (id) => {
    try {
      const res = await notificationService.deactivateNotification(id);
      if (res?.success) {
        message.success('Đã ẩn thông báo thành công khỏi danh sách!');
        // Tải lại trang hoặc xóa item khỏi danh sách
        fetchNotifications(pagination.current, pagination.pageSize, filters);
        if (detailModalOpen && selectedNotif?._id === id) {
          setDetailModalOpen(false);
        }
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể vô hiệu hóa thông báo');
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllRead = async () => {
    try {
      const res = await notificationService.markAllAsRead();
      if (res?.success) {
        message.success('Đã đánh dấu tất cả thông báo là đã đọc!');
        fetchNotifications(pagination.current, pagination.pageSize, filters);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  // Render tag loại thông báo
  const renderTypeTag = (type) => {
    switch (type) {
      case 'BOOKING_SUCCESS':
      case 'BOOKING_CONFIRMED':
        return <Tag icon={<CheckCircleOutlined />} color="success">Đặt sân</Tag>;
      case 'BOOKING_CANCELLED':
      case 'BOOKING_REJECTED':
        return <Tag icon={<CloseCircleOutlined />} color="error">Hủy / Từ chối</Tag>;
      case 'BOOKING_UPDATED':
        return <Tag icon={<InfoCircleOutlined />} color="processing">Cập nhật đơn</Tag>;
      case 'SESSION_NEAR_END':
        return <Tag icon={<AlertOutlined />} color="warning">Cảnh báo giờ chơi</Tag>;
      default:
        return <Tag icon={<BellOutlined />} color="default">Hệ thống</Tag>;
    }
  };

  const columns = [
    {
      title: 'Trạng thái',
      dataIndex: 'isRead',
      key: 'isRead',
      width: 110,
      render: (isRead) =>
        isRead ? (
          <Tag color="default">Đã đọc</Tag>
        ) : (
          <Badge status="processing" text={<Text strong style={{ color: '#009B60' }}>Chưa đọc</Text>} />
        )
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type) => renderTypeTag(type)
    },
    {
      title: 'Tiêu đề & Nội dung',
      key: 'content',
      render: (_, record) => (
        <div style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(record)}>
          <Text strong={!record.isRead} style={{ fontSize: 14, color: record.isRead ? '#555' : '#111' }}>
            {record.title}
          </Text>
          <Paragraph
            ellipsis={{ rows: 2 }}
            type="secondary"
            style={{ marginBottom: 0, fontSize: 13, marginTop: 4 }}
          >
            {record.message}
          </Paragraph>
        </div>
      )
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 4, color: '#888' }} />
            {new Date(date).toLocaleDateString('vi-VN')}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, color: '#888' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Space>
      )
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Space direction="horizontal" size="small">
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: '#009B60' }} />}
            onClick={() => handleViewDetail(record)}
            title="Xem chi tiết"
          />
          <Popconfirm
            title="Ẩn thông báo này?"
            description="Thông báo này sẽ được ẩn khỏi danh sách của bạn."
            okText="Ẩn"
            cancelText="Hủy"
            okType="danger"
            onConfirm={() => handleDeactivate(record._id)}
          >
            <Button
              type="text"
              icon={<EyeInvisibleOutlined style={{ color: '#ff4d4f' }} />}
              title="Vô hiệu hóa / Ẩn thông báo"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header tiêu đề */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111' }}>
            <BellOutlined style={{ marginRight: 10, color: '#009B60' }} />
            {isCustomer ? 'Hộp thư thông báo khách hàng' : 'Quản lý thông báo nghiệp vụ'}
          </Title>
          <Text type="secondary">
            {isCustomer
              ? 'Theo dõi thông báo đặt sân, thanh toán và các thông tin từ sân cầu lông.'
              : 'Theo dõi đơn đặt mới, cảnh báo giờ đấu và thông báo vận hành hệ thống.'}
          </Text>
        </div>
        <Space>
          <Button
            icon={<CheckOutlined />}
            onClick={handleMarkAllRead}
            disabled={loading || data.length === 0}
          >
            Đánh dấu đọc tất cả
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchNotifications(pagination.current, pagination.pageSize, filters)}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Bộ lọc tìm kiếm */}
      <Card style={{ marginBottom: 20, borderRadius: 8 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={10} md={10}>
            <Input
              placeholder="Tìm kiếm theo tiêu đề hoặc nội dung..."
              prefix={<SearchOutlined style={{ color: '#999' }} />}
              value={filters.search}
              allowClear
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Col>
          <Col xs={12} sm={7} md={7}>
            <Select
              style={{ width: '100%' }}
              placeholder="Trạng thái đọc"
              value={filters.isRead}
              allowClear
              onChange={(val) => handleFilterChange('isRead', val)}
            >
              <Option value={undefined}>Tất cả trạng thái</Option>
              <Option value="false">Chưa đọc</Option>
              <Option value="true">Đã đọc</Option>
            </Select>
          </Col>
          <Col xs={12} sm={7} md={7}>
            <Select
              style={{ width: '100%' }}
              placeholder="Loại thông báo"
              value={filters.type || 'ALL'}
              onChange={(val) => handleFilterChange('type', val)}
            >
              <Option value="ALL">Tất cả các loại</Option>
              <Option value="BOOKING_SUCCESS">Đặt sân thành công</Option>
              <Option value="BOOKING_CONFIRMED">Đã duyệt sân</Option>
              <Option value="BOOKING_CANCELLED">Đã hủy lịch</Option>
              <Option value="BOOKING_UPDATED">Cập nhật lịch đặt</Option>
              {!isCustomer && <Option value="SESSION_NEAR_END">Cảnh báo ca đấu</Option>}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Danh sách thông báo */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Tổng cộng ${total} thông báo`,
            onChange: (page, pageSize) => fetchNotifications(page, pageSize, filters)
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có thông báo nào"
              />
            )
          }}
        />
      </Card>

      {/* Modal xem chi tiết thông báo (UC-15.2 / UC-15.5) */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellOutlined style={{ color: '#009B60' }} />
            <span>Chi tiết thông báo</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Popconfirm
            key="deact"
            title="Ẩn thông báo này?"
            description="Thông báo này sẽ không còn xuất hiện trong danh sách."
            okText="Ẩn thông báo"
            cancelText="Hủy"
            okType="danger"
            onConfirm={() => selectedNotif && handleDeactivate(selectedNotif._id)}
          >
            <Button danger icon={<EyeInvisibleOutlined />}>
              Ẩn thông báo
            </Button>
          </Popconfirm>,
          <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>
        ]}
        centered
        width={560}
      >
        {selectedNotif && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              {renderTypeTag(selectedNotif.type)}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(selectedNotif.createdAt).toLocaleDateString('vi-VN')} {new Date(selectedNotif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </div>

            <Title level={4} style={{ marginBottom: 12, color: '#111' }}>
              {selectedNotif.title}
            </Title>

            <Divider style={{ margin: '12px 0' }} />

            <Paragraph style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#333' }}>
              {selectedNotif.message}
            </Paragraph>

            <Divider style={{ margin: '12px 0' }} />

            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Trạng thái">
                <Tag color={selectedNotif.isRead ? 'default' : 'success'}>
                  {selectedNotif.isRead ? 'Đã đọc' : 'Chưa đọc'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Đối tượng">
                <Tag color="blue">{selectedNotif.recipientType}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
