import { Modal, Typography, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function DeactivateVoucherDialog({
  visible,
  voucher,
  onCancel,
  onConfirm,
  loading
}) {
  if (!voucher) return null;

  return (
    <Modal
      title={
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Xác nhận vô hiệu hóa voucher
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
        message="Hành động này sẽ ngăn chặn mã voucher được áp dụng vào bất kỳ đơn đặt sân hoặc giao dịch mới nào."
        description="Toàn bộ lịch sử các giao dịch, hóa đơn hoặc booking đã áp dụng voucher này trước đây vẫn được bảo toàn nguyên vẹn."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <p>
        Bạn có chắc chắn muốn vô hiệu hóa mã voucher{' '}
        <Text strong style={{ color: '#ff4d4f' }}>
          &ldquo;{voucher.code}&rdquo;
        </Text>{' '}
        ({voucher.name})?
      </p>
    </Modal>
  );
}
