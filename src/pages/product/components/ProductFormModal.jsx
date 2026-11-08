import { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Alert, Row, Col } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

export default function ProductFormModal({
  visible,
  mode, // 'create' | 'edit'
  initialData,
  onCancel,
  onSubmit,
  loading
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initialData) {
        form.setFieldsValue({
          name: initialData.name,
          price: initialData.price,
          unit: initialData.unit || 'cái',
          category: initialData.category || 'GENERAL',
          description: initialData.description || ''
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          unit: 'cái',
          category: 'GENERAL'
        });
      }
    }
  }, [visible, mode, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch {
      // Form validation error caught by antd
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
      cancelText="Hủy bỏ"
      destroyOnClose
      maskClosable={!loading}
      style={{ maxWidth: '95vw', top: 20 }}
    >
      {isEdit && (
        <Alert
          message="Lưu ý: Tồn kho không thể sửa trực tiếp tại đây. Vui lòng sử dụng tính năng Nhập kho (Stock In)."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Tên sản phẩm"
          rules={[
            { required: true, message: 'Vui lòng nhập tên sản phẩm!' },
            {
              validator: (_, value) => {
                if (value && !value.trim()) {
                  return Promise.reject(new Error('Tên sản phẩm không được chỉ chứa khoảng trắng!'));
                }
                if (value && value.trim().length > 200) {
                  return Promise.reject(new Error('Tên sản phẩm không quá 200 ký tự!'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <Input placeholder="Ví dụ: Nước tăng lực Redbull, Quả cầu lông Yonex AS-40..." />
        </Form.Item>

        <Form.Item
          name="price"
          label="Giá bán (VNĐ)"
          rules={[
            { required: true, message: 'Vui lòng nhập giá bán!' },
            {
              type: 'number',
              min: 0,
              message: 'Giá bán phải lớn hơn hoặc bằng 0!'
            }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={1000}
            placeholder="Ví dụ: 15000"
            formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
            parser={(val) => (val ? val.replace(/\$\s?|(,*)/g, '') : '')}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="unit"
              label="Đơn vị tính"
              rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập đơn vị tính!' }]}
            >
              <Select placeholder="Chọn đơn vị tính">
                <Option value="cái">cái</Option>
                <Option value="lon">lon</Option>
                <Option value="chai">chai</Option>
                <Option value="ống">ống</Option>
                <Option value="hộp">hộp</Option>
                <Option value="đôi">đôi</Option>
                <Option value="gói">gói</Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="category"
              label="Phân loại"
            >
              <Select placeholder="Chọn nhóm">
                <Option value="DRINK">Nước giải khát</Option>
                <Option value="SNACK">Đồ ăn nhẹ</Option>
                <Option value="SHUTTLECOCK">Quả cầu lông</Option>
                <Option value="RACKET">Vợt cầu lông</Option>
                <Option value="ACCESSORY">Phụ kiện & Quấn cán</Option>
                <Option value="GENERAL">Khác / Tổng hợp</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Mô tả chi tiết">
          <TextArea rows={3} placeholder="Thông số, quy cách đóng gói, xuất xứ hoặc ghi chú sản phẩm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
