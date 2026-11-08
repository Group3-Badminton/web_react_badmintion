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
  AppstoreOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { courtService } from '../../services/courtService';
import { useAuth } from '../../context/AuthContext';
import { COURT_STATUS } from '../../utils/constants';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function CourtManagementPage() {
  const { isAdmin } = useAuth();

  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Search & Filter state (Admin only - UC-9.6)
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState({ search: '', status: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const latestRequestId = useRef(0);

  // Detail Drawer state (UC-9.2)
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [courtDetail, setCourtDetail] = useState(null);

  // Form Modal state (Create / Edit) (UC-9.3 & UC-9.4)
  const [formVisible, setFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditCourt, setCurrentEditCourt] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formFetchError, setFormFetchError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Deactivate Modal state (UC-9.5)
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // Check if search/filter is currently applied
  const isFilterActive = Boolean(
    activeFilter.search || (activeFilter.status && activeFilter.status !== 'ALL')
  );

  // 1. Fetch Court List / Search & Filter (UC-9.1 & UC-9.6)
  const fetchCourts = () => {
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
        if (isAdmin) {
          if (activeFilter.search) {
            params.search = activeFilter.search;
          }
          if (activeFilter.status && activeFilter.status !== 'ALL') {
            params.status = activeFilter.status;
          }
        }

        const res = await courtService.getCourts(params);
        if (isMounted && currentReqId === latestRequestId.current) {
          if (res.success && Array.isArray(res.data)) {
            setCourts(res.data);
          } else {
            setListError(
              isSearching
                ? 'Unable to search courts. Please try again.'
                : 'Unable to load the court list. Please try again.'
            );
            setCourts([]);
          }
        }
      } catch {
        if (isMounted && currentReqId === latestRequestId.current) {
          setListError(
            isSearching
              ? 'Unable to search courts. Please try again.'
              : 'Unable to load the court list. Please try again.'
          );
          setCourts([]);
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
  }, [refreshKey, activeFilter, isAdmin]);

  // Handle Search & Filter submit (UC-9.6)
  const handleSearch = () => {
    setCurrentPage(1);
    setActiveFilter({
      search: searchInput.trim(),
      status: statusFilter
    });
  };

  // Handle Clear Filter (UC-9.6 Alternative Flow A2)
  const handleClearFilter = () => {
    setSearchInput('');
    setStatusFilter('');
    setCurrentPage(1);
    setActiveFilter({
      search: '',
      status: ''
    });
  };

  // 2. Open Detail Drawer (UC-9.2)
  const handleOpenDetail = async (record) => {
    setCourtDetail(null);
    setDetailError(null);
    setDetailVisible(true);
    setDetailLoading(true);

    try {
      const res = await courtService.getCourtDetail(record._id);
      if (res.success && res.data) {
        setCourtDetail(res.data);
      } else {
        setDetailError('Unable to view the selected court record.');
      }
    } catch {
      setDetailError('Unable to view the selected court record.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setCourtDetail(null);
    setDetailError(null);
  };

  // 3. Open Create Modal (UC-9.3 - Admin only)
  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentEditCourt(null);
    setFormFetchError(null);
    form.resetFields();
    form.setFieldsValue({
      courtType: 'STANDARD',
      openingTime: '05:00',
      closingTime: '23:00'
    });
    setFormVisible(true);
  };

  // 4. Open Edit Modal (UC-9.4 - Admin only)
  const handleOpenEdit = async (record) => {
    setIsEditing(true);
    setCurrentEditCourt(record);
    setFormFetchError(null);
    form.resetFields();
    setFormVisible(true);
    setFormLoading(true);

    try {
      const res = await courtService.getCourtDetail(record._id);
      if (res.success && res.data) {
        setCurrentEditCourt(res.data);
        const t = (res.data.courtType || 'STANDARD').toUpperCase();
        const normType = t.includes('VIP') ? 'VIP' : (t.includes('PREMIUM') || t.includes('THI ĐẤU')) ? 'PREMIUM' : 'STANDARD';
        form.setFieldsValue({
          name: res.data.name,
          courtType: normType,
          description: res.data.description,
          openingTime: res.data.openingTime || '05:00',
          closingTime: res.data.closingTime || '23:00'
        });
      } else {
        setFormFetchError('Unable to load the selected court record.');
      }
    } catch {
      setFormFetchError('Unable to load the selected court record.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseForm = () => {
    setFormVisible(false);
    setIsEditing(false);
    setCurrentEditCourt(null);
    setFormFetchError(null);
    form.resetFields();
  };

  // 5. Submit Create / Edit Form (UC-9.3 / UC-9.4)
  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        name: values.name.trim(),
        courtType: values.courtType || 'STANDARD',
        description: (values.description || '').trim(),
        openingTime: values.openingTime ? values.openingTime.trim() : '05:00',
        closingTime: values.closingTime ? values.closingTime.trim() : '23:00'
      };

      if (isEditing) {
        // UC-9.4 Update Court
        try {
          const res = await courtService.updateCourt(currentEditCourt._id, payload);
          if (res.success) {
            message.success('Cập nhật thông tin sân thành công!');
            handleCloseForm();
            fetchCourts();
            if (detailVisible && courtDetail?._id === currentEditCourt._id) {
              setCourtDetail(res.data);
            }
          } else {
            message.error('Unable to update court information. Please try again.');
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
            message.error('Unable to update court information. Please try again.');
          }
        }
      } else {
        // UC-9.3 Create Court
        try {
          const res = await courtService.createCourt(payload);
          if (res.success) {
            message.success('Tạo sân cầu lông thành công!');
            handleCloseForm();
            fetchCourts();
          } else {
            message.error('Unable to create the court. Please try again.');
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
            message.error('Unable to create the court. Please try again.');
          }
        }
      }
    } catch {
      // Form validation handled by Antd Form
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Open Deactivate Modal (UC-9.5 - Admin only)
  const handleOpenDeactivate = (record) => {
    if (record.status === COURT_STATUS.INACTIVE) {
      message.info('Sân cầu lông đã ở trạng thái vô hiệu hóa.');
      return;
    }
    setDeactivateTarget(record);
    setDeactivateModalVisible(true);
  };

  const handleCloseDeactivate = () => {
    setDeactivateModalVisible(false);
    setDeactivateTarget(null);
  };

  // 7. Confirm Deactivation (UC-9.5)
  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    setDeactivating(true);
    try {
      const res = await courtService.deactivateCourt(deactivateTarget._id);
      if (res.success) {
        message.success('Vô hiệu hóa sân cầu lông thành công!');
        handleCloseDeactivate();
        fetchCourts();
        if (detailVisible && courtDetail?._id === deactivateTarget._id) {
          setCourtDetail(res.data);
        }
      } else {
        message.error('Unable to deactivate the court. Please try again.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        message.error('The selected court is unavailable.');
      } else {
        message.error('Unable to deactivate the court. Please try again.');
      }
    } finally {
      setDeactivating(false);
    }
  };

  // Render Court Type Tag
  const renderCourtTypeTag = (type) => {
    const t = (type || 'STANDARD').toUpperCase();
    if (t.includes('VIP') || t.includes('GỖ')) return <Tag color="gold">Sân VIP</Tag>;
    if (t.includes('PREMIUM') || t.includes('THI ĐẤU') || t.includes('PVC')) return <Tag color="purple">Sân Thi Đấu</Tag>;
    return <Tag color="green">Sân Tiêu Chuẩn</Tag>;
  };

  // Render Status Tag
  const renderStatusTag = (status) => {
    switch (status) {
      case COURT_STATUS.ACTIVE:
        return <Tag color="success">Đang hoạt động</Tag>;
      case COURT_STATUS.INACTIVE:
        return <Tag color="default">Đã vô hiệu hóa</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, index) => (currentPage - 1) * 10 + index + 1
    },
    {
      title: 'Tên sân',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text) => (
        <Space>
          <AppstoreOutlined style={{ color: '#009B60' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Loại sân',
      dataIndex: 'courtType',
      key: 'courtType',
      width: 150,
      align: 'center',
      render: (type) => renderCourtTypeTag(type)
    },
    {
      title: 'Giờ hoạt động',
      key: 'operatingHours',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>{record.openingTime || '05:00'} - {record.closingTime || '23:00'}</span>
        </Space>
      )
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '—'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      align: 'center',
      render: (status) => renderStatusTag(status)
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: isAdmin ? 270 : 100,
      align: 'center',
      render: (_, record) => (
        <Space size={4} style={{ whiteSpace: 'nowrap' }}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleOpenDetail(record)}
          >
            Chi tiết
          </Button>

          {isAdmin && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenEdit(record)}
              >
                Sửa
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
                disabled={record.status === COURT_STATUS.INACTIVE}
                onClick={() => handleOpenDeactivate(record)}
              >
                {record.status === COURT_STATUS.INACTIVE ? 'Đã vô hiệu hóa' : 'Vô hiệu hóa'}
              </Button>
            </>
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
              Quản lý danh mục sân
            </Title>
            <Text type="secondary">
              Danh mục các sân cầu lông và cấu hình thời gian hoạt động
            </Text>
          </div>
          {isAdmin && (
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
              Tạo sân mới
            </Button>
          )}
        </div>

        {/* Search & Filter Bar (UC-9.6 - Admin only) */}
        {isAdmin && (
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
              placeholder="Tìm theo tên sân"
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
                { value: COURT_STATUS.ACTIVE, label: 'Đang hoạt động' },
                { value: COURT_STATUS.INACTIVE, label: 'Đã vô hiệu hóa' }
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
        )}

        {/* Error banner on list retrieval failure (UC-9.1 & UC-9.6) */}
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
                  onClick={fetchCourts}
                >
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={courts}
            rowKey="_id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: currentPage,
              pageSize: 10,
              onChange: (page) => setCurrentPage(page),
              showTotal: (total) => `Tổng số ${total} sân`
            }}
            locale={{
              emptyText: loading
                ? 'Đang tải...'
                : isFilterActive
                ? 'Không tìm thấy sân phù hợp'
                : 'Chưa có sân nào trong hệ thống'
            }}
          />
        )}
      </Card>

      {/* Court Detail Drawer (UC-9.2) */}
      <Drawer
        title="Thông tin chi tiết sân cầu lông"
        width={500}
        open={detailVisible}
        onClose={handleCloseDetail}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải thông tin sân..." />
          </div>
        ) : detailError ? (
          <Alert
            message={detailError}
            type="error"
            showIcon
            action={
              <Button size="small" type="primary" danger onClick={() => handleOpenDetail(courtDetail || {})}>
                Thử lại
              </Button>
            }
          />
        ) : courtDetail ? (
          <div>
            <Descriptions
              bordered
              column={1}
              size="middle"
              labelStyle={{ width: '150px', fontWeight: 500, background: '#fafafa' }}
            >
              <Descriptions.Item label="Tên sân">
                <Text strong>{courtDetail.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Loại sân">
                {renderCourtTypeTag(courtDetail.courtType)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {renderStatusTag(courtDetail.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ mở cửa">
                {courtDetail.openingTime || '05:00'}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ đóng cửa">
                {courtDetail.closingTime || '23:00'}
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả">
                {courtDetail.description || 'Chưa có mô tả'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {courtDetail.createdAt
                  ? dayjs(courtDetail.createdAt).format('DD/MM/YYYY HH:mm:ss')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật lần cuối">
                {courtDetail.updatedAt
                  ? dayjs(courtDetail.updatedAt).format('DD/MM/YYYY HH:mm:ss')
                  : '—'}
              </Descriptions.Item>
            </Descriptions>

            {isAdmin && courtDetail.status === COURT_STATUS.ACTIVE && (
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => {
                    handleCloseDetail();
                    handleOpenDeactivate(courtDetail);
                  }}
                >
                  Vô hiệu hóa sân
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      {/* Create / Edit Court Modal (UC-9.3 & UC-9.4 - Admin only) */}
      {isAdmin && (
        <Modal
          title={isEditing ? 'Cập nhật thông tin sân' : 'Tạo mới sân cầu lông'}
          open={formVisible}
          onCancel={handleCloseForm}
          destroyOnClose
          maskClosable={false}
          footer={
            <div style={{ display: 'flex', justifyContent: isEditing && currentEditCourt?.status === COURT_STATUS.ACTIVE ? 'space-between' : 'flex-end', alignItems: 'center' }}>
              {isEditing && currentEditCourt?.status === COURT_STATUS.ACTIVE && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => {
                    const target = { ...currentEditCourt };
                    handleCloseForm();
                    handleOpenDeactivate(target);
                  }}
                >
                  Vô hiệu hóa sân này
                </Button>
              )}
              <Space>
                <Button onClick={handleCloseForm} disabled={submitting}>Hủy</Button>
                <Button
                  type="primary"
                  style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
                  loading={submitting}
                  disabled={isEditing && !!formFetchError}
                  onClick={handleFormSubmit}
                >
                  {isEditing ? 'Lưu thay đổi' : 'Tạo sân'}
                </Button>
              </Space>
            </div>
          }
        >
          {formLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Đang tải dữ liệu sân..." />
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
                label="Tên sân"
                name="name"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên sân!' },
                  {
                    validator: (_, value) => {
                      if (value && !value.trim()) {
                        return Promise.reject(new Error('Tên sân không được để trống!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input
                  prefix={<AppstoreOutlined style={{ color: '#bfbfbf' }} />}
                  placeholder="Ví dụ: Sân 1 (Thảm Yonex)"
                  maxLength={100}
                />
              </Form.Item>

              <Form.Item
                label="Phân loại sân"
                name="courtType"
                rules={[{ required: true, message: 'Vui lòng chọn loại sân!' }]}
              >
                <Select placeholder="Chọn loại sân áp dụng">
                  <Select.Option value="STANDARD">Sân Tiêu Chuẩn</Select.Option>
                  <Select.Option value="VIP">Sân VIP</Select.Option>
                  <Select.Option value="PREMIUM">Sân Thi Đấu</Select.Option>
                </Select>
              </Form.Item>

              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item
                  label="Giờ mở cửa"
                  name="openingTime"
                  style={{ flex: 1 }}
                  rules={[
                    { required: true, message: 'Vui lòng nhập giờ mở cửa!' },
                    { pattern: TIME_REGEX, message: 'Định dạng HH:mm (ví dụ 05:00)!' }
                  ]}
                >
                  <Input placeholder="05:00" maxLength={5} />
                </Form.Item>

                <Form.Item
                  label="Giờ đóng cửa"
                  name="closingTime"
                  style={{ flex: 1 }}
                  rules={[
                    { required: true, message: 'Vui lòng nhập giờ đóng cửa!' },
                    { pattern: TIME_REGEX, message: 'Định dạng HH:mm (ví dụ 23:00)!' }
                  ]}
                >
                  <Input placeholder="23:00" maxLength={5} />
                </Form.Item>
              </div>

              <Form.Item
                label="Mô tả / Ghi chú về sân"
                name="description"
              >
                <TextArea
                  rows={3}
                  placeholder="Mô tả cơ sở vật chất, loại thảm, ánh sáng..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          )}
        </Modal>
      )}

      {/* Deactivate Confirmation Modal (UC-9.5 - Admin only) */}
      {isAdmin && (
        <Modal
          title={
            <Space>
              <StopOutlined style={{ color: '#ff4d4f' }} />
              <span>Xác nhận vô hiệu hóa sân</span>
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
              Bạn có chắc chắn muốn vô hiệu hóa sân <Text strong>{deactivateTarget?.name}</Text> không?
            </p>
            <Alert
              message="Lưu ý theo quy định hệ thống"
              description="Sân sau khi vô hiệu hóa sẽ chuyển sang trạng thái INACTIVE và không nhận bất kỳ lượt đặt sân mới nào (BR-09). Toàn bộ lịch sử đặt sân và giao dịch liên quan sẽ được bảo toàn nguyên vẹn (BR-40)."
              type="warning"
              showIcon
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
