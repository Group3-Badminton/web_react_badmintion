import { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Select, InputNumber, Button, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

const { Option } = Select;

export default function ProductFilters({ filters, onFilterChange, onReset }) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== (filters.search || '')) {
        onFilterChange({ search: searchTerm });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm, filters.search, onFilterChange]);

  const handlePriceRangeChange = (type, val) => {
    onFilterChange({ [type]: val !== null ? val : '' });
  };

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
        {/* Tìm kiếm theo tên */}
        <Col xs={24} sm={12} md={7}>
          <Input
            placeholder="Tìm theo tên sản phẩm..."
            prefix={<SearchOutlined style={{ color: '#aaa' }} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </Col>

        {/* Lọc trạng thái kinh doanh */}
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Trạng thái"
            value={filters.status || undefined}
            onChange={(val) => onFilterChange({ status: val || '' })}
            allowClear
          >
            <Option value="ACTIVE">Đang bán</Option>
            <Option value="INACTIVE">Ngưng bán</Option>
          </Select>
        </Col>

        {/* Lọc tình trạng tồn kho */}
        <Col xs={12} sm={6} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="Tình trạng kho"
            value={filters.stockStatus || undefined}
            onChange={(val) => onFilterChange({ stockStatus: val || '' })}
            allowClear
          >
            <Option value="IN_STOCK">Còn hàng (&gt; 0)</Option>
            <Option value="OUT_OF_STOCK">Hết hàng (0)</Option>
          </Select>
        </Col>

        {/* Khoảng giá Min - Max */}
        <Col xs={24} sm={12} md={6}>
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              style={{ width: '50%' }}
              placeholder="Giá từ"
              min={0}
              step={5000}
              formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
              parser={(v) => (v ? v.replace(/\$\s?|(,*)/g, '') : '')}
              value={filters.minPrice !== '' && filters.minPrice !== undefined ? Number(filters.minPrice) : null}
              onChange={(val) => handlePriceRangeChange('minPrice', val)}
            />
            <InputNumber
              style={{ width: '50%' }}
              placeholder="Đến giá"
              min={0}
              step={5000}
              formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
              parser={(v) => (v ? v.replace(/\$\s?|(,*)/g, '') : '')}
              value={filters.maxPrice !== '' && filters.maxPrice !== undefined ? Number(filters.maxPrice) : null}
              onChange={(val) => handlePriceRangeChange('maxPrice', val)}
            />
          </Space.Compact>
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
