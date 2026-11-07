import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
  HistoryOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { customerService } from '../../services/customerService';

const { Title, Text } = Typography;
const { Option } = Select;

const VIETNAMESE_PHONE_REGEX = /(0[3|5|7|8|9])+([0-9]{8})\b/;

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter state (UC-6.5)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Create / Edit state (UC-6.2 & UC-6.3)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();

  // History Modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState(null);

  // 1. Tải danh sách khách hàng (UC-6.1 & UC-6.5)
  const fetchCustomers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const queryParams = { ...params };
      if (queryParams.status === 'ALL') {
        delete queryParams.status;
      }
      const result = await customerService.getCustomers(queryParams);
      if (result.success) {
        setCustomers(result.data || []);
      }
    } catch (error) {
      message.error(error?.response?.data?.message || 'Không thể tải danh sách khách hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers({ search: searchKeyword, status: statusFilter });
  }, [fetchCustomers]);

  // Tìm kiếm / Lọc (UC-6.5)
  const handleSearch = () => {
    fetchCustomers({ search: searchKeyword, status: statusFilter });
  };

  // Xóa bộ lọc (UC-6.5 Alternative Flow A1)
  const handleClearFilter = () => {
    setSearchKeyword('');
    setStatusFilter('ALL');
    fetchCustomers({ search: '', status: 'ALL' });
  };

  // Mở modal Thêm mới khách hàng (UC-6.2)
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingCustomer(null);
    form.resetFields();
    setModalVisible(true);
  };

  // Mở modal Cập nhật khách hàng (UC-6.3)
  const handleOpenEdit = (customer) => {
    setModalMode('edit');
    setEditingCustomer(customer);
    form.setFieldsValue({
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      address: customer.address
    });
    setModalVisible(true);
  };

  // Lưu thông tin khách hàng (Create hoặc Update)
  const handleSubmitForm = async (values) => {
    try {
      setSubmitting(true);
      if (modalMode === 'create') {
        // UC-6.2 Create Customer
        const result = await customerService.createCustomer(values);
        if (result.success) {
          message.success('Khách hàng đã được tạo thành công.');
          setModalVisible(false);
          form.resetFields();
          fetchCustomers({ search: searchKeyword, status: statusFilter });
        }
      } else {
        // UC-6.3 Update Customer
        const result = await customerService.updateCustomer(editingCustomer._id, values);
        if (result.success) {
          message.success('Thông tin khách hàng đã được cập nhật thành công.');
          setModalVisible(false);
          setEditingCustomer(null);
          form.resetFields();
          fetchCustomers({ search: searchKeyword, status: statusFilter });
        }
      }
    } catch (error) {
      message.error(error?.response?.data?.message || (modalMode === 'create' ? 'Không thể tạo khách hàng vào lúc này. Vui lòng thử lại sau.' : 'Không thể cập nhật thông tin khách hàng. Vui lòng thử lại sau.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Vô hiệu hóa khách hàng (UC-6.4)
  const handleDeactivate = (customer) => {
    Modal.confirm({
      title: 'Vô hiệu hóa khách hàng',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'Bạn có chắc chắn muốn vô hiệu hóa khách hàng này không? Dữ liệu lịch sử liên quan sẽ được bảo lưu.',
      okText: 'Xác nhận',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const result = await customerService.deactivateCustomer(customer._id);
          if (result.success) {
            message.success('Khách hàng đã được vô hiệu hóa thành công.');
            fetchCustomers({ search: searchKeyword, status: statusFilter });
          }
        } catch (error) {
          message.error(error?.response?.data?.message || 'Không thể vô hiệu hóa khách hàng vào lúc này. Vui lòng thử lại sau.');
        }
      }
    });
  };

  // Kích hoạt lại khách hàng (Activate)
  const handleActivate = async (customer) => {
    try {
      const result = await customerService.activateCustomer(customer._id);
      if (result.success) {
        message.success('Mở khóa / Kích hoạt lại tài khoản khách hàng thành công.');
        fetchCustomers({ search: searchKeyword, status: statusFilter });
      }
    } catch (error) {
      message.error(error?.response?.data?.message || 'Không thể kích hoạt khách hàng vào lúc này. Vui lòng thử lại sau.');
    }
  };

  // Xem lịch sử hủy / khóa
  const showHistory = (customer) => {
    setHistoryCustomer(customer);
    setHistoryModalVisible(true);
  };

  const columns = [
    {
      title: 'Khách hàng',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name, customer) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary">{customer.email || 'Chưa cập nhật email'}</Text>
        </Space>
      )
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => <Text copyable={{ text: phone }}>{phone || '—'}</Text>
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      render: (address) => address || <Text type="secondary">Chưa có</Text>
    },
    {
      title: 'Loại tài khoản',
      dataIndex: 'isOnlineAccount',
      key: 'isOnlineAccount',
      render: (isOnline) => (
        <Tag color={isOnline ? 'blue' : 'orange'}>
          {isOnline ? 'Tài khoản Web' : 'Khách tại quầy'}
        </Tag>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : status === 'LOCKED' ? 'volcano' : 'red'}>
          {status === 'ACTIVE' ? 'Đang hoạt động' : status === 'LOCKED' ? 'Tạm khóa (Hủy đơn)' : 'Đã vô hiệu hóa'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, customer) => (
        <Space size="small">
          {/* Sửa thông tin (UC-6.3) */}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(customer)}
          >
            Sửa
          </Button>

          {/* Vô hiệu hóa (UC-6.4) */}
          {customer.status === 'ACTIVE' && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleDeactivate(customer)}
            >
              Vô hiệu hóa
            </Button>
          )}

          {/* Kích hoạt lại (Activate) */}
          {customer.status !== 'ACTIVE' && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CheckCircleOutlined />}
              onClick={() => handleActivate(customer)}
            >
              Kích hoạt
            </Button>
          )}

          {/* Xem lịch sử */}
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => showHistory(customer)}
          >
            Lịch sử
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 24 }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header & Nút thêm mới (UC-6.2) */}
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} sm={16}>
              <Title level={3} style={{ margin: 0 }}>Quản lý khách hàng</Title>
              <Text type="secondary">Quản lý hồ sơ khách hàng tại quầy và tài khoản hội viên.</Text>
            </Col>
            <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreate}
                  style={{ background: '#009B60', borderColor: '#009B60' }}
                >
                  Tạo khách hàng
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => fetchCustomers({ search: searchKeyword, status: statusFilter })}
                  loading={loading}
                >
                  Tải lại
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Bộ lọc & Tìm kiếm (UC-6.5) */}
          <Card size="small" style={{ backgroundColor: '#fafafa', borderRadius: 8 }}>
            <Row gutter={[16, 12]} align="middle">
              <Col xs={24} md={10}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Tìm kiếm theo họ tên hoặc số điện thoại..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onPressEnter={handleSearch}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Select
                  style={{ width: '100%' }}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  placeholder="Chọn trạng thái"
                >
                  <Option value="ALL">Tất cả trạng thái</Option>
                  <Option value="ACTIVE">Đang hoạt động</Option>
                  <Option value="INACTIVE">Đã vô hiệu hóa</Option>
                  <Option value="LOCKED">Tạm khóa (Hủy đơn)</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    Tìm kiếm
                  </Button>
                  <Button icon={<ClearOutlined />} onClick={handleClearFilter}>
                    Xóa lọc
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Bảng danh sách khách hàng (UC-6.1) */}
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={customers}
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng cộng ${total} khách hàng`
            }}
            locale={{ emptyText: 'Không tìm thấy khách hàng nào phù hợp với tiêu chí tìm kiếm.' }}
          />
        </Space>
      </Card>

      {/* Modal Thêm mới / Cập nhật khách hàng (UC-6.2 & UC-6.3) */}
      <Modal
        title={modalMode === 'create' ? 'Tạo mới hồ sơ khách hàng' : 'Cập nhật thông tin khách hàng'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitForm}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Họ và tên cùng Số điện thoại là bắt buộc.' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="VD: Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Họ và tên cùng Số điện thoại là bắt buộc.' },
              { pattern: VIETNAMESE_PHONE_REGEX, message: 'Số điện thoại không đúng định dạng. Vui lòng nhập lại.' }
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="VD: 0912345678" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Địa chỉ Email"
            rules={[
              { type: 'email', message: 'Địa chỉ email không đúng định dạng. Vui lòng nhập lại.' }
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="VD: customer@gmail.com (không bắt buộc)" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
          >
            <Input prefix={<HomeOutlined />} placeholder="VD: Cần Thơ (không bắt buộc)" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ background: '#009B60', borderColor: '#009B60' }}
              >
                {modalMode === 'create' ? 'Tạo khách hàng' : 'Lưu thay đổi'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Xem lịch sử hủy và khóa tài khoản */}
      <Modal
        title={`Lịch sử tài khoản — ${historyCustomer?.fullName || ''}`}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={650}
        centered
      >
        {historyCustomer && (
          <div>
            <Title level={5} style={{ marginTop: 8 }}>Lịch sử hủy đơn đặt sân</Title>
            {(!historyCustomer.bookingCancellationHistory || historyCustomer.bookingCancellationHistory.length === 0) ? (
              <Text type="secondary">Chưa có lịch sử hủy đơn.</Text>
            ) : (
              historyCustomer.bookingCancellationHistory.map((item, index) => (
                <div key={index} style={{ marginBottom: 6, padding: '4px 8px', background: '#f5f5f5', borderRadius: 4 }}>
                  #{item.bookingCode || item.bookingId} — {dayjs(item.cancelledAt).format('DD/MM/YYYY HH:mm')}
                  {' — '}{item.previousStatus === 'CONFIRMED' ? 'Đã xác nhận' : 'Chờ duyệt'}
                  {' — '}{item.scope === 'ITEM' ? 'Hủy một lịch sân' : 'Hủy toàn đơn'}
                </div>
              ))
            )}

            <Title level={5} style={{ marginTop: 20 }}>Lịch sử khóa / mở khóa tài khoản</Title>
            {(!historyCustomer.accountLockHistory || historyCustomer.accountLockHistory.length === 0) ? (
              <Text type="secondary">Chưa có lịch sử khóa tài khoản.</Text>
            ) : (
              historyCustomer.accountLockHistory.map((item, index) => (
                <div key={index} style={{ marginBottom: 6, padding: '4px 8px', background: '#f5f5f5', borderRadius: 4 }}>
                  {item.action === 'LOCKED' ? <Tag color="red">Đã khóa</Tag> : <Tag color="green">Đã mở khóa</Tag>}
                  {dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm')}
                  {item.reason ? ` — ${item.reason}` : ''}
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
