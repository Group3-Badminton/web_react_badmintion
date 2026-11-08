import { useEffect } from 'react';
import { Modal, Form, InputNumber, Input, Typography, Descriptions, Alert } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

export default function StockInModal({
  visible,
  product,
  onCancel,
  onSubmit,
  loading
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && product) {
      form.resetFields();
      form.setFieldsValue({
        quantity: 1,
        costPrice: 0,
        note: ''
      });
    }
  }, [visible, product, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // Form validation error caught by antd
    }
  };

  if (!product) return null;

  return (
    <Modal
      title={
        <span>
          <InboxOutlined style={{ color: '#52c41a', marginRight: 8 }} />
          Nhập kho sản phẩm
        </span>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Xác nhận nhập kho"
      cancelText="Hủy bỏ"
      destroyOnClose
      maskClosable={!loading}
      style={{ maxWidth: '95vw', top: 20 }}
    >
      <Descriptions size="small" column={1} bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Sản phẩm">
          <Text strong>{product.name}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Tồn kho hiện tại">
          <Text strong style={{ color: '#1890ff', fontSize: 15 }}>
            {product.stockQuantity || 0} {product.unit || 'cái'}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      {product.status === 'INACTIVE' && (
        <Alert
          message="Sản phẩm đang ngưng kinh doanh! Không thể thực hiện nhập hàng."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" disabled={product.status === 'INACTIVE'}>
        <Form.Item
          name="quantity"
          label="Số lượng nhập"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng!' },
            {
              type: 'integer',
              min: 1,
              message: 'Số lượng nhập phải là số nguyên lớn hơn hoặc bằng 1!'
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            step={1}
            placeholder="Nhập số lượng thực tế..."
          />
        </Form.Item>

        <Form.Item
          name="costPrice"
          label="Giá vốn / Giá nhập (VNĐ)"
          rules={[
            {
              type: 'number',
              min: 0,
              message: 'Giá vốn không được âm!'
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={1000}
            placeholder="Giá nhập trên từng đơn vị..."
            formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            parser={(val) => (val ? val.replace(/\$\s?|(,*)/g, '') : '')}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú nhập kho">
          <TextArea rows={2} placeholder="Nguồn nhập, số lô hàng, lý do bổ sung kho..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
