import { useState, useEffect, useRef } from 'react';
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
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
  UnlockOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { staffService } from '../../services/staffService';
import { USER_STATUS } from '../../utils/constants';

const { Title, Text } = Typography;

const VIETNAMESE_PHONE_REGEX = /^0[35789][0-9]{8}$/;

export default function StaffManagementPage() {
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search & Filter state (UC-8.6)
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState({ search: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const latestRequestId = useRef(0);

  // Detail Drawer state (UC-8.2)
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [staffDetail, setStaffDetail] = useState(null);

  // Form Modal state (Create / Edit) (UC-8.3 & UC-8.4)
  const [formVisible, setFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditStaff, setCurrentEditStaff] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formFetchError, setFormFetchError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Deactivate Modal state (UC-8.5)
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // Activate / Unlock Modal state
  const [activateModalVisible, setActivateModalVisible] = useState(false);
  const [activateTarget, setActivateTarget] = useState(null);
  const [activating, setActivating] = useState(false);

  // Check if search/filter is currently applied
  const isFilterActive = Boolean(
    activeFilter.search || (activeFilter.status && activeFilter.status !== 'ALL')
  );

  // 1. Fetch Staff List / Search & Filter (UC-8.1 & UC-8.6)
  const fetchStaffs = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;
    const currentReqId = ++latestRequestId.current;

    async function loadData() {
      setLoading(true);
      setListError(null);

      const isSearching = Boolean(
        activeFilter.search || (activeFilter.status && activeFilter.status !== 'ALL')
      );

      try {
        const params = {};
        if (activeFilter.search) {
          params.search = activeFilter.search;
        }
        if (activeFilter.status && activeFilter.status !== 'ALL') {
          params.status = activeFilter.status;
        }

        const res = await staffService.getStaffs(params);
        if (isMounted && currentReqId === latestRequestId.current) {
          if (res.success && Array.isArray(res.data)) {
            setStaffs(res.data);
          } else {
            setListError(
              isSearching
                ? 'Unable to search staff. Please try again.'
                : 'Unable to load the staff list. Please try again.'
            );
            setStaffs([]);
          }
        }
      } catch {
        if (isMounted && currentReqId === latestRequestId.current) {
          setListError(
            isSearching
              ? 'Unable to search staff. Please try again.'
              : 'Unable to load the staff list. Please try again.'
          );
          setStaffs([]);
        }
      } finally {
        if (isMounted && currentReqId === latestRequestId.current) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey, activeFilter]);

  // Handle Search & Filter submit (UC-8.6)
  const handleSearch = () => {
    setCurrentPage(1);
    setActiveFilter({
      search: searchInput.trim(),
      status: statusFilter
    });
  };

  // Handle Clear Filter (UC-8.6 Alternative Flow A2)
  const handleClearFilter = () => {
    setSearchInput('');
    setStatusFilter('');
    setCurrentPage(1);
    setActiveFilter({
      search: '',
      status: ''
    });
  };

  // 2. Open Detail Drawer (UC-8.2)
  const handleOpenDetail = async (record) => {
    // Clear old detail immediately to prevent stale data display
    setStaffDetail(null);
    setDetailError(null);
    setDetailVisible(true);
    setDetailLoading(true);

    try {
      const res = await staffService.getStaffDetail(record._id);
      if (res.success && res.data) {
        setStaffDetail(res.data);
      } else {
        setDetailError('Unable to view the selected staff record.');
      }
    } catch {
      setDetailError('Unable to view the selected staff record.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setStaffDetail(null);
    setDetailError(null);
  };

  // 3. Open Create Modal (UC-8.3)
  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentEditStaff(null);
    setFormFetchError(null);
    form.resetFields();
    setFormVisible(true);
  };

  // 4. Open Edit Modal (UC-8.4)
  const handleOpenEdit = async (record) => {
    setIsEditing(true);
    setCurrentEditStaff(record);
    setFormFetchError(null);
    form.resetFields();
    setFormVisible(true);
    setFormLoading(true);

    try {
      // Must fetch fresh record from backend
      const res = await staffService.getStaffDetail(record._id);
      if (res.success && res.data) {
        setCurrentEditStaff(res.data);
        form.setFieldsValue({
          fullName: res.data.fullName,
          email: res.data.email,
          phone: res.data.phone
        });
      } else {
        setFormFetchError('Unable to load the selected staff record.');
      }
    } catch {
      setFormFetchError('Unable to load the selected staff record.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setIsEditing(false);
    setCurrentEditStaff(null);
    setFormFetchError(null);
    form.resetFields();
  };

  // 5. Submit Create / Edit Form (UC-8.3 & UC-8.4)
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (isEditing) {
        // UC-8.4 Update Staff
        try {
          const res = await staffService.updateStaff(currentEditStaff._id, {
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim()
          });

          if (res.success) {
            message.success('Cập nhật thông tin nhân viên thành công!');
            handleCloseForm();
            // Cập nhật lại danh sách theo tiêu chí hiện tại
            fetchStaffs();
            if (detailVisible && staffDetail?._id === currentEditStaff._id) {
              setStaffDetail(res.data);
            }
          } else {
            message.error('Unable to update staff information. Please try again.');
          }
        } catch (err) {
          const resData = err.response?.data;
          if (resData?.errors && typeof resData.errors === 'object') {
            const fieldErrors = Object.entries(resData.errors).map(([name, errMsg]) => ({
              name,
              errors: [errMsg]
            }));
            form.setFields(fieldErrors);
          } else {
            message.error('Unable to update staff information. Please try again.');
          }
        }
      } else {
        // UC-8.3 Create Staff
        try {
          const res = await staffService.createStaff({
            fullName: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            password: values.password
          });

          if (res.success) {
            message.success('Tạo tài khoản nhân viên thành công!');
            handleCloseForm();
            fetchStaffs();
          } else {
            message.error('Unable to create the staff account. Please try again.');
          }
        } catch (err) {
          const resData = err.response?.data;
          if (resData?.errors && typeof resData.errors === 'object') {
            const fieldErrors = Object.entries(resData.errors).map(([name, errMsg]) => ({
              name,
              errors: [errMsg]
            }));
            form.setFields(fieldErrors);
          } else {
            message.error('Unable to create the staff account. Please try again.');
          }
        }
      }
    } catch {
      // Form validation errors on client side handled by Antd Form
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Open Deactivate Modal (UC-8.5)
  const handleOpenDeactivate = (record) => {
    if (record.status === USER_STATUS.INACTIVE) {
      message.info('Tài khoản nhân viên đã ở trạng thái vô hiệu hóa.');
      return;
    }
    setDeactivateTarget(record);
    setDeactivateModalVisible(true);
  };

  const handleCloseDeactivate = () => {
    setDeactivateModalVisible(false);
    setDeactivateTarget(null);
  };

  // 7. Confirm Deactivation (UC-8.5)
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    setDeactivating(true);
    try {
      const res = await staffService.deactivateStaff(deactivateTarget._id);
      if (res.success) {
        message.success('Vô hiệu hóa tài khoản nhân viên thành công!');
        handleCloseDeactivate();
        fetchStaffs();
        if (detailVisible && staffDetail?._id === deactivateTarget._id) {
          setStaffDetail(res.data);
        }
      } else {
        message.error('Unable to deactivate the staff account. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        message.error('The selected staff account is unavailable.');
      } else {
        message.error('Unable to deactivate the staff account. Please try again.');
      }
    } finally {
      setDeactivating(false);
    }
  };

  // 8. Open Activate / Unlock Modal
  const handleOpenActivate = (record) => {
    if (record.status === USER_STATUS.ACTIVE) {
      message.info('Tài khoản nhân viên đã ở trạng thái hoạt động.');
      return;
    }
    setActivateTarget(record);
    setActivateModalVisible(true);
  };

  const handleCloseActivate = () => {
    setActivateModalVisible(false);
    setActivateTarget(null);
  };

  // 9. Confirm Activation / Unlock
  const handleConfirmActivate = async () => {
    if (!activateTarget) return;

    setActivating(true);
    try {
      const res = await staffService.activateStaff(activateTarget._id);
      if (res.success) {
        message.success('Mở khóa tài khoản nhân viên thành công!');
        handleCloseActivate();
        fetchStaffs();
        if (detailVisible && staffDetail?._id === activateTarget._id) {
          setStaffDetail(res.data);
        }
      } else {
        message.error('Unable to activate the staff account. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        message.error('The selected staff account is unavailable.');
      } else {
        message.error('Unable to activate the staff account. Please try again.');
      }
    } finally {
      setActivating(false);
    }
  };

  // Render Status Tag
  const renderStatusTag = (status) => {
    switch (status) {
      case USER_STATUS.ACTIVE:
        return <Tag color="success">Đang hoạt động</Tag>;
      case USER_STATUS.INACTIVE:
        return <Tag color="default">Đã vô hiệu hóa</Tag>;
      case USER_STATUS.LOCKED:
        return <Tag color="error">Đã khóa</Tag>;
      case USER_STATUS.PENDING_VERIFICATION:
        return <Tag color="warning">Chờ xác thực</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 65,
      align: 'center',
      render: (_, __, index) => (currentPage - 1) * 10 + index + 1
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text) => (
        <Space>
          <UserOutlined style={{ color: '#009B60' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => renderStatusTag(status)
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 250,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(record)}
          >
            Chi tiết
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Sửa
          </Button>
          {record.status === USER_STATUS.INACTIVE ? (
            <Button
              type="link"
              size="small"
              style={{ color: '#009B60' }}
              icon={<UnlockOutlined />}
              onClick={() => handleOpenActivate(record)}
            >
              Mở khóa
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleOpenDeactivate(record)}
            >
              Vô hiệu hóa
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      <Card
        bordered={false}
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          borderRadius: 8
        }}
      >
        {/* Header section */}
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
            <Title level={3} style={{ margin: 0, color: '#1a1a1a' }}>
              Quản lý nhân viên
            </Title>
            <Text type="secondary">
              Danh sách và quản trị tài khoản nhân viên hệ thống
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{
              backgroundColor: '#009B60',
              borderColor: '#009B60',
              borderRadius: 6
            }}
            onClick={handleOpenCreate}
          >
            Tạo nhân viên
          </Button>
        </div>

        {/* Search & Filter Bar (UC-8.6) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
            backgroundColor: '#f9fbf9',
            padding: '14px 16px',
            borderRadius: 8,
            border: '1px solid #edf5ed'
          }}
        >
          <Input
            placeholder="Tìm theo tên hoặc số điện thoại"
            prefix={<SearchOutlined style={{ color: '#009B60' }} />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={handleSearch}
            maxLength={100}
            allowClear
            style={{ width: 280 }}
          />
          <Select
            placeholder="Trạng thái"
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            style={{ width: 180 }}
            allowClear
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: USER_STATUS.ACTIVE, label: 'Đang hoạt động' },
              { value: USER_STATUS.INACTIVE, label: 'Đã vô hiệu hóa' },
              { value: USER_STATUS.LOCKED, label: 'Đã khóa' },
              { value: USER_STATUS.PENDING_VERIFICATION, label: 'Chờ xác thực' }
            ]}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
            style={{
              backgroundColor: '#009B60',
              borderColor: '#009B60'
            }}
          >
            Tìm kiếm
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearFilter}
            disabled={!searchInput && !statusFilter && !isFilterActive}
          >
            Xóa bộ lọc
          </Button>
        </div>

        {/* Error banner on list retrieval failure (UC-8.1 & UC-8.6 E1) */}
        {listError ? (
          <div style={{ margin: '20px 0' }}>
            <Alert
              message={listError}
              type="error"
              showIcon
              action={
                <Button
                  size="small"
                  type="primary"
                  danger
                  icon={<ReloadOutlined />}
                  onClick={fetchStaffs}
                >
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={staffs}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: currentPage,
              pageSize: 10,
              onChange: (page) => setCurrentPage(page),
              showTotal: (total) => `Tổng số ${total} nhân viên`
            }}
            locale={{
              emptyText: loading
                ? 'Đang tải...'
                : isFilterActive
                ? 'Không tìm thấy nhân viên phù hợp'
                : 'Chưa có nhân viên nào trong hệ thống'
            }}
          />
        )}
      </Card>

      {/* Staff Detail Drawer (UC-8.2) */}
      <Drawer
        title="Thông tin chi tiết nhân viên"
        width={520}
        open={detailVisible}
        onClose={handleCloseDetail}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải thông tin nhân viên..." />
          </div>
        ) : detailError ? (
          <Alert
            message={detailError}
            type="error"
            showIcon
            action={
              <Button size="small" type="primary" danger onClick={() => handleOpenDetail(staffDetail || {})}>
                Thử lại
              </Button>
            }
          />
        ) : staffDetail ? (
          <div>
            <Descriptions
              bordered
              column={1}
              size="middle"
              labelStyle={{ width: '160px', fontWeight: 500, background: '#fafafa' }}
            >
              <Descriptions.Item label="Họ và tên">
                <Text strong>{staffDetail.fullName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <a href={`mailto:${staffDetail.email}`}>{staffDetail.email}</a>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {staffDetail.phone || 'Chưa cập nhật'}
              </Descriptions.Item>
              <Descriptions.Item label="Vai trò">
                <Tag color="blue">Nhân viên (STAFF)</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {renderStatusTag(staffDetail.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {staffDetail.createdAt
                  ? dayjs(staffDetail.createdAt).format('DD/MM/YYYY HH:mm:ss')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật lần cuối">
                {staffDetail.updatedAt
                  ? dayjs(staffDetail.updatedAt).format('DD/MM/YYYY HH:mm:ss')
                  : '—'}
              </Descriptions.Item>
            </Descriptions>

            {staffDetail.status === USER_STATUS.INACTIVE && (
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
                  icon={<UnlockOutlined />}
                  onClick={() => {
                    handleCloseDetail();
                    handleOpenActivate(staffDetail);
                  }}
                >
                  Mở khóa tài khoản
                </Button>
              </div>
            )}

            {staffDetail.status === USER_STATUS.ACTIVE && (
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => {
                    handleCloseDetail();
                    handleOpenDeactivate(staffDetail);
                  }}
                >
                  Vô hiệu hóa tài khoản
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      {/* Create / Edit Staff Modal (UC-8.3 & UC-8.4) */}
      <Modal
        title={isEditing ? 'Cập nhật thông tin nhân viên' : 'Tạo mới tài khoản nhân viên'}
        open={formVisible}
        onOk={handleFormSubmit}
        onCancel={handleCloseForm}
        okText={isEditing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        cancelText="Hủy"
        confirmLoading={submitting}
        okButtonProps={{
          style: { backgroundColor: '#009B60', borderColor: '#009B60' },
          disabled: isEditing && !!formFetchError
        }}
        destroyOnClose
        maskClosable={false}
      >
        {formLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Đang tải dữ liệu nhân viên..." />
          </div>
        ) : formFetchError ? (
          <div style={{ padding: '20px 0' }}>
            <Alert message={formFetchError} type="error" showIcon />
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: 16 }}
            autoComplete="off"
          >
            <Form.Item
              label="Họ và tên"
              name="fullName"
              rules={[
                { required: true, message: 'Vui lòng nhập họ và tên nhân viên!' },
                {
                  validator: (_, value) => {
                    if (value && !value.trim()) {
                      return Promise.reject(new Error('Họ và tên không được để trống!'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Nhập họ và tên đầy đủ"
                maxLength={100}
              />
            </Form.Item>

            <Form.Item
              label="Địa chỉ Email"
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập địa chỉ email!' },
                { type: 'email', message: 'Email không đúng định dạng!' }
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="vi-du: nhanvien@gmail.com"
                maxLength={100}
              />
            </Form.Item>

            <Form.Item
              label="Số điện thoại"
              name="phone"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                {
                  pattern: VIETNAMESE_PHONE_REGEX,
                  message: 'Số điện thoại không hợp lệ (gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)!'
                }
              ]}
            >
              <Input
                prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Nhập số điện thoại (10 chữ số)"
                maxLength={11}
              />
            </Form.Item>

            {!isEditing && (
              <Form.Item
                label="Mật khẩu khởi tạo"
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu khởi tạo!' },
                  { min: 6, message: 'Mật khẩu phải có tối thiểu 6 ký tự!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>

      {/* Deactivate Confirmation Modal (UC-8.5) */}
      <Modal
        title={
          <Space>
            <StopOutlined style={{ color: '#ff4d4f' }} />
            <span>Xác nhận vô hiệu hóa nhân viên</span>
          </Space>
        }
        open={deactivateModalVisible}
        onOk={handleConfirmDeactivate}
        onCancel={handleCloseDeactivate}
        okText="Vô hiệu hóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={deactivating}
        maskClosable={false}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>
            Bạn có chắc chắn muốn vô hiệu hóa tài khoản nhân viên{' '}
            <Text strong>{deactivateTarget?.fullName}</Text> (
            <Text type="secondary">{deactivateTarget?.email}</Text>) không?
          </p>
          <Alert
            message="Lưu ý quan trọng"
            description="Tài khoản sau khi vô hiệu hóa sẽ chuyển sang trạng thái INACTIVE và không thể đăng nhập vào hệ thống. Mọi lịch sử giao dịch và dữ liệu liên quan sẽ được bảo toàn nguyên vẹn."
            type="warning"
            showIcon
          />
        </div>
      </Modal>

      {/* Activate / Unlock Confirmation Modal */}
      <Modal
        title={
          <Space>
            <UnlockOutlined style={{ color: '#009B60' }} />
            <span>Xác nhận mở khóa tài khoản nhân viên</span>
          </Space>
        }
        open={activateModalVisible}
        onOk={handleConfirmActivate}
        onCancel={handleCloseActivate}
        okText="Mở khóa"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#009B60', borderColor: '#009B60' } }}
        confirmLoading={activating}
        maskClosable={false}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>
            Bạn có chắc chắn muốn mở khóa và kích hoạt lại tài khoản nhân viên{' '}
            <Text strong>{activateTarget?.fullName}</Text> (
            <Text type="secondary">{activateTarget?.email}</Text>) không?
          </p>
          <Alert
            message="Thông báo"
            description="Tài khoản sau khi mở khóa sẽ chuyển sang trạng thái ACTIVE và nhân viên có thể đăng nhập bình thường vào hệ thống."
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}
