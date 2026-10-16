import { Drawer, Descriptions, Typography, Tag, Empty, Spin } from 'antd';
import dayjs from 'dayjs';
import VoucherStatusBadge from './VoucherStatusBadge';

const { Text } = Typography;

export default function VoucherDetailDrawer({
  visible,
  voucher,
  loading,
  onClose
}) {
  return (
    <Drawer
      title="Chi tiết mã voucher"
      placement="right"
      width={640}
      open={visible}
      onClose={onClose}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" tip="Đang tải dữ liệu voucher..." />
        </div>
      ) : !voucher ? (
        <Empty description="Không tìm thấy thông tin voucher" />
      ) : (
        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="Mã voucher" span={2}>
            <Tag color="geekblue" style={{ fontSize: 16, fontWeight: 'bold', padding: '4px 12px' }}>
              {voucher.code}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Tên chương trình" span={2}>
            <Text strong style={{ fontSize: 15 }}>{voucher.name}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Hình thức giảm">
            {voucher.discountType === 'PERCENTAGE' ? 'Theo phần trăm (%)' : 'Số tiền cố định (đ)'}
          </Descriptions.Item>

          <Descriptions.Item label="Mức giảm">
            <Text strong style={{ color: '#009B60', fontSize: 16 }}>
              {voucher.discountType === 'PERCENTAGE'
                ? `${voucher.discountValue}%`
                : `${Number(voucher.discountValue).toLocaleString('vi-VN')} đ`}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Mức giảm tối đa">
            {voucher.maxDiscountAmount
              ? `${Number(voucher.maxDiscountAmount).toLocaleString('vi-VN')} đ`
              : 'Không giới hạn'}
          </Descriptions.Item>

          <Descriptions.Item label="Đơn tối thiểu">
            {voucher.minInvoiceAmount
              ? `${Number(voucher.minInvoiceAmount).toLocaleString('vi-VN')} đ`
              : '0 đ (Không yêu cầu)'}
          </Descriptions.Item>

          <Descriptions.Item label="Bắt đầu từ">
            {dayjs(voucher.startDate).format('DD/MM/YYYY HH:mm:ss')}
          </Descriptions.Item>

          <Descriptions.Item label="Hết hạn vào">
            {dayjs(voucher.endDate).format('DD/MM/YYYY HH:mm:ss')}
          </Descriptions.Item>

          <Descriptions.Item label="Số lượt đã dùng">
            <Text strong style={{ color: '#1890ff' }}>{voucher.usedCount || 0}</Text> lượt
          </Descriptions.Item>

          <Descriptions.Item label="Tổng giới hạn lượt">
            {voucher.usageLimit ? `${voucher.usageLimit} lượt` : 'Không giới hạn'}
          </Descriptions.Item>

          <Descriptions.Item label="Trạng thái tổng hợp" span={2}>
            <VoucherStatusBadge
              status={voucher.status}
              timeStatus={voucher.timeStatus}
              isUsageExceeded={voucher.isUsageExceeded}
              isApplicable={voucher.isApplicable}
            />
          </Descriptions.Item>

          <Descriptions.Item label="Người tạo" span={2}>
            {voucher.createdBy?.fullName
              ? `${voucher.createdBy.fullName} (${voucher.createdBy.email})`
              : 'Quản trị viên'}
          </Descriptions.Item>

          <Descriptions.Item label="Ngày tạo">
            {dayjs(voucher.createdAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>

          <Descriptions.Item label="Cập nhật gần nhất">
            {dayjs(voucher.updatedAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>

          <Descriptions.Item label="Mô tả & Điều kiện" span={2}>
            {voucher.description ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{voucher.description}</div>
            ) : (
              <Text type="secondary">Chưa có điều kiện bổ sung</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  );
}
