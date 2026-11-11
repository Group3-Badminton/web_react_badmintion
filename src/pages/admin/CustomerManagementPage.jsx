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
  Tooltip,
  Typography,
  message
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  ClearOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { customerService } from '../../services/customerService';

const { Title, Text } = Typography;
const { Option } = Select;

const VIETNAMESE_PHONE_REGEX = /^0[35789][0-9]{8}$/;

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter state (UC-6.5)
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Modal Create / Edit state (UC-6.2 & UC-6.3)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form] = Form.useForm();



  // 1. Tải danh sách khách hàng phân trang theo Server (UC-6.1 & UC-6.5)
  const fetchCustomers = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const page = params.page !== undefined ? params.page : pagination.current;
      const limit = params.limit !== undefined ? params.limit : pagination.pageSize;
      const search = params.search !== undefined ? params.search : searchKeyword;
      const status = params.status !== undefined ? params.status : statusFilter;

      const queryParams = {
        page,
        limit
      };
      if (status && status !== 'ALL') {
        queryParams.status = status;
      }
      if (search && search.trim()) {
        queryParams.search = search.trim();
      }

      const result = await customerService.getCustomers(queryParams);
      if (result.success) {
        if (result.data && result.data.items) {
          setCustomers(result.data.items);
          setPagination((prev) => ({
            ...prev,
            current: result.data.pagination.page,
            pageSize: result.data.pagination.limit,
            total: result.data.pagination.total
          }));
        } else if (Array.isArray(result.data)) {
          setCustomers(result.data);
          setPagination((prev) => ({
            ...prev,
            total: result.data.length
          }));
        }
      }
    } catch (error) {
      message.error(error?.response?.data?.message || 'Không thể tải danh sách khách hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, searchKeyword, statusFilter]);

  useEffect(() => {
    fetchCustomers({ page: 1, search: searchKeyword, status: statusFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (modalVisible && modalMode === 'edit' && editingCustomer) {
      form.setFieldsValue({
        fullName: editingCustomer.fullName,
        phone: editingCustomer.phone,
        email: editingCustomer.email || ''
      });
    }
  }, [modalVisible, modalMode, editingCustomer, form]);

  // Bắt sự kiện đổi trang hoặc đổi pageSize của Table
  const handleTableChange = (newPagination) => {
    fetchCustomers({
      page: newPagination.current,
      limit: newPagination.pageSize,
      search: searchKeyword,
      status: statusFilter
    });
  };

  // Tìm kiếm / Lọc (UC-6.5) -> quay về trang 1
  const handleSearch = () => {
    fetchCustomers({ page: 1, search: searchKeyword, status: statusFilter });
  };

  // Xóa bộ lọc (UC-6.5 Alternative Flow A1) -> quay về trang 1
  const handleClearFilter = () => {
    setSearchKeyword('');
    setStatusFilter('ALL');
    fetchCustomers({ page: 1, search: '', status: 'ALL' });
  };
  // Đóng modal và reset state/form dùng chung cho Hủy và onCancel
  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingCustomer(null);
    form.resetFields();
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


  const columns = [
    {
      title: 'Khách hàng',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || <Text type="secondary">Chưa cập nhật</Text>
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '—'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      width: 110,
      render: (_, customer) => (
        <Space size="middle">
          {/* Sửa thông tin (UC-6.3) */}
          <Tooltip title="Chỉnh sửa thông tin">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1677ff', fontSize: 16 }} />}
              onClick={() => handleOpenEdit(customer)}
            />
          </Tooltip>

          {/* Vô hiệu hóa / Khóa (UC-6.4) */}
          {customer.status === 'ACTIVE' && (
            <Tooltip title="Vô hiệu hóa tài khoản">
              <Button
                type="text"
                danger
                icon={<LockOutlined style={{ fontSize: 16 }} />}
                onClick={() => handleDeactivate(customer)}
              />
            </Tooltip>
          )}

          {/* Kích hoạt / Mở khóa */}
          {customer.status !== 'ACTIVE' && (
            <Tooltip title="Kích hoạt lại tài khoản">
              <Button
                type="text"
                icon={<UnlockOutlined style={{ color: '#009B60', fontSize: 16 }} />}
                onClick={() => handleActivate(customer)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ width: '100%', paddingBottom: 24 }}>
      <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 8 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header & Nút thêm mới (UC-6.2) */}
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} sm={16}>
              <Title level={3} style={{ margin: 0 }}>Quản lý khách hàng</Title>
              <Text type="secondary">Quản lý hồ sơ khách hàng tại quầy và tài khoản hội viên.</Text>
            </Col>
            <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                style={{ background: '#009B60', borderColor: '#009B60' }}
              >
                Tạo khách hàng
              </Button>
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
          {/* Bảng danh sách khách hàng (UC-6.1 - Server-side Pagination) */}
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={customers}
            loading={loading}
            onChange={handleTableChange}
            pagination={{
              position: ['bottomCenter'],
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
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
        onCancel={handleCloseModal}
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


          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCloseModal}>
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


    </div>
  );
}
