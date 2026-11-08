import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Input,
  InputNumber,
  Button,
  Tag,
  Typography,
  Space,
  Table,
  Radio,
  Divider,
  message,
  Modal,
  Alert,
  Spin,
  Empty,
  Badge,
  Select
} from 'antd';
import {
  ShoppingCartOutlined,
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  ClearOutlined,
  TagOutlined,
  CoffeeOutlined,
  AppstoreOutlined,
  ShopOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { productService } from '../../services/productService';
import { invoiceService } from '../../services/invoiceService';
import sessionService from '../../services/sessionService';

const { Title, Text } = Typography;

export default function PosPaymentPage() {
  const [searchParams] = useSearchParams();
  const paramSessionId = searchParams.get('sessionId');

  const [saleMode, setSaleMode] = useState(paramSessionId ? 'PLAYING_SESSION' : 'RETAIL');
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(paramSessionId || null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [submittingSessionItems, setSubmittingSessionItems] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState('Khách lẻ');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [note, setNote] = useState('');

  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [settledInvoice, setSettledInvoice] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchActiveSessions();
  }, []);

  useEffect(() => {
    if (paramSessionId) {
      setSaleMode('PLAYING_SESSION');
      setSelectedSessionId(paramSessionId);
    }
  }, [paramSessionId]);

  const fetchActiveSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await sessionService.getLiveBoard();
      const courts = res?.data || res || [];
      const inProgress = courts.filter(
        (c) => (c.activeSession || c.currentSession) && (c.activeSession || c.currentSession).status === 'IN_PROGRESS'
      );
      setActiveSessions(inProgress);
      if (inProgress.length > 0 && !selectedSessionId && !paramSessionId) {
        setSelectedSessionId((inProgress[0].activeSession || inProgress[0].currentSession)._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await productService.getProducts({
        status: 'ACTIVE',
        limit: 100
      });
      const list = res?.data?.items || res?.items || res?.data?.products || res?.products || (Array.isArray(res?.data) ? res.data : []);
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoadingProducts(false);
    }
  };

  const CATEGORY_MAP = {
    ALL: 'Tất cả',
    RENTAL: 'Thuê vợt',
    EQUIPMENT: 'Dụng cụ & Cầu',
    ACCESSORY: 'Phụ kiện',
    DRINK: 'Nước uống',
    FOOD: 'Đồ ăn'
  };

  const CATEGORY_COLORS = {
    RENTAL: 'purple',
    EQUIPMENT: 'blue',
    ACCESSORY: 'orange',
    DRINK: 'cyan',
    FOOD: 'green'
  };

  const getCategoryLabel = (cat) => CATEGORY_MAP[cat] || cat;
  const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || 'blue';

  const categories = [
    'ALL',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
  ];

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory =
      selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const addToCart = (product) => {
    if (product.stockQuantity <= 0) {
      message.warning(`Sản phẩm "${product.name}" đã hết hàng trong kho!`);
      return;
    }

    const existingIndex = cartItems.findIndex((it) => it.productId === product._id);
    if (existingIndex > -1) {
      const currentQty = cartItems[existingIndex].quantity;
      if (currentQty + 1 > product.stockQuantity) {
        message.warning(`Số lượng vượt quá tồn kho hiện có (${product.stockQuantity} ${product.unit || 'cái'})!`);
        return;
      }
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      setCartItems(updated);
    } else {
      setCartItems([
        ...cartItems,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          unit: product.unit || 'cái',
          stockQuantity: product.stockQuantity,
          quantity: 1
        }
      ]);
    }
  };

  const updateQuantity = (productId, delta) => {
    const item = cartItems.find((it) => it.productId === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQty > item.stockQuantity) {
      message.warning(`Chỉ còn ${item.stockQuantity} ${item.unit} trong kho!`);
      return;
    }

    setCartItems(
      cartItems.map((it) => (it.productId === productId ? { ...it, quantity: newQty } : it))
    );
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter((it) => it.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherCodeInput('');
    setCashReceived('');
    setTransactionReference('');
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const numCashReceived = Number(cashReceived) || 0;
  const changeAmount = paymentMethod === 'CASH' && numCashReceived >= finalTotal ? numCashReceived - finalTotal : 0;
  const isCashInsufficient = paymentMethod === 'CASH' && cashReceived !== '' && numCashReceived < finalTotal;

  const handleApplyVoucher = async () => {
    if (!voucherCodeInput.trim()) {
      message.warning('Vui lòng nhập mã giảm giá!');
      return;
    }
    if (subtotal <= 0) {
      message.warning('Vui lòng thêm sản phẩm vào giỏ hàng trước khi áp dụng mã giảm giá!');
      return;
    }

    setValidatingVoucher(true);
    try {
      const res = await invoiceService.validateVoucher({
        code: voucherCodeInput.trim(),
        orderAmount: subtotal
      });
      const data = res?.data || res;
      setAppliedVoucher(data.voucher);
      setDiscountAmount(data.discountAmount || 0);
      message.success(res?.message || 'Áp dụng mã giảm giá thành công!');
    } catch (err) {
      message.error(err.response?.data?.message || 'Mã giảm giá không hợp lệ!');
      setAppliedVoucher(null);
      setDiscountAmount(0);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherCodeInput('');
    message.info('Đã hủy áp dụng mã giảm giá.');
  };

  const handleQuickCash = (amount) => {
    setCashReceived(String(amount));
  };

  const handleSubmitPayment = async () => {
    if (cartItems.length === 0) {
      message.warning('Giỏ hàng đang trống!');
      return;
    }

    if (paymentMethod === 'CASH') {
      if (!cashReceived || numCashReceived < finalTotal) {
        message.error('Số tiền khách đưa không được nhỏ hơn tổng số tiền cần thanh toán!');
        return;
      }
    }

    setSubmittingPayment(true);
    try {
      const payload = {
        items: cartItems.map((it) => ({
          productId: it.productId,
          productName: it.name,
          quantity: it.quantity
        })),
        customerName: customerName.trim() || 'Khách lẻ',
        customerPhone: customerPhone.trim(),
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? numCashReceived : finalTotal,
        transactionReference: paymentMethod === 'TRANSFER' ? transactionReference.trim() : '',
        voucherCode: appliedVoucher?.code || '',
        note: note.trim()
      };

      const res = await invoiceService.createPosPayment(payload);
      const created = res?.data || res;
      setSettledInvoice(created);
      setReceiptModalVisible(true);
      message.success('Thanh toán đơn hàng POS thành công!');
      clearCart();
      fetchProducts();
    } catch (err) {
      message.error(err.response?.data?.message || 'Thanh toán thất bại!');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleAddToActiveSession = async () => {
    if (cartItems.length === 0) {
      message.warning('Giỏ hàng đang trống!');
      return;
    }
    if (!selectedSessionId) {
      message.warning('Vui lòng chọn ca chơi / sân đang diễn ra!');
      return;
    }

    setSubmittingSessionItems(true);
    try {
      const payload = {
        items: cartItems.map((it) => ({
          productId: it.productId,
          productName: it.name,
          quantity: it.quantity,
          unitPrice: it.price
        }))
      };

      await sessionService.addRentalItem(selectedSessionId, payload);
      const targetCourt = activeSessions.find(
        (c) => (c.activeSession || c.currentSession)?._id === selectedSessionId
      );
      const courtName = targetCourt ? targetCourt.name : 'sân';
      message.success(`Đã thêm ${cartItems.length} mặt hàng vào ca chơi ${courtName}! Tiền sẽ được thanh toán chung khi khách trả sân.`);
      clearCart();
      fetchProducts();
      fetchActiveSessions();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể thêm sản phẩm vào ca chơi!');
    } finally {
      setSubmittingSessionItems(false);
    }
  };

  const selectedCourtSession = activeSessions.find(
    (c) => (c.activeSession || c.currentSession)?._id === selectedSessionId
  );

  const qrUrl = `https://img.vietqr.io/image/MB-0382379374-compact2.png?amount=${finalTotal}&addInfo=${encodeURIComponent(`POS BCMS ${customerPhone || ''}`)}&accountName=SAN%20CAU%20LONG%20BCMS`;

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, color: '#111827' }}>
          <ShoppingCartOutlined style={{ marginRight: 8, color: '#009B60' }} />
          Bán Hàng POS & Bán Lẻ Tại Quầy
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Bán nước uống, cầu lông, phụ kiện thể thao; tự động kiểm tra trừ tồn kho và xuất hóa đơn thanh toán
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={15}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minHeight: 620 }}
          >
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <Input
                placeholder="Tìm sản phẩm theo tên hoặc danh mục..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                style={{ flex: 1, minWidth: 220 }}
              />
              <Radio.Group
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                buttonStyle="solid"
              >
                {categories.map((c) => (
                  <Radio.Button key={c} value={c}>
                    {getCategoryLabel(c)}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </div>

            {loadingProducts ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <Empty description="Không tìm thấy sản phẩm nào" style={{ margin: '60px 0' }} />
            ) : (
              <Row gutter={[12, 12]} style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
                {filteredProducts.map((p) => {
                  const inCart = cartItems.find((it) => it.productId === p._id);
                  const isOutOfStock = p.stockQuantity <= 0;

                  return (
                    <Col xs={12} sm={8} md={6} key={p._id}>
                      <Card
                        hoverable={!isOutOfStock}
                        onClick={() => !isOutOfStock && addToCart(p)}
                        style={{
                          borderRadius: 10,
                          borderColor: inCart ? '#009B60' : '#e2e8f0',
                          background: isOutOfStock ? '#f8fafc' : '#ffffff',
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          opacity: isOutOfStock ? 0.6 : 1,
                          transition: 'all 0.2s',
                          boxShadow: inCart ? '0 0 0 2px rgba(0, 155, 96, 0.2)' : 'none',
                          height: '100%'
                        }}
                        bodyStyle={{
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          height: '100%'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Tag
                              color={getCategoryColor(p.category)}
                              style={{ margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 5px', fontWeight: 600, border: 'none' }}
                            >
                              {getCategoryLabel(p.category)}
                            </Tag>
                            <Tag
                              color={isOutOfStock ? 'error' : p.stockQuantity < 5 ? 'warning' : 'success'}
                              style={{ margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 5px', fontWeight: 700 }}
                            >
                              {isOutOfStock ? 'Hết hàng' : `Còn: ${p.stockQuantity}`}
                            </Tag>
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: isOutOfStock ? '#94a3b8' : '#1e293b',
                              lineHeight: '18px',
                              minHeight: 36,
                              marginBottom: 4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                            title={p.name}
                          >
                            {p.name}
                          </div>

                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                            ĐVT: {p.unit || 'cái'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px dashed #f1f5f9' }}>
                          <div style={{ fontWeight: 800, color: isOutOfStock ? '#94a3b8' : '#009B60', fontSize: 14 }}>
                            {(p.price || 0).toLocaleString('vi-VN')} đ
                          </div>
                          <Button
                            type={inCart ? 'primary' : 'default'}
                            size="small"
                            shape="circle"
                            icon={<PlusOutlined />}
                            disabled={isOutOfStock}
                            style={{
                              background: inCart ? '#009B60' : undefined,
                              borderColor: inCart ? '#009B60' : undefined
                            }}
                          />
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minHeight: 620 }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>
                  <ShoppingCartOutlined style={{ marginRight: 6, color: '#009B60' }} />
                  Giỏ Hàng ({cartItems.reduce((acc, it) => acc + it.quantity, 0)})
                </span>
                {cartItems.length > 0 && (
                  <Button type="link" danger size="small" icon={<ClearOutlined />} onClick={clearCart}>
                    Xóa giỏ
                  </Button>
                )}
              </div>
            }
          >
            <div style={{ marginBottom: 14 }}>
              <Radio.Group
                value={saleMode}
                onChange={(e) => setSaleMode(e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%', display: 'flex' }}
              >
                <Radio.Button
                  value="RETAIL"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: 13,
                    padding: '0 8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <ShopOutlined style={{ marginRight: 5 }} />
                  Khách Lẻ Tại Quầy
                </Radio.Button>
                <Radio.Button
                  value="PLAYING_SESSION"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: 13,
                    padding: '0 8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <AppstoreOutlined style={{ marginRight: 5 }} />
                  Tính Vào Ca Chơi
                </Radio.Button>
              </Radio.Group>
            </div>

            {saleMode === 'PLAYING_SESSION' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontWeight: 700, color: '#166534', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span><CoffeeOutlined style={{ marginRight: 6 }} /> Chọn sân đang chơi:</span>
                  <Button
                    type="link"
                    size="small"
                    icon={<SyncOutlined spin={loadingSessions} />}
                    onClick={fetchActiveSessions}
                    style={{ padding: 0, height: 'auto', color: '#15803d' }}
                  >
                    Làm mới ca
                  </Button>
                </div>
                {activeSessions.length === 0 ? (
                  <Alert
                    type="warning"
                    message="Hiện tại không có ca chơi nào đang hoạt động"
                    description="Chưa có sân nào đang chơi. Bạn có thể chọn 'Khách Lẻ Tại Quầy' để thanh toán trực tiếp."
                    showIcon
                  />
                ) : (
                  <>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Chọn sân đang thi đấu..."
                      value={selectedSessionId}
                      onChange={(val) => setSelectedSessionId(val)}
                      options={activeSessions.map((c) => {
                        const sess = c.activeSession || c.currentSession;
                        const custName = sess?.customerDisplayName || sess?.bookingId?.customerId?.fullName || sess?.bookingId?.customerName || 'Khách chơi';
                        const custPhone = sess?.customerDisplayPhone || sess?.bookingId?.customerId?.phone || sess?.bookingId?.customerPhone || '';
                        return {
                          value: sess?._id,
                          label: `${c.name} - ${custName}${custPhone ? ` (${custPhone})` : ''}`
                        };
                      })}
                    />
                    {selectedCourtSession && (
                      <div style={{ marginTop: 8, background: '#ffffff', padding: '8px 10px', borderRadius: 6, border: '1px solid #dcfce7', fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ color: '#64748b' }}>Sân đang chơi:</span>
                          <b style={{ color: '#009B60' }}>{selectedCourtSession.name}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ color: '#64748b' }}>Khách hàng:</span>
                          <span>{(selectedCourtSession.activeSession || selectedCourtSession.currentSession)?.customerDisplayName || (selectedCourtSession.activeSession || selectedCourtSession.currentSession)?.bookingId?.customerId?.fullName || 'Khách chơi'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748b' }}>Tiền ca hiện tại:</span>
                          <b>{((selectedCourtSession.activeSession || selectedCourtSession.currentSession)?.totalAmount || 0).toLocaleString('vi-VN')} đ</b>
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
                      💡 Tiền hàng sẽ được ghi trực tiếp vào đơn của ca chơi này và thanh toán chung khi khách trả sân.
                    </div>
                  </>
                )}
              </div>
            )}

            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <ShoppingCartOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }} />
                <div>Chưa có sản phẩm nào trong giỏ hàng.</div>
                <div style={{ fontSize: 12 }}>Bấm vào sản phẩm bên trái để thêm vào đơn.</div>
              </div>
            ) : (
              <div>
                <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 16, paddingRight: 4 }}>
                  {cartItems.map((item) => (
                    <div
                      key={item.productId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {item.price.toLocaleString('vi-VN')} đ / {item.unit}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<MinusOutlined />}
                          onClick={() => updateQuantity(item.productId, -1)}
                        />
                        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                        <Button
                          size="small"
                          shape="circle"
                          icon={<PlusOutlined />}
                          onClick={() => updateQuantity(item.productId, 1)}
                        />
                      </div>

                      <div style={{ width: 85, textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                        {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                      </div>

                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{ marginLeft: 4 }}
                        onClick={() => removeFromCart(item.productId)}
                      />
                    </div>
                  ))}
                </div>

                {saleMode === 'PLAYING_SESSION' ? (
                  <div>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                        <Text type="secondary">Tổng tiền hàng thêm vào ca:</Text>
                        <Text strong style={{ fontSize: 18, color: '#009B60' }}>
                          {subtotal.toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>

                    <Button
                      type="primary"
                      size="large"
                      block
                      icon={<PlusOutlined />}
                      loading={submittingSessionItems}
                      onClick={handleAddToActiveSession}
                      disabled={cartItems.length === 0 || !selectedSessionId}
                      style={{
                        background: '#009B60',
                        borderColor: '#009B60',
                        height: 48,
                        fontSize: 15,
                        fontWeight: 700
                      }}
                    >
                      Ghi Vào Ca Chơi (Tính Chung Hóa Đơn Trả Sân)
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14 }}>
                      <Row gutter={8} style={{ marginBottom: 8 }}>
                        <Col span={14}>
                          <Input
                            size="small"
                            placeholder="Mã voucher..."
                            value={voucherCodeInput}
                            onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                            disabled={Boolean(appliedVoucher)}
                            prefix={<TagOutlined style={{ color: '#009B60' }} />}
                          />
                        </Col>
                        <Col span={10}>
                          {appliedVoucher ? (
                            <Button size="small" danger block onClick={handleRemoveVoucher}>
                              Hủy mã
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              type="primary"
                              block
                              loading={validatingVoucher}
                              onClick={handleApplyVoucher}
                              style={{ background: '#009B60', borderColor: '#009B60' }}
                            >
                              Áp dụng
                            </Button>
                          )}
                        </Col>
                      </Row>

                      {appliedVoucher && (
                        <div style={{ fontSize: 11, color: '#059669', marginBottom: 6 }}>
                          ✓ Đã áp dụng <b>{appliedVoucher.code}</b> ({appliedVoucher.name})
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <Text type="secondary">Tạm tính:</Text>
                        <Text strong>{subtotal.toLocaleString('vi-VN')} đ</Text>
                      </div>
                      {discountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <Text style={{ color: '#ea580c' }}>Giảm giá voucher:</Text>
                          <Text strong style={{ color: '#ea580c' }}>- {discountAmount.toLocaleString('vi-VN')} đ</Text>
                        </div>
                      )}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: 14 }}>Tổng thanh toán:</Text>
                        <Text style={{ fontSize: 20, fontWeight: 800, color: '#009B60' }}>
                          {finalTotal.toLocaleString('vi-VN')} đ
                        </Text>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Input
                            size="small"
                            placeholder="Tên khách (tùy chọn)"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                          />
                        </Col>
                        <Col span={12}>
                          <Input
                            size="small"
                            placeholder="Số điện thoại"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                          />
                        </Col>
                      </Row>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        Phương thức thanh toán:
                      </Text>
                      <Radio.Group
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        buttonStyle="solid"
                        style={{ width: '100%', display: 'flex' }}
                      >
                        <Radio.Button value="CASH" style={{ flex: 1, textAlign: 'center' }}>
                          <DollarOutlined /> Tiền mặt
                        </Radio.Button>
                        <Radio.Button value="TRANSFER" style={{ flex: 1, textAlign: 'center' }}>
                          <QrcodeOutlined /> Chuyển khoản QR
                        </Radio.Button>
                      </Radio.Group>
                    </div>

                    {paymentMethod === 'CASH' ? (
                      <div style={{ marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: 600 }}>Tiền khách đưa:</Text>
                          {isCashInsufficient && (
                            <Text type="danger" style={{ fontSize: 11 }}>Khách đưa thiếu tiền!</Text>
                          )}
                        </div>
                        <InputNumber
                          style={{ width: '100%', fontSize: 16, fontWeight: 700, marginBottom: 8 }}
                          value={cashReceived}
                          onChange={(val) => setCashReceived(val || 0)}
                          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                          placeholder="Nhập số tiền khách đưa..."
                          addonAfter="đ"
                          size="large"
                          status={isCashInsufficient ? 'error' : ''}
                        />
                        <Space size={6} wrap style={{ marginBottom: 10 }}>
                          {[finalTotal, 50000, 100000, 200000, 500000].map((amt, idx) => (
                            <Button
                              key={idx}
                              size="small"
                              onClick={() => handleQuickCash(amt)}
                              style={{ fontSize: 12 }}
                            >
                              {amt === finalTotal ? `Đủ tiền (${amt.toLocaleString('vi-VN')} đ)` : `${amt.toLocaleString('vi-VN')} đ`}
                            </Button>
                          ))}
                        </Space>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                          <span style={{ fontWeight: 600 }}>Tiền thừa trả khách:</span>
                          <span style={{ fontWeight: 800, color: changeAmount > 0 ? '#2563eb' : '#059669', fontSize: 16 }}>
                            {changeAmount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 14, textAlign: 'center', background: '#f8fafc', padding: 14, borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                          Quét mã QR qua ngân hàng để thanh toán:
                        </div>
                        <img
                          src={qrUrl}
                          alt="VietQR"
                          style={{ maxWidth: 180, borderRadius: 8, border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    )}

                    <Button
                      type="primary"
                      size="large"
                      block
                      icon={<CheckCircleOutlined />}
                      loading={submittingPayment}
                      onClick={handleSubmitPayment}
                      style={{
                        background: '#009B60',
                        borderColor: '#009B60',
                        height: 46,
                        fontSize: 16,
                        fontWeight: 700
                      }}
                    >
                      Xác Nhận Thanh Toán POS ({finalTotal.toLocaleString('vi-VN')} đ)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#009B60' }}>
            <CheckCircleOutlined />
            <span>Thanh Toán Thành Công & Hóa Đơn Bán Lẻ</span>
          </div>
        }
        open={receiptModalVisible}
        onCancel={() => setReceiptModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setReceiptModalVisible(false)}>
            Đóng
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            style={{ background: '#009B60', borderColor: '#009B60' }}
          >
            In hóa đơn
          </Button>
        ]}
        width={500}
      >
        {settledInvoice && (
          <div style={{ padding: '8px 0', fontSize: 13 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0, color: '#009B60' }}>HÓA ĐƠN BÁN LẺ POS</Title>
              <Text type="secondary">Mã HĐ: {settledInvoice.invoiceCode}</Text>
              <div>Thời gian: {new Date(settledInvoice.paidAt || settledInvoice.createdAt).toLocaleString('vi-VN')}</div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ marginBottom: 12 }}>
              <div><b>Khách hàng:</b> {settledInvoice.customer?.fullName || 'Khách lẻ'}</div>
              {settledInvoice.customer?.phone && <div><b>Số điện thoại:</b> {settledInvoice.customer.phone}</div>}
              <div><b>Phương thức:</b> {settledInvoice.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VietQR'}</div>
            </div>

            <Table
              dataSource={settledInvoice.items || []}
              rowKey={(r, i) => i}
              pagination={false}
              size="small"
              columns={[
                { title: 'Tên SP', dataIndex: 'productName', key: 'productName' },
                { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 45, align: 'center' },
                {
                  title: 'Đơn giá',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  align: 'right',
                  render: (v) => (v || 0).toLocaleString('vi-VN')
                },
                {
                  title: 'Thành tiền',
                  dataIndex: 'subtotal',
                  key: 'subtotal',
                  align: 'right',
                  render: (v) => <b>{(v || 0).toLocaleString('vi-VN')}</b>
                }
              ]}
            />

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Tạm tính:</span>
              <span>{(settledInvoice.subtotal || 0).toLocaleString('vi-VN')} đ</span>
            </div>
            {settledInvoice.discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ea580c', marginBottom: 4 }}>
                <span>Giảm giá ({settledInvoice.voucherCode}):</span>
                <span>- {(settledInvoice.discountAmount || 0).toLocaleString('vi-VN')} đ</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, color: '#009B60', marginBottom: 6 }}>
              <span>Tổng thanh toán:</span>
              <span>{(settledInvoice.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
            </div>

            {settledInvoice.paymentMethod === 'CASH' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                  <span>Tiền khách đưa:</span>
                  <span>{(settledInvoice.cashReceived || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                  <span>Tiền thừa trả khách:</span>
                  <span>{(settledInvoice.changeAmount || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: 16, color: '#94a3b8', fontSize: 12 }}>
              Cảm ơn quý khách và hẹn gặp lại!
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
