import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Button,
  Card,
  Tag,
  Space,
  Modal,
  Drawer,
  Form,
  Input,
  Select,
  Descriptions,
  Alert,
  Spin,
  message,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
  UnlockOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { customerService } from '../../services/customerService';

const { Title, Text } = Typography;

const VIETNAMESE_PHONE_REGEX = /(0[3|5|7|8|9])+([0-9]{8})\b/;

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);

  // Search & Filter state (UC-6.5)
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState({ search: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Drawer state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerDetail, setCustomerDetail] = useState(null);

  // Form Modal state (Create / Edit) (UC-6.2 & UC-6.3)
  const [formVisible, setFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditCustomer, setCurrentEditCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Load danh sách khách hàng
  const fetchCustomers = async (filters = activeFilter) => {
    setLoading(true);
    setListError(null);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status && filters.status !== 'ALL') params.status = filters.status;

      const res = await customerService.getCustomers(params);
      if (res.success && Array.isArray(res.data)) {
        setCustomers(res.data);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Không thể tải danh sách khách hàng.';
      setListError(errMsg);
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(activeFilter);
  }, [activeFilter]);

  // Xử lý Tìm kiếm & Lọc (UC-6.5)
  const handleSearchSubmit = () => {
    setCurrentPage(1);
    setActiveFilter({ search: searchInput.trim(), status: statusFilter });
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setCurrentPage(1);
    setActiveFilter({ search: '', status: '' });
  };

  // Mở modal tạo mới (UC-6.2)
  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentEditCustomer(null);
    form.resetFields();
    setFormVisible(true);
  };

  // Mở modal chỉnh sửa (UC-6.3)
  const handleOpenEdit = (record) => {
    setIsEditing(true);
    setCurrentEditCustomer(record);
    form.resetFields();
    form.setFieldsValue({
      fullName: record.fullName,
      phone: record.phone,
      email: record.email || '',
      address: record.address || ''
    });
    setFormVisible(true);
  };

  // Xử lý Lưu Form (Tạo mới hoặc Cập nhật)
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (isEditing && currentEditCustomer) {
        // UC-6.3 Cập nhật
        const res = await customerService.updateCustomer(currentEditCustomer._id, values);
        if (res.success) {
          message.success('Cập nhật thông tin khách hàng thành công!');
          setFormVisible(false);
          fetchCustomers();
        }
      } else {
        // UC-6.2 Tạo mới
        const res = await customerService.createCustomer(values);
        if (res.success) {
          message.success('Tạo hồ sơ khách hàng thành công!');
          setFormVisible(false);
          fetchCustomers();
        }
      }
    } catch (err) {
      if (err.errorFields) return; // Lỗi validation Antd
      const errMsg = err.response?.data?.message || err.message || 'Thao tác không thành công.';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Xem chi tiết khách hàng
  const handleOpenDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await customerService.getCustomerDetail(record._id);
      if (res.success && res.data) {
        setCustomerDetail(res.data);
      } else {
        setCustomerDetail(record);
      }
    } catch {
      setCustomerDetail(record);
    } finally {
      setDetailLoading(false);
    }
  };

  // Vô hiệu hóa khách hàng (UC-6.4 - Soft delete)
  const handleDeactivate = (record) => {
    Modal.confirm({
      title: 'Xác nhận vô hiệu hóa khách hàng',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>Bạn có chắc chắn muốn vô hiệu hóa khách hàng <strong>{record.fullName}</strong> ({record.phone})?</p>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Quy tắc BR-06 & BR-40: Tài khoản bị vô hiệu hóa sẽ không thể đăng nhập hoặc đặt lịch, toàn bộ dữ liệu lịch sử đặt sân và giao dịch vẫn được bảo toàn nguyên vẹn.
          </Text>
        </div>
      ),
      okText: 'Vô hiệu hóa',
      okType: 'danger',
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        try {
          const res = await customerService.deactivateCustomer(record._id);
          if (res.success) {
            message.success('Đã vô hiệu hóa khách hàng thành công!');
            fetchCustomers();
          }
        } catch (err) {
          message.error(err.response?.data?.message || 'Không thể vô hiệu hóa khách hàng.');
        }
      }
    });
  };

  // Kích hoạt lại khách hàng
  const handleActivate = (record) => {
    Modal.confirm({
      title: 'Mở khóa / Kích hoạt lại khách hàng',
      icon: <UnlockOutlined style={{ color: '#009B60' }} />,
      content: `Kích hoạt lại tài khoản cho khách hàng ${record.fullName} (${record.phone})?`,
      okText: 'Kích hoạt',
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        try {
          const res = await customerService.activateCustomer(record._id);
          if (res.success) {
            message.success('Đã kích hoạt lại khách hàng thành công!');
            fetchCustomers();
          }
        } catch (err) {
          message.error(err.response?.data?.message || 'Không thể kích hoạt khách hàng.');
        }
      }
    });
  };

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.fullName}</div>
          <div style={{ marginTop: 2 }}>
            {record.isOnlineAccount ? (
              <Tag color="blue" style={{ fontSize: 11, borderRadius: 10 }}>Tài khoản Online</Tag>
            ) : (
              <Tag color="cyan" style={{ fontSize: 11, borderRadius: 10 }}>Khách tại quầy</Tag>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => (
        <Space>
          <PhoneOutlined style={{ color: '#009B60' }} />
          <Text strong>{phone}</Text>
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email ? (
        <Space>
          <MailOutlined style={{ color: '#888' }} />
          <span>{email}</span>
        </Space>
      ) : (
        <Text type="secondary">Chưa cập nhật</Text>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => (
        status === 'ACTIVE' ? (
          <Tag color="green" style={{ borderRadius: 12, padding: '2px 10px' }}>Đang hoạt động</Tag>
        ) : (
          <Tag color="red" style={{ borderRadius: 12, padding: '2px 10px' }}>Đã vô hiệu hóa</Tag>
        )
      )
    },
    {
      title: 'Ngày tạo hồ sơ',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '--'
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(record)}
          >
            Xem
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Sửa
          </Button>
          {record.status === 'ACTIVE' ? (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleDeactivate(record)}
            >
              Khóa
            </Button>
          ) : (
            <Button
              size="small"
              icon={<UnlockOutlined />}
              style={{ color: '#009B60', borderColor: '#009B60' }}
              onClick={() => handleActivate(record)}
            >
              Mở khóa
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Tiêu đề trang */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={3} style={{ margin: '0 0 4px', color: '#0f172a' }}>
            Quản Lý Khách Hàng (Customer Management)
          </Title>
          <Text type="secondary">
            Tiếp nhận, tạo hồ sơ khách tại quầy và quản lý thông tin khách hàng (UC-06)
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreate}
          style={{
            background: '#009B60',
            borderColor: '#009B60',
            height: 42,
            fontWeight: 700,
            borderRadius: 8
          }}
        >
          Thêm Khách Hàng Mới
        </Button>
      </div>

      {listError && (
        <Alert
          type="error"
          message={listError}
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Thanh tìm kiếm & lọc (UC-6.5) */}
      <Card style={{ marginBottom: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Space wrap size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap size="middle">
            <Input
              placeholder="Tìm theo Tên hoặc Số điện thoại..."
              prefix={<SearchOutlined style={{ color: '#aaa' }} />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={handleSearchSubmit}
              style={{ width: 280, borderRadius: 6 }}
              allowClear
            />
            <Select
              value={statusFilter || 'ALL'}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: 170 }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'INACTIVE', label: 'Đã vô hiệu hóa' }
              ]}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearchSubmit}
              style={{ background: '#009B60', borderColor: '#009B60', borderRadius: 6 }}
            >
              Tìm kiếm
            </Button>
            <Button
              icon={<ClearOutlined />}
              onClick={handleResetFilters}
              style={{ borderRadius: 6 }}
            >
              Đặt lại
            </Button>
          </Space>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchCustomers(activeFilter)}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </Card>

      {/* Bảng danh sách khách hàng (UC-6.1) */}
      <Card style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: currentPage,
            onChange: (page) => setCurrentPage(page),
            pageSize: 10,
            showTotal: (total) => `Tổng cộng ${total} khách hàng`,
            showSizeChanger: false
          }}
          locale={{ emptyText: 'Chưa có thông tin khách hàng nào phù hợp.' }}
        />
      </Card>

      {/* Modal Tạo mới / Cập nhật khách hàng (UC-6.2 & UC-6.3) */}
      <Modal
        title={isEditing ? 'Cập nhật thông tin khách hàng' : 'Thêm hồ sơ khách hàng mới (Tại quầy / Đặt qua SĐT)'}
        open={formVisible}
        onCancel={() => setFormVisible(false)}
        onOk={handleFormSubmit}
        confirmLoading={submitting}
        okText={isEditing ? 'Lưu thay đổi' : 'Tạo khách hàng'}
        cancelText="Hủy"
        centered
        width={540}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="fullName"
            label={<strong>Họ và tên khách hàng</strong>}
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên khách hàng!' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#aaa' }} />} placeholder="VD: Nguyễn Văn Nam" />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<strong>Số điện thoại liên hệ (Định danh BR-04)</strong>}
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại!' },
              { pattern: VIETNAMESE_PHONE_REGEX, message: 'Số điện thoại phải gồm 10 chữ số hợp lệ (03, 05, 07, 08, 09)!' }
            ]}
            extra="Số điện thoại dùng để liên hệ nhận sân và là mã định danh duy nhất."
          >
            <Input prefix={<PhoneOutlined style={{ color: '#aaa' }} />} placeholder="VD: 0912345678" />
          </Form.Item>

          <Form.Item
            name="email"
            label={<strong>Địa chỉ Email (Tùy chọn)</strong>}
            rules={[{ type: 'email', message: 'Định dạng email không hợp lệ!' }]}
          >
            <Input prefix={<MailOutlined style={{ color: '#aaa' }} />} placeholder="VD: khachhang@gmail.com" />
          </Form.Item>

          <Form.Item
            name="address"
            label={<strong>Địa chỉ liên hệ (Tùy chọn)</strong>}
          >
            <Input prefix={<HomeOutlined style={{ color: '#aaa' }} />} placeholder="VD: Ninh Kiều, Cần Thơ" />
          </Form.Item>

          {!isEditing && (
            <Alert
              type="info"
              showIcon
              message="Khách hàng tạo tại quầy sẽ không cần mật khẩu đăng nhập (POST-3). Nếu khách muốn đặt online sau này, có thể dùng số điện thoại/email này để Đăng ký tài khoản."
              style={{ marginTop: 8 }}
            />
          )}
        </Form>
      </Modal>

      {/* Drawer xem chi tiết khách hàng */}
      <Drawer
        title="Chi tiết hồ sơ khách hàng"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={480}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : customerDetail ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#e6f7ef',
                  color: '#009B60',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  margin: '0 auto 12px'
                }}
              >
                <UserOutlined />
              </div>
              <Title level={4} style={{ margin: 0 }}>{customerDetail.fullName}</Title>
              <div style={{ marginTop: 6 }}>
                {customerDetail.status === 'ACTIVE' ? (
                  <Tag color="green">Đang hoạt động</Tag>
                ) : (
                  <Tag color="red">Đã vô hiệu hóa</Tag>
                )}
                {customerDetail.isOnlineAccount ? (
                  <Tag color="blue">Tài khoản Online</Tag>
                ) : (
                  <Tag color="cyan">Khách tại quầy</Tag>
                )}
              </div>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Số điện thoại">{customerDetail.phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{customerDetail.email || 'Chưa cập nhật'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">{customerDetail.address || 'Chưa cập nhật'}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{customerDetail.role}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo hồ sơ">
                {dayjs(customerDetail.createdAt).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="Lần cập nhật cuối">
                {dayjs(customerDetail.updatedAt).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
