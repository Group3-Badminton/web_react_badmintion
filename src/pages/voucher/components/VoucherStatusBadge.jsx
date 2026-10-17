import { Tag, Space } from 'antd';
import {
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

/**
 * Hiển thị kết hợp cả Trạng thái Quản trị (Admin Status)
 * và Trạng thái Thời gian Hiệu lực (Validity Status)
 */
export default function VoucherStatusBadge({ status, timeStatus, isUsageExceeded, isApplicable }) {
  // Trạng thái quản trị
  const adminBadge =
    status === 'ACTIVE' ? (
      <Tag icon={<CheckCircleOutlined />} color="success">
        Đang mở
      </Tag>
    ) : (
      <Tag icon={<StopOutlined />} color="default">
        Vô hiệu hóa
      </Tag>
    );

  // Trạng thái thời hạn
  let timeBadge = null;
  if (timeStatus === 'EXPIRED') {
    timeBadge = (
      <Tag icon={<ClockCircleOutlined />} color="error">
        Hết hạn
      </Tag>
    );
  } else if (timeStatus === 'NOT_STARTED') {
    timeBadge = (
      <Tag icon={<ClockCircleOutlined />} color="warning">
        Chưa bắt đầu
      </Tag>
    );
  } else if (timeStatus === 'VALID') {
    timeBadge = (
      <Tag icon={<CheckCircleOutlined />} color="blue">
        Trong hạn
      </Tag>
    );
  }

  // Cảnh báo hết lượt dùng
  let limitBadge = null;
  if (isUsageExceeded) {
    limitBadge = (
      <Tag icon={<ExclamationCircleOutlined />} color="purple">
        Hết lượt dùng
      </Tag>
    );
  }

  return (
    <Space size={4} wrap>
      {adminBadge}
      {timeBadge}
      {limitBadge}
    </Space>
  );
}
