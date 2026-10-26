import { Drawer, Descriptions, Typography, Table, Tag, Empty, Spin } from 'antd';
import ProductStatusBadge from './ProductStatusBadge';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export default function ProductDetailDrawer({
  visible,
  product,
  loading,
  onClose
}) {
  const historyColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (t) => dayjs(t).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Số lượng nhập',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      render: (q) => (
        <Text strong style={{ color: '#52c41a' }}>
          +{q}
        </Text>
      )
    },
    {
      title: 'Tồn trước / sau',
      key: 'stock',
      width: 130,
      render: (_, r) => (
        <span>
          {r.stockBefore} → <Text strong>{r.stockAfter}</Text>
        </span>
      )
    },
    {
      title: 'Giá vốn',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 110,
      render: (cp) => (cp ? `${Number(cp).toLocaleString('vi-VN')} đ` : '-')
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'performedBy',
      key: 'performedBy',
      width: 150,
      render: (u) => u?.fullName || u?.email || 'Hệ thống'
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (n) => n || <Text type="secondary">-</Text>
    }
  ];

  return (
    <Drawer
      title="Thông tin chi tiết sản phẩm"
      placement="right"
      width={typeof window !== 'undefined' && window.innerWidth < 680 ? '100%' : 680}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" tip="Đang tải dữ liệu sản phẩm..." />
        </div>
      ) : !product ? (
        <Empty description="Không có thông tin sản phẩm" />
      ) : (
        <div>
          <Descriptions
            bordered
            column={{ xs: 1, sm: 2 }}
            size="middle"
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="Tên sản phẩm" span={2}>
              <Text strong style={{ fontSize: 16 }}>{product.name}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Giá bán hiện tại">
              <Text strong style={{ color: '#009B60', fontSize: 16 }}>
                {Number(product.price || 0).toLocaleString('vi-VN')} đ
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Đơn vị tính">
              {product.unit || 'cái'}
            </Descriptions.Item>

            <Descriptions.Item label="Số lượng tồn kho">
              <Text strong style={{ color: '#1890ff', fontSize: 16 }}>
                {product.stockQuantity || 0}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái">
              <ProductStatusBadge status={product.status} />
            </Descriptions.Item>

            <Descriptions.Item label="Phân nhóm">
              <Tag color="cyan">{product.category || 'GENERAL'}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Ngày tạo">
              {dayjs(product.createdAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>

            <Descriptions.Item label="Cập nhật gần nhất">
              {dayjs(product.updatedAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>

            <Descriptions.Item label="Mô tả" span={2}>
              {product.description ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{product.description}</div>
              ) : (
                <Text type="secondary">Chưa có mô tả chi tiết</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5} style={{ marginBottom: 12 }}>
            Lịch sử giao dịch nhập kho gần đây
          </Title>

          <Table
            columns={historyColumns}
            dataSource={product.stockHistory || []}
            rowKey="_id"
            size="small"
            scroll={{ x: 650 }}
            pagination={{ pageSize: 5 }}
            locale={{
              emptyText: 'Chưa có lịch sử nhập kho nào được ghi nhận'
            }}
          />
        </div>
      )}
    </Drawer>
  );
}
