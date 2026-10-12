import { Modal, Typography, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function DeactivateProductDialog({
  visible,
  product,
  onCancel,
  onConfirm,
  loading
}) {
  if (!product) return null;

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Xác nhận vô hiệu hóa sản phẩm
        </span>
      }
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Vô hiệu hóa"
      okButtonProps={{ danger: true }}
      cancelText="Hủy bỏ"
      maskClosable={!loading}
    >
      <Alert
        message="Hành động này sẽ chuyển trạng thái sản phẩm sang Ngưng kinh doanh (INACTIVE)."
        description="Dữ liệu, số lượng tồn kho và toàn bộ lịch sử bán hàng/nhập kho trước đây vẫn được giữ nguyên đầy đủ."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <p>
        Bạn có chắc chắn muốn ngưng kinh doanh sản phẩm{' '}
        <Text strong style={{ color: '#ff4d4f' }}>
          &ldquo;{product.name}&rdquo;
        </Text>
        ?
      </p>
    </Modal>
  );
}
