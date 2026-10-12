import { Tag } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';

export default function ProductStatusBadge({ status }) {
  if (status === 'ACTIVE') {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        Đang bán
      </Tag>
    );
  }

  if (status === 'INACTIVE') {
    return (
      <Tag icon={<StopOutlined />} color="default">
        Ngưng kinh doanh
      </Tag>
    );
  }

  return <Tag color="default">{status || 'Chưa xác định'}</Tag>;
}
