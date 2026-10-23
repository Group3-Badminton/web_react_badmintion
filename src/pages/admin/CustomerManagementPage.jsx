import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Modal, Space, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined, UnlockOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';

const { Title, Text } = Typography;

export default function CustomerManagementPage() {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await userService.getCustomers();
      if (result.success) setCustomers(result.data || []);
    } catch (error) {
      message.error(error?.response?.data?.message || 'Không thể tải danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const loadCustomers = async () => {
      try {
        const result = await userService.getCustomers();
        if (isCurrent && result.success) setCustomers(result.data || []);
      } catch (error) {
        if (isCurrent) {
          message.error(error?.response?.data?.message || 'Không thể tải danh sách khách hàng.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    loadCustomers();
    return () => {
      isCurrent = false;
    };
  }, []);

  const handleUnlock = async (customer) => {
    try {
      setUnlockingId(customer._id);
      const result = await userService.unlockCustomer(customer._id);
      if (result.success) {
        setCustomers((previous) => previous.map((item) =>
          item._id === customer._id ? result.data : item
        ));
        message.success('Mở khóa tài khoản khách hàng thành công.');
      }
    } catch (error) {
      message.error(error?.response?.data?.message || 'Không thể mở khóa tài khoản khách hàng.');
    } finally {
      setUnlockingId(null);
    }
  };

  const showHistory = (customer) => {
    const cancellations = [...(customer.bookingCancellationHistory || [])]
      .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt));
    const lockHistory = [...(customer.accountLockHistory || [])]
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
    Modal.info({
      title: `Lịch sử tài khoản — ${customer.fullName}`,
      width: 700,
      okText: 'Đóng',
      content: (
        <div>
          <Title level={5}>Lịch sử hủy đơn</Title>
          {cancellations.length === 0
            ? <Text type="secondary">Chưa có lịch sử hủy.</Text>
            : cancellations.map((item, index) => (
              <div key={`${item.bookingId}-${item.cancelledAt}-${index}`} style={{ marginBottom: 8 }}>
                #{item.bookingCode || item.bookingId} — {dayjs(item.cancelledAt).format('DD/MM/YYYY HH:mm')}
                {' — '}{item.previousStatus === 'CONFIRMED' ? 'Đã xác nhận' : 'Chờ duyệt'}
                {' — '}{item.scope === 'ITEM' ? 'Hủy một lịch sân' : 'Hủy toàn đơn'}
                {item.countsTowardMonthlyLimit ? ' — Tính vào giới hạn tháng' : ' — Không tính giới hạn'}
              </div>
            ))}
          <Title level={5} style={{ marginTop: 20 }}>Lịch sử khóa/mở khóa</Title>
          {lockHistory.length === 0
            ? <Text type="secondary">Chưa có lịch sử khóa tài khoản.</Text>
            : lockHistory.map((item, index) => (
              <div key={`${item.action}-${item.occurredAt}-${index}`} style={{ marginBottom: 8 }}>
                {item.action === 'LOCKED' ? 'Đã khóa' : 'Đã mở khóa'}
                {' — '}{dayjs(item.occurredAt).format('DD/MM/YYYY HH:mm')}
                {item.reason ? ` — ${item.reason}` : ''}
              </div>
            ))}
        </div>
      )
    });
  };

  const columns = [
    {
      title: 'Khách hàng',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (name, customer) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary">{customer.email || customer.phone || '—'}</Text>
        </Space>
      )
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '—'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : status === 'LOCKED' ? 'red' : 'default'}>
          {status === 'ACTIVE' ? 'Đang hoạt động' : status === 'LOCKED' ? 'Đã khóa' : status}
        </Tag>
      )
    },
    {
      title: 'Lý do khóa',
      dataIndex: 'lockReason',
      key: 'lockReason',
      render: (reason, customer) => customer.status === 'LOCKED' ? (reason || 'Không có thông tin') : '—'
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, customer) => (
        <Space>
          <Button icon={<HistoryOutlined />} onClick={() => showHistory(customer)}>
            Lịch sử
          </Button>
          {isAdmin && customer.status === 'LOCKED' && (
            <Button
              type="primary"
              icon={<UnlockOutlined />}
              loading={unlockingId === customer._id}
              onClick={() => Modal.confirm({
                title: 'Mở khóa tài khoản khách hàng?',
                content: `${customer.fullName} có thể tiếp tục sử dụng tài khoản sau khi mở khóa.`,
                okText: 'Mở khóa',
                cancelText: 'Quay lại',
                onOk: () => handleUnlock(customer)
              })}
            >
              Mở khóa
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>Quản lý khách hàng</Title>
              <Text type="secondary">Theo dõi trạng thái tài khoản, lịch sử hủy và hỗ trợ mở khóa.</Text>
            </div>
            <Button icon={<ReloadOutlined />} onClick={fetchCustomers} loading={loading}>Tải lại</Button>
          </Space>
          <Alert
            type="info"
            showIcon
            message="Khách hàng bị tạm khóa do đạt giới hạn hủy chỉ được sử dụng lại tài khoản sau khi Admin mở khóa."
          />
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={customers}
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            locale={{ emptyText: 'Chưa có khách hàng.' }}
          />
        </Space>
      </Card>
    </div>
  );
}
