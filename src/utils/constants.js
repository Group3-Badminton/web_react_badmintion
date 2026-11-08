export const ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CUSTOMER: 'CUSTOMER'
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  LOCKED: 'LOCKED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION'
};

export const COURT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export const STAFF_PERMISSIONS = {
  VIEW_COURTS: 'VIEW_COURTS',
  MANAGE_BOOKINGS: 'MANAGE_BOOKINGS',
  CHECKIN_CHECKOUT: 'CHECKIN_CHECKOUT',
  POS_SALES: 'POS_SALES',
  VIEW_CUSTOMERS: 'VIEW_CUSTOMERS',
  MANAGE_CUSTOMERS: 'MANAGE_CUSTOMERS',
  VIEW_PRODUCTS: 'VIEW_PRODUCTS',
  STOCK_IN: 'STOCK_IN',
  VIEW_VOUCHERS: 'VIEW_VOUCHERS'
};

export const STAFF_PERMISSION_LABELS = {
  VIEW_COURTS: 'Xem danh sách sân & lịch sân',
  MANAGE_BOOKINGS: 'Quản lý & duyệt đặt sân',
  CHECKIN_CHECKOUT: 'Check-in & Check-out ca chơi',
  POS_SALES: 'Bán hàng POS tại quầy',
  VIEW_CUSTOMERS: 'Xem danh sách khách hàng',
  MANAGE_CUSTOMERS: 'Tạo & sửa thông tin khách',
  VIEW_PRODUCTS: 'Xem kho & danh mục hàng hóa',
  STOCK_IN: 'Nhập kho sản phẩm',
  VIEW_VOUCHERS: 'Xem & áp dụng mã giảm giá'
};