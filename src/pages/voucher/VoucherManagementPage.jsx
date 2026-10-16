import { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Button, message, Space, Breadcrumb } from 'antd';
import { PlusOutlined, TagOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { voucherService } from '../../services/voucherService';

import VoucherFilters from './components/VoucherFilters';
import VoucherTable from './components/VoucherTable';
import VoucherFormModal from './components/VoucherFormModal';
import VoucherDetailDrawer from './components/VoucherDetailDrawer';
import DeactivateVoucherDialog from './components/DeactivateVoucherDialog';

const { Title, Text } = Typography;

export default function VoucherManagementPage() {
  const { isAdmin } = useAuth();

  // Danh sách voucher & trạng thái
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Phân trang & sắp xếp
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const [sortConfig, setSortConfig] = useState({
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Bộ lọc
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    validityStatus: '',
    startDateFrom: '',
    endDateTo: ''
  });

  // Modal / Drawer state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [detailVoucher, setDetailVoucher] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deactivateDialogVisible, setDeactivateDialogVisible] = useState(false);

  // Chống race condition
  const activeRequestIdRef = useRef(0);

  // Tải danh sách voucher
  const fetchVouchers = useCallback(async (currentFilters, currentPagination, currentSort) => {
    const requestId = ++activeRequestIdRef.current;
    setLoading(true);

    try {
      const params = {
        page: currentPagination.page,
        limit: currentPagination.limit,
        sortBy: currentSort.sortBy,
        sortOrder: currentSort.sortOrder,
        search: currentFilters.search || undefined,
        status: currentFilters.status || undefined,
        validityStatus: currentFilters.validityStatus || undefined,
        startDateFrom: currentFilters.startDateFrom || undefined,
        endDateTo: currentFilters.endDateTo || undefined
      };

      const res = await voucherService.getVouchers(params);

      // Nếu có request mới hơn, bỏ qua kết quả cũ
      if (requestId !== activeRequestIdRef.current) return;

      if (res.success && res.data) {
        setVouchers(res.data.items || []);
        setPagination({
          page: res.data.pagination.page,
          limit: res.data.pagination.limit,
          total: res.data.pagination.total
        });
      }
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) return;
      message.error(err.response?.data?.message || 'Không thể tải danh sách voucher!');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchVouchers(filters, pagination, sortConfig);
  }, [filters, pagination.page, pagination.limit, sortConfig, fetchVouchers]);

  // Bộ lọc thay đổi -> đưa phân trang về trang 1
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      validityStatus: '',
      startDateFrom: '',
      endDateTo: ''
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Thay đổi bảng (phân trang hoặc sắp xếp)
  const handleTableChange = (newPagination, _, sorter) => {
    const newPage = newPagination.current;
    const newLimit = newPagination.pageSize;

    let newSortBy = 'createdAt';
    let newSortOrder = 'desc';

    if (sorter && sorter.field) {
      newSortBy = sorter.field;
      newSortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
    }

    setSortConfig({ sortBy: newSortBy, sortOrder: newSortOrder });
    setPagination((prev) => ({
      ...prev,
      page: prev.limit !== newLimit ? 1 : newPage,
      limit: newLimit
    }));
  };

  // UC-15.2: Xem chi tiết voucher
  const handleViewDetail = async (record) => {
    setDetailDrawerVisible(true);
    setDetailLoading(true);
    try {
      const res = await voucherService.getVoucherById(record._id);
      if (res.success && res.data) {
        setDetailVoucher(res.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải chi tiết voucher!');
    } finally {
      setDetailLoading(false);
    }
  };

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedVoucher(null);
    setFormModalVisible(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (record) => {
    setFormMode('edit');
    setSelectedVoucher(record);
    setFormModalVisible(true);
  };

  // Submit tạo hoặc cập nhật voucher
  const handleFormSubmit = async (values) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (formMode === 'create') {
        const res = await voucherService.createVoucher(values);
        if (res.success) {
          message.success('Tạo voucher mới thành công!');
          setFormModalVisible(false);
          fetchVouchers(filters, pagination, sortConfig);
        }
      } else {
        const res = await voucherService.updateVoucher(selectedVoucher._id, values);
        if (res.success) {
          message.success('Cập nhật voucher thành công!');
          setFormModalVisible(false);
          fetchVouchers(filters, pagination, sortConfig);

          if (detailVoucher && detailVoucher._id === selectedVoucher._id) {
            handleViewDetail(selectedVoucher);
          }
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Thao tác không thành công!');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở dialog vô hiệu hóa
  const handleOpenDeactivate = (record) => {
    setSelectedVoucher(record);
    setDeactivateDialogVisible(true);
  };

  // Xác nhận vô hiệu hóa
  const handleConfirmDeactivate = async () => {
    if (submitting || !selectedVoucher) return;
    setSubmitting(true);

    try {
      const res = await voucherService.deactivateVoucher(selectedVoucher._id);
      if (res.success) {
        message.success('Đã vô hiệu hóa voucher thành công!');
        setDeactivateDialogVisible(false);
        fetchVouchers(filters, pagination, sortConfig);

        if (detailVoucher && detailVoucher._id === selectedVoucher._id) {
          handleViewDetail(selectedVoucher);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể vô hiệu hóa voucher!');
    } finally {
      setSubmitting(false);
    }
  };

  // Kích hoạt lại voucher
  const handleActivate = async (record) => {
    try {
      const res = await voucherService.activateVoucher(record._id);
      if (res.success) {
        message.success('Đã kích hoạt lại voucher thành công!');
        fetchVouchers(filters, pagination, sortConfig);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể kích hoạt lại voucher!');
    }
  };

  return (
    <div>
      {/* Breadcrumb điều hướng */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: (
              <>
                <HomeOutlined /> Trang chủ
              </>
            )
          },
          {
            title: 'Quản trị'
          },
          {
            title: 'Quản lý mã giảm giá (UC-15)'
          }
        ]}
      />

      {/* Header trang và nút tạo mới (chỉ Admin) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TagOutlined style={{ color: '#009B60' }} />
            Quản Lý Mã Giảm Giá (Voucher)
          </Title>
          <Text type="secondary">
            Thiết lập chương trình khuyến mãi, quản lý thời hạn và điều kiện sử dụng mã ưu đãi
          </Text>
        </div>

        {isAdmin && (
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{
                backgroundColor: '#009B60',
                borderColor: '#009B60',
                borderRadius: 8,
                height: 40,
                fontWeight: 500
              }}
            >
              Tạo voucher mới
            </Button>
          </Space>
        )}
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <VoucherFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Bảng danh sách voucher */}
      <VoucherTable
        vouchers={vouchers}
        loading={loading}
        pagination={pagination}
        onTableChange={handleTableChange}
        onViewDetail={handleViewDetail}
        onEdit={handleOpenEdit}
        onDeactivate={handleOpenDeactivate}
        onActivate={handleActivate}
        isAdmin={isAdmin}
      />

      {/* Modal Thêm mới / Cập nhật voucher */}
      <VoucherFormModal
        visible={formModalVisible}
        mode={formMode}
        initialData={selectedVoucher}
        onCancel={() => setFormModalVisible(false)}
        onSubmit={handleFormSubmit}
        loading={submitting}
      />

      {/* Drawer Xem chi tiết voucher */}
      <VoucherDetailDrawer
        visible={detailDrawerVisible}
        voucher={detailVoucher}
        loading={detailLoading}
        onClose={() => setDetailDrawerVisible(false)}
      />

      {/* Dialog Xác nhận vô hiệu hóa voucher */}
      <DeactivateVoucherDialog
        visible={deactivateDialogVisible}
        voucher={selectedVoucher}
        onCancel={() => setDeactivateDialogVisible(false)}
        onConfirm={handleConfirmDeactivate}
        loading={submitting}
      />
    </div>
  );
}
