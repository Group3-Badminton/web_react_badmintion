import { Table, Typography, Space, Button, Tooltip, Tag } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  InboxOutlined
} from '@ant-design/icons';
import ProductStatusBadge from './ProductStatusBadge';

const { Text } = Typography;

export default function ProductTable({
  products,
  loading,
  pagination,
  onTableChange,
  onViewDetail,
  onEdit,
  onDeactivate,
  onActivate,
  onStockIn,
  isAdmin
}) {
  const columns = [
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text, record) => (
        <Space orientation="vertical" size={2}>
          <Text Orientation="horizontal" strong style={{ fontSize: 14 }}>
            {text}
          </Text>
          {record.category && record.category !== 'GENERAL' && (
            <Tag color="cyan" style={{ fontSize: 11, padding: '0 4px', lineHeight: '18px' }}>
              {record.category}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      sorter: true,
      width: 150,
      render: (val) => (
        <Text strong style={{ color: '#009B60' }}>
          {Number(val || 0).toLocaleString('vi-VN')} đ
        </Text>
      )
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      render: (u) => u || 'cái'
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      sorter: true,
      width: 130,
      render: (qty) => {
        const num = Number(qty || 0);
        if (num === 0) {
          return <Tag color="error">Hết hàng (0)</Tag>;
        }
        if (num <= 5) {
          return <Tag color="warning">Sắp hết ({num})</Tag>;
        }
        return (
          <Text strong style={{ color: '#1890ff' }}>
            {num.toLocaleString('vi-VN')}
          </Text>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => <ProductStatusBadge status={status} />
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {/* Xem chi tiết - Cho cả Staff và Admin */}
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => onViewDetail(record)}
            />
          </Tooltip>

          {/* Admin only actions */}
          {isAdmin && (
            <>
              {/* Nhập kho */}
              <Tooltip title={record.status === 'INACTIVE' ? 'Sản phẩm ngưng bán không thể nhập kho' : 'Nhập kho'}>
                <Button
                  type="text"
                  disabled={record.status === 'INACTIVE'}
                  icon={<InboxOutlined style={{ color: record.status === 'INACTIVE' ? '#ccc' : '#52c41a' }} />}
                  onClick={() => onStockIn(record)}
                />
              </Tooltip>

              {/* Chỉnh sửa */}
              <Tooltip title="Chỉnh sửa thông tin">
                <Button
                  type="text"
                  icon={<EditOutlined style={{ color: '#fa8c16' }} />}
                  onClick={() => onEdit(record)}
                />
              </Tooltip>

              {/* Vô hiệu hóa hoặc Kích hoạt lại */}
              {record.status === 'ACTIVE' ? (
                <Tooltip title="Vô hiệu hóa sản phẩm">
                  <Button
                    type="text"
                    danger
                    icon={<StopOutlined />}
                    onClick={() => onDeactivate(record)}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Kích hoạt lại kinh doanh">
                  <Button
                    type="text"
                    icon={<CheckCircleOutlined style={{ color: '#009B60' }} />}
                    onClick={() => onActivate(record)}
                  />
                </Tooltip>
              )}
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={products}
      rowKey="_id"
      loading={loading}
      pagination={{
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: ['5', '10', '20', '50'],
        showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} sản phẩm`
      }}
      onChange={onTableChange}
      scroll={{ x: 800 }}
      locale={{
        emptyText: 'Không tìm thấy sản phẩm nào phù hợp'
      }}
      style={{
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}
    />
  );
}
