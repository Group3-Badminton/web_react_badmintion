import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Button,
  Typography,
  Space,
  Divider,
  Dropdown,
  Avatar,
  Tag,
  message,
  Spin,
  Modal,
} from "antd";
import {
  ThunderboltOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  BulbOutlined,
  CrownOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";
import bgHero from "../../assets/BG-HomePage.png";
import badmintonLogo from "../../assets/BadmintionLogo.png";
import san1 from "../../assets/sân1.png";
import san2 from "../../assets/sân2.png";
import san3 from "../../assets/sân3.png";
import { pricingService } from "../../services/pricingService";

const { Title, Paragraph, Text } = Typography;

const COURT_IMAGES = {
  STANDARD: san1,
  VIP: san2,
  PREMIUM: san3
};

// Dữ liệu bảng giá & loại sân cố định giới thiệu trên HomePage
const courtTypesFallback = [
  {
    id: "standard",
    name: "Sân Tiêu Chuẩn",
    badge: "Phổ biến",
    image: san1,
    badgeColor: "#f9f9f9",
    badgeBg: "#2563eb",
    description:
      "Phù hợp cho nhu cầu chơi cầu lông hàng ngày, tập luyện, giao lưu cùng bạn bè.",
    priceRegular: "80.000đ/h",
    pricePeak: "130.000đ/h",
    priceWeekend: "140.000đ/h",
    icon: "🏸",
    iconBg: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    courtBg:
      "linear-gradient(180deg, rgba(37, 99, 235, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)",
    highlighted: false,
  },
  {
    id: "vip",
    name: "Sân VIP",
    badge: "Được yêu thích nhất ⭐",
    image: san2,
    badgeColor: "#854d0e",
    badgeBg: "#fef08a",
    description:
      "Trải nghiệm không gian rộng rãi, thoáng mát, trang thiết bị cao cấp và ánh sáng tối ưu.",
    priceRegular: "100.000đ/h",
    pricePeak: "150.000đ/h",
    priceWeekend: "170.000đ/h",
    icon: "👑",
    iconBg: "linear-gradient(135deg, #eab308, #ca8a04)",
    courtBg:
      "linear-gradient(180deg, rgba(234, 179, 8, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)",
    highlighted: true,
  },
  {
    id: "premium",
    name: "Sân Thi Đấu",
    badge: "Chuyên nghiệp",
    image: san3,
    badgeColor: "#ffffff",
    badgeBg: "#9333ea",
    description:
      "Dành cho các giải đấu, câu lạc bộ chuyên nghiệp với không gian đạt chuẩn thi đấu quốc tế.",
    priceRegular: "130.000đ/h",
    pricePeak: "190.000đ/h",
    priceWeekend: "210.000đ/h",
    icon: "⭐",
    iconBg: "linear-gradient(135deg, #a855f7, #7e22ce)",
    courtBg:
      "linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)",
    highlighted: false,
  },
];

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [courtTypesList, setCourtTypesList] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPricing = async () => {
      try {
        const res = await pricingService.getOverview();
        if (isMounted && res.success && Array.isArray(res.data)) {
          setCourtTypesList(res.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải bảng giá HomePage:", err);
      } finally {
        if (isMounted) setPricingLoading(false);
      }
    };
    fetchPricing();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleBookNow = () => {
    if (isAuthenticated) {
      if (user?.role === ROLES.ADMIN) {
        navigate("/admin/bookings");
      } else if (user?.role === ROLES.STAFF) {
        navigate("/admin/monitor");
      } else {
        navigate("/customer/book");
      }
    } else {
      navigate("/login", { state: { from: "/customer/book" } });
    }
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      style={{
        background: "#051911",
        minHeight: "100vh",
        color: "#ffffff",
        overflowX: "hidden",
      }}
    >
      {/* 1. Header */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: "transparent",
          padding: "16px 36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <img
            src={badmintonLogo}
            alt="Logo"
            style={{ width: 80, height: 80, objectFit: "contain" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "0.5px",
                lineHeight: 1.2,
                textShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              CẦU LÔNG <span style={{ color: "#4ade80" }}>HUB</span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.85)",
                fontWeight: 400,
                textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              }}
            >
              Badminton Court Management Website
            </div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isAuthenticated ? (
            <Space size="middle">
              <Button
                type="primary"
                onClick={handleBookNow}
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  borderColor: "#059669",
                  color: "#ffffff",
                  fontWeight: 700,
                  borderRadius: 20,
                }}
              >
                Đặt sân ngay
              </Button>

              <Dropdown
                menu={{
                  items: [
                    {
                      key: "user-info",
                      label: (
                        <div style={{ padding: "4px 0" }}>
                          <Text strong>{user?.name || "Người dùng"}</Text>
                          <br />
                          <Tag
                            color={
                              user?.role === ROLES.ADMIN
                                ? "#EF4444"
                                : user?.role === ROLES.STAFF
                                  ? "#009B60"
                                  : "#1890ff"
                            }
                            style={{ marginTop: 4 }}
                          >
                            {user?.role === ROLES.ADMIN
                              ? "Quản trị viên"
                              : user?.role === ROLES.STAFF
                                ? "Nhân viên"
                                : "Khách hàng"}
                          </Tag>
                        </div>
                      ),
                      disabled: true,
                    },
                    { type: "divider" },
                    {
                      key: "admin-panel",
                      label:
                        user?.role === ROLES.ADMIN || user?.role === ROLES.STAFF
                          ? "Vào Trang Quản Trị"
                          : "Trang Đặt Sân",
                      icon: <AppstoreOutlined />,
                      onClick: () =>
                        navigate(
                          user?.role === ROLES.ADMIN ||
                            user?.role === ROLES.STAFF
                            ? "/admin/dashboard"
                            : "/customer/book",
                        ),
                    },
                    {
                      key: "logout",
                      label: "Đăng xuất",
                      icon: <LogoutOutlined />,
                      danger: true,
                      onClick: () => {
                        Modal.confirm({
                          title: "Xác nhận đăng xuất",
                          icon: <ExclamationCircleOutlined style={{ color: "#ff4d4f" }} />,
                          content: "Bạn có chắc chắn muốn đăng xuất không?",
                          okText: "Đăng xuất",
                          okType: "danger",
                          cancelText: "Hủy",
                          centered: true,
                          onOk: async () => {
                            try {
                              await logout();
                              message.success("Đăng xuất thành công.");
                              navigate("/login");
                            } catch (error) {
                              message.error("Đã có lỗi xảy ra trong quá trình đăng xuất. Vui lòng thử lại.");
                            }
                          },
                        });
                      },
                    },
                  ],
                }}
                placement="bottomRight"
                arrow
              >
                <Avatar
                  style={{
                    backgroundColor: "#009B60",
                    cursor: "pointer",
                    border: "2px solid rgba(255, 255, 255, 0.4)",
                  }}
                  icon={<UserOutlined />}
                />
              </Dropdown>
            </Space>
          ) : (
            <Space size="middle">
              <Link to="/login">
                <Button
                  type="primary"
                  style={{
                    background: "linear-gradient(135deg, #3db910, #359073)",
                    borderColor: "#059669",
                    color: "#ffffff",
                    fontWeight: 700,
                    borderRadius: 20,
                    height: 38,
                    padding: "0 22px",
                    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  type="primary"
                  style={{
                    background: "#bbf246",
                    borderColor: "#bbf246",
                    color: "#092615",
                    fontWeight: 800,
                    borderRadius: 20,
                    height: 38,
                    padding: "0 22px",
                    boxShadow: "0 0 20px rgba(187, 242, 70, 0.4)",
                  }}
                >
                  Đăng ký miễn phí
                </Button>
              </Link>
            </Space>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <section
        style={{
          position: "relative",
          minHeight: "85vh",
          backgroundImage: `url(${bgHero})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "110px 24px 50px",
          textAlign: "center",
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: 1360,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div style={{ maxWidth: 960, margin: "0 auto" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0, 0, 0, 0.45)",
                border: "1px solid rgba(234, 179, 8, 0.7)",
                padding: "7px 20px",
                borderRadius: 30,
                color: "#facc15",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.8px",
                marginBottom: 24,
                boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
                backdropFilter: "blur(8px)",
              }}
            >
              <CrownOutlined style={{ color: "#facc15", fontSize: 15 }} />
              <span>SÂN CẦU LÔNG CHUẨN THI ĐẤU QUỐC TẾ BWF</span>
            </div>
            <h1
              style={{
                fontSize: "clamp(32px, 5.5vw, 33px)",
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.22,
                margin: "0 0 20px",
                textShadow: "0 3px 18px rgba(0,0,0,0.7)",
                letterSpacing: "-0.5px",
              }}
            >
              Trải Nghiệm Đam Mê Cầu Lông Đỉnh Cao
              <br />
              Tại <span style={{ color: "#4ade80" }}>Cầu Lông Hub</span>
            </h1>

            <p
              style={{
                fontSize: "clamp(14px, 2vw, 17px)",
                color: "#ffffff",
                lineHeight: 1.65,
                maxWidth: 720,
                margin: "0 auto 25px",
                textShadow: "0 2px 10px rgba(0,0,0,0.7)",
              }}
            >
              Hệ thống sân hiện đại, thoáng mát, đạt chuẩn quốc tế,
              <br />
              đặt sân thao tác nhanh chóng{" "}
              <strong style={{ color: "#bbf246" }}>
                chỉ trong vài cú nhấp chuột
              </strong>
              .
            </p>

            <div
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: 36,
              }}
            >
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleBookNow}
                style={{
                  height: 50,
                  padding: "0 38px",
                  fontSize: 13,
                  fontWeight: 800,
                  borderRadius: 30,
                  background:
                    "linear-gradient(135deg, #c0f135 0%, #48df7b 50%, #16a34a 100%)",
                  border: "none",
                  color: "#052e16",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow:
                    "0 8px 25px rgba(192, 241, 53, 0.45), 0 2px 12px rgba(34, 197, 94, 0.3)",
                  letterSpacing: "0.4px",
                }}
              >
                ĐẶT SÂN NGAY BÂY GIỜ{" "}
                <ArrowRightOutlined style={{ fontSize: 13 }} />
              </Button>

              <Button
                size="large"
                onClick={() => scrollToSection("pricing")}
                style={{
                  height: 50,
                  padding: "0 30px",
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 30,
                  background: "rgba(255, 255, 255, 0.15)",
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  color: "#ffffff",
                  backdropFilter: "blur(8px)",
                }}
              >
                Xem Bảng Giá Các Sân{" "}
                <ArrowRightOutlined style={{ fontSize: 13 }} />
              </Button>
            </div>
          </div>

          {/* 3 Main Feature Cards */}
          <div
            id="about"
            style={{
              maxWidth: 1320,
              margin: "30px auto 0",
              width: "100%",
            }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.94)",
                    border: "1px solid rgba(226, 232, 240, 0.9)",
                    borderRadius: 16,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    textAlign: "left",
                    height: "100%",
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.05)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    <CrownOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: 15.5,
                        fontWeight: 800,
                        color: "#0f172a",
                        margin: "0 0 3px",
                      }}
                    >
                      Thảm Sân Đạt Chuẩn BWF
                    </h3>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#475569",
                        lineHeight: 1.45,
                        margin: 0,
                      }}
                    >
                      Sử dụng 100% thảm PVC chuyên dụng thể thao, độ đàn hồi cao
                      giúp giảm chấn thương hiệu quả.
                    </p>
                  </div>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.94)",
                    border: "1px solid rgba(226, 232, 240, 0.9)",
                    borderRadius: 16,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    textAlign: "left",
                    height: "100%",
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.05)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    <BulbOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: 15.5,
                        fontWeight: 800,
                        color: "#0f172a",
                        margin: "0 0 3px",
                      }}
                    >
                      Ánh Sáng Chống Chói 360°
                    </h3>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#475569",
                        lineHeight: 1.45,
                        margin: 0,
                      }}
                    >
                      Hệ thống đèn LED công nghệ mới, ánh sáng đạt chuẩn thi
                      đấu, không gây chói mắt.
                    </p>
                  </div>
                </div>
              </Col>

              <Col xs={24} md={8}>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.94)",
                    border: "1px solid rgba(226, 232, 240, 0.9)",
                    borderRadius: 16,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    textAlign: "left",
                    height: "100%",
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.05)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    <ThunderboltOutlined />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: 15.5,
                        fontWeight: 800,
                        color: "#0f172a",
                        margin: "0 0 3px",
                      }}
                    >
                      Đặt Sân Nhanh & Tiện Lợi
                    </h3>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#475569",
                        lineHeight: 1.45,
                        margin: 0,
                      }}
                    >
                      Trải nghiệm đặt sân trực tuyến trong vài giây, chọn khung
                      giờ linh hoạt, dễ dàng.
                    </p>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </section>

      {/* 3. Pricing Section - DỮ LIỆU CỐ ĐỊNH */}
      <section
        id="pricing"
        style={{
          background: "linear-gradient(180deg, #072318 0%, #03140d 100%)",
          color: "#ffffff",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div id="courts" style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(120, 53, 15, 0.3)",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              padding: "5px 16px",
              borderRadius: 30,
              color: "#fbbf24",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            <span>BẢNG GIÁ NIÊM YẾT</span>
          </div>

          <h2
            style={{
              fontSize: "clamp(24px, 3.5vw, 34px)",
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 10px",
            }}
          >
            Danh Mục Các Loại Sân & Đơn Giá Theo Giờ
          </h2>

          <p
            style={{
              fontSize: 15,
              color: "#94a3b8",
              maxWidth: 700,
              margin: "0 auto 48px",
            }}
          >
            Chúng tôi cung cấp đa dạng phân khúc sân từ tiêu chuẩn tập luyện đến
            sân thi đấu cao cấp.
          </p>

          {pricingLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Spin size="large" tip="Đang tải danh mục sân..." />
            </div>
          ) : courtTypesList.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                background: "rgba(15, 36, 28, 0.75)",
                borderRadius: 20,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#94a3b8",
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              <p style={{ fontSize: 16, margin: 0 }}>
                Hệ thống đang cập nhật danh mục sân và bảng giá niêm yết. Vui lòng quay lại sau!
              </p>
            </div>
          ) : (
            <Row gutter={[24, 24]} align="stretch" justify="center">
              {courtTypesList.map((court) => {
                const colSpan =
                  courtTypesList.length === 1
                    ? { xs: 24, sm: 18, md: 12, lg: 10 }
                    : courtTypesList.length === 2
                    ? { xs: 24, md: 12, lg: 10 }
                    : { xs: 24, md: 8 };

                return (
                  <Col {...colSpan} key={court.id || court.code}>
                    <div
                      style={{
                        background: court.highlighted
                          ? "rgba(22, 48, 35, 0.9)"
                          : "rgba(15, 36, 28, 0.75)",
                        border: court.highlighted
                          ? "2px solid #bbf246"
                          : "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 20,
                        padding: "24px",
                        textAlign: "left",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        backdropFilter: "blur(12px)",
                        boxShadow: court.highlighted
                          ? "0 0 30px rgba(187, 242, 70, 0.25)"
                          : "0 10px 25px rgba(0, 0, 0, 0.4)",
                      }}
                    >
                      <div>
                        {/* Header của thẻ */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                background: court.iconBg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 20,
                                color: "#fff",
                              }}
                            >
                              {court.icon}
                            </div>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 800,
                                color: "#ffffff",
                              }}
                            >
                              {court.name}
                            </div>
                          </div>
                          <span
                            style={{
                              background: court.badgeBg,
                              color: court.badgeColor,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 20,
                            }}
                          >
                            {court.badge}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: 12.5,
                            color: "#94a3b8",
                            lineHeight: 1.5,
                            marginBottom: 18,
                          }}
                        >
                          {court.description}
                        </p>
                        <div
                          style={{
                            height: 140,
                            width: "100%",
                            borderRadius: 12,
                            overflow: "hidden",
                            marginBottom: 20,
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.25)",
                          }}
                        >
                          <img
                            src={COURT_IMAGES[court.code] || san1}
                            alt={court.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                              transition: "transform 0.3s ease",
                            }}
                          />
                        </div>
                        {/* Bảng giá niêm yết */}
                        <div
                          style={{
                            background: "rgba(0, 0, 0, 0.3)",
                            borderRadius: 12,
                            padding: "14px",
                            marginBottom: 22,
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 0",
                              fontSize: 13,
                              color: "#cbd5e1",
                            }}
                          >
                            <span>Giờ thường (06:00 - 17:00):</span>
                            {court.priceRegular && court.priceRegular !== "Chưa xác định" ? (
                              <strong style={{ color: "#4ade80" }}>
                                {court.priceRegular}
                              </strong>
                            ) : (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                Chưa xác định
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 0",
                              fontSize: 13,
                              color: "#cbd5e1",
                            }}
                          >
                            <span>Giờ vàng (17:00 - 22:00):</span>
                            {court.pricePeak && court.pricePeak !== "Chưa xác định" ? (
                              <strong style={{ color: "#4ade80" }}>
                                {court.pricePeak}
                              </strong>
                            ) : (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                Chưa xác định
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 0",
                              fontSize: 13,
                              color: "#cbd5e1",
                            }}
                          >
                            <span>Cuối tuần & Ngày lễ:</span>
                            {court.priceWeekend && court.priceWeekend !== "Chưa xác định" ? (
                              <strong style={{ color: "#f87171" }}>
                                {court.priceWeekend}
                              </strong>
                            ) : (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                                Chưa xác định
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        type={court.highlighted ? "primary" : "default"}
                        onClick={handleBookNow}
                        style={{
                          height: 42,
                          width: "100%",
                          borderRadius: 30,
                          fontWeight: 800,
                          fontSize: 14,
                          background: court.highlighted
                            ? "linear-gradient(135deg, #c0f135 0%, #48df7b 50%, #16a34a 100%)"
                            : "rgba(255, 255, 255, 0.08)",
                          borderColor: court.highlighted
                            ? "transparent"
                            : "rgba(255, 255, 255, 0.25)",
                          color: court.highlighted ? "#052e16" : "#ffffff",
                        }}
                      >
                        📅 Đặt sân ngay &gt;
                      </Button>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </section>

      {/* 4. Footer */}
      <footer
        id="contact"
        style={{
          background: "#04130d",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#94a3b8",
          padding: "30px 24px",
          fontSize: 14,
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Row gutter={[36, 36]}>
            <Col xs={24} md={10}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <img
                  src={badmintonLogo}
                  alt="Logo"
                  style={{ width: 80, height: 80, objectFit: "contain" }}
                />
                <div>
                  <div
                    style={{ fontSize: 18, fontWeight: 800, color: "#ffffff" }}
                  >
                    CẦU LÔNG <span style={{ color: "#4ade80" }}>HUB</span>
                  </div>
                  <div
                    style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.85)" }}
                  >
                    Badminton Court Management Website
                  </div>
                </div>
              </div>
              <p
                style={{ lineHeight: 1.65, color: "#cbd5e1", marginBottom: 20 }}
              >
                Hệ thống sân cầu lông và quản lý đặt sân trực tuyến hiện đại,
                chuẩn BWF.
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div>
                  <EnvironmentOutlined
                    style={{ color: "#4ade80", marginRight: 8 }}
                  />{" "}
                  Cần Thơ, Việt Nam
                </div>
                <div>
                  <PhoneOutlined style={{ color: "#4ade80", marginRight: 8 }} />{" "}
                  Hotline: <strong>0909080807</strong>
                </div>
                <div>
                  <ClockCircleOutlined
                    style={{ color: "#4ade80", marginRight: 8 }}
                  />{" "}
                  06:00 - 23:00 (Hàng ngày)
                </div>
              </div>
            </Col>

            <Col xs={24} sm={12} md={7}>
              <div
                style={{
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 16,
                }}
              >
                Liên Kết Nhanh
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <a
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection("pricing");
                  }}
                  style={{ color: "#94a3b8", textDecoration: "none" }}
                >
                  Bảng giá sân
                </a>
                <Link
                  to="/login"
                  style={{ color: "#94a3b8", textDecoration: "none" }}
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  style={{ color: "#94a3b8", textDecoration: "none" }}
                >
                  Đăng ký
                </Link>
              </div>
            </Col>

            <Col xs={24} sm={12} md={7}>
              <div
                style={{
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 16,
                }}
              >
                Quy Định Sân
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <span>Mang giày thể thao đế mềm chuyên dụng</span>
                <span>Hủy lịch đặt trước tối thiểu 02 giờ</span>
              </div>
            </Col>
          </Row>

          <Divider
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              margin: "30px 0 20px",
            }}
          />
          <div style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>
            Cầu Lông Hub — Hệ Thống Quản Lý Sân Cầu Lông © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
