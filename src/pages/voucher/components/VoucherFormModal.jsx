import { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Radio,
  DatePicker,
  Row,
  Col,
  Alert
} from 'antd';
import dayjs from 'dayjs';

const { TextArea } = Input;

export default function VoucherFormModal({
  visible,
  mode, // 'create' | 'edit'
  initialData,
  onCancel,
  onSubmit,
  loading
}) {
  const [form] = Form.useForm();
  const discountType = Form.useWatch('discountType', form);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initialData) {
        form.setFieldsValue({
          code: initialData.code,
          name: initialData.name,
          discountType: initialData.discountType || 'PERCENTAGE',
          discountValue: initialData.discountValue,
          maxDiscountAmount: initialData.maxDiscountAmount,
          minInvoiceAmount: initialData.minInvoiceAmount || 0,
          dateRange: [dayjs(initialData.startDate), dayjs(initialData.endDate)],
          usageLimit: initialData.usageLimit,
          description: initialData.description || ''
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minInvoiceAmount: 0,
          dateRange: [dayjs(), dayjs().add(30, 'day')]
        });
      }
    }
  }, [visible, mode, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        discountType: values.discountType,
        discountValue: values.discountValue,
        minInvoiceAmount: values.minInvoiceAmount || 0,
        maxDiscountAmount:
          values.discountType === 'PERCENTAGE' && values.maxDiscountAmount
            ? values.maxDiscountAmount
            : null,
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
        usageLimit: values.usageLimit || null,
        description: values.description ? values.description.trim() : ''
      };
      onSubmit(payload);
    } catch {
      // Validate error handled by antd
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa voucher' : 'Tạo mới mã voucher'}
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo voucher'}
      cancelText="Hủy bỏ"
      width={680}
      destroyOnClose
      maskClosable={!loading}
    >
      {isEdit && (
        <Alert
          message="Lưu ý: Không thể hạ giới hạn lượt sử dụng thấp hơn số lượt khách hàng đã sử dụng thực tế."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="code"
              label="Mã voucher"
              rules={[
                { required: true, message: 'Vui lòng nhập mã voucher!' },
                {
                  pattern: /^[a-zA-Z0-9_-]{3,50}$/,
                  message: 'Mã gồm 3-50 ký tự chữ, số hoặc gạch nối!'
                }
              ]}
            >
              <Input
                placeholder="Ví dụ: SALE50, TET2026, VIP10"
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="name"
              label="Tên chương trình / Tên voucher"
              rules={[{ required: true, message: 'Vui lòng nhập tên voucher!' }]}
            >
              <Input placeholder="Ví dụ: Giảm giá khai xuân 2026..." />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="discountType"
              label="Hình thức giảm giá"
              rules={[{ required: true }]}
            >
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="PERCENTAGE">Theo phần trăm (%)</Radio.Button>
                <Radio.Button value="FIXED_AMOUNT">Số tiền cố định (đ)</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="discountValue"
              label={
                discountType === 'PERCENTAGE'
                  ? 'Mức giảm (%)'
                  : 'Số tiền giảm (VNĐ)'
              }
              rules={[
                { required: true, message: 'Vui lòng nhập mức giảm!' },
                {
                  type: 'number',
                  min: 1,
                  max: discountType === 'PERCENTAGE' ? 100 : undefined,
                  message:
                    discountType === 'PERCENTAGE'
                      ? 'Mức giảm từ 1% đến 100%!'
                      : 'Mức giảm phải lớn hơn 0!'
                }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={discountType === 'PERCENTAGE' ? 'Ví dụ: 15' : 'Ví dụ: 50000'}
                formatter={(val) =>
                  discountType === 'FIXED_AMOUNT' && val
                    ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                    : val
                }
                parser={(val) => (val ? val.replace(/\$\s?|(,*)/g, '') : '')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="minInvoiceAmount"
              label="Giá trị đơn hàng tối thiểu (VNĐ)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Giá trị đơn tối thiểu không được âm!'
                }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0 (Không yêu cầu tối thiểu)"
                formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                parser={(val) => (val ? val.replace(/\$\s?|(,*)/g, '') : '')}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            {discountType === 'PERCENTAGE' ? (
              <Form.Item
                name="maxDiscountAmount"
                label="Mức giảm tối đa (VNĐ, để trống nếu không giới hạn)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: 100000"
                  min={1}
                  formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                  parser={(val) => (val ? val.replace(/\$\s?|(,*)/g, '') : '')}
                />
              </Form.Item>
            ) : null}
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="dateRange"
              label="Thời gian hiệu lực (Bắt đầu - Kết thúc)"
              rules={[{ required: true, message: 'Vui lòng chọn khoảng thời gian hiệu lực!' }]}
            >
              <DatePicker.RangePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              name="usageLimit"
              label="Giới hạn số lượt dùng"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Trống = Vô hạn"
                min={1}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Mô tả điều kiện & ghi chú">
          <TextArea rows={2} placeholder="Ghi chú áp dụng cho ca đặt sân, giờ vàng, quy định..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
