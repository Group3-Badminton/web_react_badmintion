import { useState, useEffect, useCallback, useRef } from 'react';
import { Typography, Button, message, Space, Breadcrumb } from 'antd';
import { PlusOutlined, ShopOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';

import ProductFilters from './components/ProductFilters';
import ProductTable from './components/ProductTable';
import ProductFormModal from './components/ProductFormModal';
import ProductDetailDrawer from './components/ProductDetailDrawer';
import StockInModal from './components/StockInModal';
import DeactivateProductDialog from './components/DeactivateProductDialog';

const { Title, Text } = Typography;

export default function ProductManagementPage() {
  const { isAdmin } = useAuth();

  // Danh sách sản phẩm & trạng thái tải
  const [products, setProducts] = useState([]);
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
    stockStatus: '',
    minPrice: '',
    maxPrice: ''
  });

  // Modal / Drawer state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [stockInModalVisible, setStockInModalVisible] = useState(false);
  const [deactivateDialogVisible, setDeactivateDialogVisible] = useState(false);

  // Chống race condition khi phản hồi cũ ghi đè phản hồi mới
  const activeRequestIdRef = useRef(0);

  // Tải danh sách sản phẩm từ backend
  const fetchProducts = useCallback(async (currentFilters, currentPagination, currentSort) => {
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
        stockStatus: currentFilters.stockStatus || undefined,
        minPrice: currentFilters.minPrice !== '' ? currentFilters.minPrice : undefined,
        maxPrice: currentFilters.maxPrice !== '' ? currentFilters.maxPrice : undefined
      };

      const res = await productService.getProducts(params);

      // Nếu có request mới hơn đang chạy, bỏ qua kết quả request này
      if (requestId !== activeRequestIdRef.current) return;

      if (res.success && res.data) {
        setProducts(res.data.items || []);
        setPagination({
          page: res.data.pagination.page,
          limit: res.data.pagination.limit,
          total: res.data.pagination.total
        });
      }
    } catch (err) {
      if (requestId !== activeRequestIdRef.current) return;
      message.error(err.response?.data?.message || 'Không thể tải danh sách sản phẩm!');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Gọi API lần đầu & khi dependencies thay đổi
  useEffect(() => {
    fetchProducts(filters, pagination, sortConfig);
  }, [filters, pagination.page, pagination.limit, sortConfig, fetchProducts]);

  // Bộ lọc thay đổi -> đưa phân trang về trang 1
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      stockStatus: '',
      minPrice: '',
      maxPrice: ''
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Thay đổi bảng (phân trang hoặc sắp xếp cột)
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

  // UC-14.2: Xem chi tiết sản phẩm
  const handleViewDetail = async (record) => {
    setDetailDrawerVisible(true);
    setDetailLoading(true);
    try {
      const res = await productService.getProductById(record._id);
      if (res.success && res.data) {
        setDetailProduct(res.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải chi tiết sản phẩm!');
    } finally {
      setDetailLoading(false);
    }
  };

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedProduct(null);
    setFormModalVisible(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEdit = (record) => {
    setFormMode('edit');
    setSelectedProduct(record);
    setFormModalVisible(true);
  };

  // Submit tạo hoặc cập nhật sản phẩm
  const handleFormSubmit = async (values) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (formMode === 'create') {
        const res = await productService.createProduct(values);
        if (res.success) {
          message.success('Tạo sản phẩm mới thành công!');
          setFormModalVisible(false);
          fetchProducts(filters, pagination, sortConfig);
        }
      } else {
        const res = await productService.updateProduct(selectedProduct._id, values);
        if (res.success) {
          message.success('Cập nhật sản phẩm thành công!');
          setFormModalVisible(false);
          fetchProducts(filters, pagination, sortConfig);

          // Cập nhật drawer nếu đang mở đúng sản phẩm đó
          if (detailProduct && detailProduct._id === selectedProduct._id) {
            handleViewDetail(selectedProduct);
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
    setSelectedProduct(record);
    setDeactivateDialogVisible(true);
  };

  // Xác nhận vô hiệu hóa sản phẩm
  const handleConfirmDeactivate = async () => {
    if (submitting || !selectedProduct) return;
    setSubmitting(true);

    try {
      const res = await productService.deactivateProduct(selectedProduct._id);
      if (res.success) {
        message.success('Đã ngưng kinh doanh sản phẩm thành công!');
        setDeactivateDialogVisible(false);
        fetchProducts(filters, pagination, sortConfig);

        if (detailProduct && detailProduct._id === selectedProduct._id) {
          handleViewDetail(selectedProduct);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể vô hiệu hóa sản phẩm!');
    } finally {
      setSubmitting(false);
    }
  };

  // Kích hoạt lại sản phẩm
  const handleActivate = async (record) => {
    try {
      const res = await productService.activateProduct(record._id);
      if (res.success) {
        message.success('Đã kích hoạt lại sản phẩm thành công!');
        fetchProducts(filters, pagination, sortConfig);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể kích hoạt lại sản phẩm!');
    }
  };

  // Mở modal nhập kho
  const handleOpenStockIn = (record) => {
    setSelectedProduct(record);
    setStockInModalVisible(true);
  };

  // Xác nhận nhập kho
  const handleStockInSubmit = async (values) => {
    if (submitting || !selectedProduct) return;
    setSubmitting(true);

    try {
      // Sinh requestId ngẫu nhiên để chống gửi lặp (idempotency)
      const requestId = `stk_${selectedProduct._id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const payload = {
        ...values,
        requestId
      };

      const res = await productService.stockIn(selectedProduct._id, payload);
      if (res.success) {
        message.success('Đã ghi nhận nhập kho thành công!');
        setStockInModalVisible(false);
        fetchProducts(filters, pagination, sortConfig);

        if (detailProduct && detailProduct._id === selectedProduct._id) {
          handleViewDetail(selectedProduct);
        }
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể nhập kho!');
    } finally {
      setSubmitting(false);
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
            title: 'Quản lý sản phẩm (UC-14)'
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
            <ShopOutlined style={{ color: '#009B60' }} />
            Quản Lý Sản Phẩm & Kho Hàng
          </Title>
          <Text type="secondary">
            Quản lý danh mục hàng hóa, theo dõi tồn kho và nhập xuất kho an toàn
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
              Thêm sản phẩm mới
            </Button>
          </Space>
        )}
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <ProductFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Bảng danh sách sản phẩm */}
      <ProductTable
        products={products}
        loading={loading}
        pagination={pagination}
        onTableChange={handleTableChange}
        onViewDetail={handleViewDetail}
        onEdit={handleOpenEdit}
        onDeactivate={handleOpenDeactivate}
        onActivate={handleActivate}
        onStockIn={handleOpenStockIn}
        isAdmin={isAdmin}
      />

      {/* Modal Thêm mới / Cập nhật sản phẩm */}
      <ProductFormModal
        visible={formModalVisible}
        mode={formMode}
        initialData={selectedProduct}
        onCancel={() => setFormModalVisible(false)}
        onSubmit={handleFormSubmit}
        loading={submitting}
      />

      {/* Drawer Xem chi tiết & Lịch sử nhập kho */}
      <ProductDetailDrawer
        visible={detailDrawerVisible}
        product={detailProduct}
        loading={detailLoading}
        onClose={() => setDetailDrawerVisible(false)}
      />

      {/* Modal Nhập kho */}
      <StockInModal
        visible={stockInModalVisible}
        product={selectedProduct}
        onCancel={() => setStockInModalVisible(false)}
        onSubmit={handleStockInSubmit}
        loading={submitting}
      />

      {/* Dialog Xác nhận vô hiệu hóa */}
      <DeactivateProductDialog
        visible={deactivateDialogVisible}
        product={selectedProduct}
        onCancel={() => setDeactivateDialogVisible(false)}
        onConfirm={handleConfirmDeactivate}
        loading={submitting}
      />
    </div>
  );
}
