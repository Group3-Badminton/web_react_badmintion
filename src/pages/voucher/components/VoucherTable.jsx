import { Table, Typography, Space, Button, Tooltip, Tag } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import VoucherStatusBadge from './VoucherStatusBadge';

const { Text } = Typography;

export default function VoucherTable({
  vouchers,
  loading,
  pagination,
  onTableChange,
  onViewDetail,
  onEdit,
  onDeactivate,
  onActivate,
  isAdmin
}) {
  const columns = [
    {
      title: 'Mã voucher',
      dataIndex: 'code',
      key: 'code',
      sorter: true,
      render: (code) => (
        <Tag color="geekblue" style={{ fontSize: 13, fontWeight: 'bold', padding: '2px 8px' }}>
          {code}
        </Tag>
      )
    },
    {
      title: 'Tên chương trình',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (name) => <Text strong>{name}</Text>
    },
    {
      title: 'Mức giảm giá',
      key: 'discount',
      sorter: true,
      render: (_, r) => {
        if (r.discountType === 'PERCENTAGE') {
          return (
            <div>
              <Text strong style={{ color: '#009B60' }}>
                Giảm {r.discountValue}%
              </Text>
              {r.maxDiscountAmount ? (
                <div style={{ fontSize: 12, color: '#888' }}>
                  Tối đa: {Number(r.maxDiscountAmount).toLocaleString('vi-VN')} đ
                </div>
              ) : null}
            </div>
          );
        }
        return (
          <Text strong style={{ color: '#009B60' }}>
            Giảm {Number(r.discountValue || 0).toLocaleString('vi-VN')} đ
          </Text>
        );
      }
    },
    {
      title: 'Loại sân áp dụng',
      dataIndex: 'applicableCourtTypes',
      key: 'applicableCourtTypes',
      render: (types) => {
        if (!types || types.length === 0 || types.includes('ALL')) {
          return <Tag color="blue">Tất cả sân</Tag>;
        }
        const colorMap = { STANDARD: 'green', VIP: 'gold', PREMIUM: 'purple' };
        const labelMap = { STANDARD: 'Tiêu Chuẩn', VIP: 'VIP', PREMIUM: 'Thi Đấu' };
        return (
          <Space size={[0, 4]} wrap>
            {types.map((t) => (
              <Tag key={t} color={colorMap[t] || 'default'}>
                {labelMap[t] || t}
              </Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Thời gian hiệu lực',
      key: 'validityPeriod',
      render: (_, r) => (
        <div style={{ fontSize: 13 }}>
          <div>Từ: {dayjs(r.startDate).format('DD/MM/YYYY HH:mm')}</div>
          <div>Đến: {dayjs(r.endDate).format('DD/MM/YYYY HH:mm')}</div>
        </div>
      )
    },
    {
      title: 'Lượt sử dụng',
      key: 'usage',
      sorter: true,
      render: (_, r) => {
        if (r.usageLimit != null) {
          return (
            <span>
              <Text strong>{r.usedCount || 0}</Text> / {r.usageLimit}
            </span>
          );
        }
        return (
          <span>
            <Text strong>{r.usedCount || 0}</Text> (Không giới hạn)
          </span>
        );
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, r) => (
        <VoucherStatusBadge
          status={r.status}
          timeStatus={r.timeStatus}
          isUsageExceeded={r.isUsageExceeded}
          isApplicable={r.isApplicable}
        />
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {/* Xem chi tiết - Cho cả Staff và Admin */}
          <Tooltip title="Xem chi tiết voucher">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => onViewDetail(record)}
            />
          </Tooltip>

          {/* Admin only actions */}
          {isAdmin && (
            <>
              {/* Chỉnh sửa */}
              <Tooltip title="Chỉnh sửa voucher">
                <Button
                  type="text"
                  icon={<EditOutlined style={{ color: '#fa8c16' }} />}
                  onClick={() => onEdit(record)}
                />
              </Tooltip>

              {/* Vô hiệu hóa hoặc Kích hoạt lại */}
              {record.status === 'ACTIVE' ? (
                <Tooltip title="Vô hiệu hóa voucher">
                  <Button
                    type="text"
                    danger
                    icon={<StopOutlined />}
                    onClick={() => onDeactivate(record)}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Kích hoạt lại voucher">
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
      dataSource={vouchers}
      rowKey="_id"
      loading={loading}
      pagination={{
        current: pagination.page,
        pageSize: pagination.limit,
        total: pagination.total,
        showSizeChanger: true,
        pageSizeOptions: ['5', '10', '20', '50'],
        showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} voucher`
      }}
      onChange={onTableChange}
      scroll={{ x: 1050 }}
      locale={{
        emptyText: 'Không tìm thấy voucher nào'
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
