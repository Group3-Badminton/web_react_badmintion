import React from 'react';
import { Card, Typography, Button, Result } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

export default function CustomerBookingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 20px' }}>
        <Result
          icon={<ThunderboltOutlined style={{ color: '#009B60', fontSize: 64 }} />}
          title="Trang Đặt Sân Online"
          subTitle="Tính năng chọn sân, chọn khung giờ theo ngày và thanh toán trực tuyến sẽ được kết nối ở bước tiếp theo!"
          extra={[
            <Button type="primary" key="home" onClick={() => navigate('/')} style={{ background: '#009B60' }}>
              Về Trang Chủ
            </Button>
          ]}
        />
      </Card>
    </div>
  );
}
