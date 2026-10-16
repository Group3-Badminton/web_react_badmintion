import { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Select, Button, DatePicker } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

export default function VoucherFilters({ filters, onFilterChange, onReset }) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Debounce tìm kiếm (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        onFilterChange({ search: searchTerm });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm, filters.search, onFilterChange]);

  const handleDateRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) {
      onFilterChange({
        startDateFrom: dates[0].startOf('day').toISOString(),
        endDateTo: dates[1].endOf('day').toISOString()
      });
    } else {
      onFilterChange({
        startDateFrom: '',
        endDateTo: ''
      });
    }
  };

  const dateValue =
    filters.startDateFrom && filters.endDateTo
      ? [dayjs(filters.startDateFrom), dayjs(filters.endDateTo)]
      : null;

  return (
    <Card
      style={{
        marginBottom: 20,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Row gutter={[16, 16]} align="middle">
        {/* Tìm kiếm theo mã hoặc tên */}
        <Col xs={24} sm={12} md={7}>
          <Input
            placeholder="Tìm theo mã voucher hoặc tên..."
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </Col>

        {/* Lọc trạng thái quản trị */}
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Trạng thái mở"
            value={filters.status || undefined}
            onChange={(val) => onFilterChange({ status: val || '' })}
            allowClear
          >
            <Option value="ACTIVE">Đang mở (ACTIVE)</Option>
            <Option value="INACTIVE">Vô hiệu hóa (INACTIVE)</Option>
          </Select>
        </Col>

        {/* Lọc trạng thái hiệu lực thời gian */}
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Thời hạn hiệu lực"
            value={filters.validityStatus || undefined}
            onChange={(val) => onFilterChange({ validityStatus: val || '' })}
            allowClear
          >
            <Option value="VALID">Đang hiệu lực (Trong hạn)</Option>
            <Option value="EXPIRED">Đã hết hạn</Option>
            <Option value="NOT_STARTED">Chưa đến ngày bắt đầu</Option>
          </Select>
        </Col>

        {/* Khoảng ngày hiệu lực */}
        <Col xs={24} sm={12} md={6}>
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['Từ ngày', 'Đến ngày']}
            format="DD/MM/YYYY"
            value={dateValue}
            onChange={handleDateRangeChange}
          />
        </Col>

        {/* Nút đặt lại */}
        <Col xs={24} sm={12} md={3} style={{ textAlign: 'right' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setSearchTerm('');
              onReset();
            }}
            style={{ width: '100%' }}
          >
            Đặt lại
          </Button>
        </Col>
      </Row>
    </Card>
  );
}
