import { useState, useEffect } from "react";
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
  BulbOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";
import { pricingService } from "../../services/pricingService";
import bgHero from "../../assets/BG-HomePage.png";
import badmintonLogo from "../../assets/BadmintionLogo.png";
import STANDARD from "../../assets/sân1.png";
import VIP from "../../assets/sân2.png";
import PREMIUM from "../../assets/sân3.png";

const { Text } = Typography;

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [courtTypesList, setCourtTypesList] = useState([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await pricingService.getOverview();
        if (res.success && Array.isArray(res.data)) {
          setCourtTypesList(res.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải bảng giá HomePage:", err);
      } finally {
        setPricingLoading(false);
      }
    };
    fetchPricing();
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
  return (
    <div>
      <div
        style={{
          backgroundImage: `url(${bgHero})`,
          backgroundSize: "cover", //toanf màn hình
          backgroundPosition: "center top", //canh giũa
          minHeight: "100vh",
        }}
      >
        <header
          style={{ display: "flex", alignItems: "center", padding: "0 30px" }}
        >
          <img
            src={badmintonLogo}
            alt="Logo Cầu Lông Hub"
            style={{ width: 60, height: 60, objectFit: "contain" }}
          />
          <div style={{ marginLeft: 15 }}>
            <div style={{ fontWeight: "bold", color: "#fff" }}>
              CẦU LÔNG <span style={{ color: "#3ddc25" }}>HUB</span>
            </div>
            <div style={{ fontSize: 11, color: "#9da4ac", fontWeight: 400 }}>
              Badminton Court Management Website
            </div>
          </div>
          {/* Cụm nút bên phải */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            {isAuthenticated ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "dashboard",
                      label:
                        user?.role === ROLES.ADMIN
                          ? "Trang Quản Trị"
                          : "Trang Đặt Sân",
                      onClick: () =>
                        navigate(
                          user?.role === ROLES.ADMIN
                            ? "/admin/dashboard"
                            : "/customer/book",
                        ),
                    },
                    {
                      key: "logout",
                      label: "Đăng xuất",
                      danger: true,
                      onClick: logout,
                    },
                  ],
                }}
              >
                <Button type="primary" style={{ fontWeight: 600 }}>
                  {user?.fullName || "Tài khoản"}
                </Button>
              </Dropdown>
            ) : (
              <>
                <Link to="/login">
                  <Button type="primary" style={{ fontWeight: 600 }}>
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register">
                  <Button style={{ fontWeight: 600 }}>Đăng Ký</Button>
                </Link>
              </>
            )}
          </div>
        </header>
        <div style={{ textAlign: "center", padding: "0 20px", marginTop: 15 }}>
          <h1
            style={{
              fontSize: "40px",
              fontWeight: 900,
              color: "#ffffff",
              lineHeight: 1.75,
              margin: "0 0 16px",
              textShadow: "0 3px 18px rgba(0,0,0,0.8)",
            }}
          >
            Trải Nghiệm Đam Mê Cầu Lông Đỉnh Cao
            <br />
            Tại <span style={{ color: "#3ddc25" }}>Cầu Lông Hub</span>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.9)",
              lineHeight: 1.6,
              maxWidth: 680,
              margin: "0 auto 30px",
              textShadow: "0 2px 10px rgba(0,0,0,0.8)",
            }}
          >
            Hệ thống sân hiện đại, thoáng mát, đạt chuẩn thi đấu quốc tế
            <br />
            Đặt sân thao tác nhanh chóng{" "}
            <strong style={{ color: "#bbf246" }}>
              chỉ trong vài cú nhấp chuột
            </strong>
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <Button
              type="primary"
              onClick={handleBookNow}
              style={{
                height: 48,
                padding: "0 36px",
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 30,
                background: "linear-gradient(135deg, #48c63f 0%, #0ee95e 100%)",
                borderColor: "#059669",
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.4)",
              }}
            >
              ĐẶT SÂN NGAY BÂY GIỜ
            </Button>
          </div>
          <div
            style={{
              maxWidth: 1200,
              margin: "80px auto 20px",
              padding: "0 10px",
            }}
          >
            <Row gutter={[20, 20]}>
              <Col xs={24} md={8}>
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    textAlign: "left",
                    height: "100%",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 22,
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
                        margin: "0 0 4px",
                      }}
                    >
                      Thảm Sân Đạt Chuẩn BWF
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#475569",
                        lineHeight: 1.5,
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
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    textAlign: "left",
                    height: "100%",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 22,
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
                        margin: "0 0 4px",
                      }}
                    >
                      Ánh Sáng Chống Chói 360°
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#475569",
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      Hệ thống đèn LED công nghệ mới, ánh sáng đạt chuẩn thi
                      đấu, không gây chói mắt.
                    </p>
                  </div>
                </div>
              </Col>
              {/* Thẻ 3: Đặt sân tiện lợi */}
              <Col xs={24} md={8}>
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    textAlign: "left",
                    height: "100%",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 22,
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
                        margin: "0 0 4px",
                      }}
                    >
                      Đặt Sân Nhanh & Tiện Lợi
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#475569",
                        lineHeight: 1.5,
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
      </div>
      {/* 2. BẢNG GIÁ & DANH MỤC SÂN (RENDER THEO MAP TỪ API) */}
      <section
        style={{
          background: "linear-gradient(180deg, #072318 0%, #03140d 100%)",
          color: "#ffffff",
          padding: "70px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#fff",
              margin: "0 0 12px",
            }}
          >
            Danh Mục Các Loại Sân & Đơn Giá Theo Giờ
          </h2>

          <p
            style={{
              fontSize: 15,
              color: "#94a3b8",
              maxWidth: 680,
              margin: "0 auto 40px",
            }}
          >
            Chúng tôi cung cấp đa dạng phân khúc sân từ tiêu chuẩn tập luyện đến
            sân thi đấu cao cấp.
          </p>

          {pricingLoading ? (
            <Spin size="large" tip="Đang tải danh mục sân..." />
          ) : (
            <Row gutter={[24, 24]} justify="center">
              {courtTypesList.map((court) => {
                // 1 sân -> span 10, 2 sân -> span 12, 3 sân -> span 8
                const span =
                  courtTypesList.length === 1
                    ? 10
                    : courtTypesList.length === 2
                      ? 12
                      : 8;
                const courtImg =
                  court.code === "VIP"
                    ? VIP
                    : court.code === "PREMIUM"
                      ? PREMIUM
                      : STANDARD;

                return (
                  <Col span={span} key={court.code}>
                    <div
                      style={{
                        background: court.highlighted
                          ? "rgba(22, 48, 35, 0.95)"
                          : "rgba(15, 36, 28, 0.75)",
                        border: court.highlighted
                          ? "2px solid #3ddc25"
                          : "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 20,
                        padding: 24,
                        textAlign: "left",
                        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      {/* Tên sân & Badge */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: "#fff",
                          }}
                        >
                          {court.name}
                        </div>
                        <span
                          style={{
                            background: court.badgeBg || "#2563eb",
                            color: court.badgeColor || "#fff",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: 20,
                          }}
                        >
                          {court.badge}
                        </span>
                      </div>

                      {/* Mô tả sân */}
                      <p
                        style={{
                          fontSize: 13,
                          color: "#94a3b8",
                          minHeight: 40,
                          margin: "0 0 16px",
                        }}
                      >
                        {court.description}
                      </p>

                      {/* Ảnh sân */}
                      <div
                        style={{
                          height: 160,
                          borderRadius: 12,
                          overflow: "hidden",
                          marginBottom: 20,
                        }}
                      >
                        <img
                          src={courtImg}
                          alt={court.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                      {/* 3 mức giá */}
                      <div
                        style={{
                          background: "rgba(0, 0, 0, 0.35)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          marginBottom: 20,
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
                          <strong style={{ color: "#4ade80" }}>
                            {court.priceRegular}
                          </strong>
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
                          <strong style={{ color: "#4ade80" }}>
                            {court.pricePeak}
                          </strong>
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
                          <strong style={{ color: "#f87171" }}>
                            {court.priceWeekend}
                          </strong>
                        </div>
                      </div>

                      {/* Nút đặt sân */}
                      <Button
                        type={court.highlighted ? "primary" : "default"}
                        onClick={handleBookNow}
                        style={{
                          height: 42,
                          width: "100%",
                          borderRadius: 30,
                          fontWeight: 700,
                          background: court.highlighted
                            ? "linear-gradient(135deg, #10b981, #059669)"
                            : "rgba(255, 255, 255, 0.1)",
                          borderColor: court.highlighted
                            ? "#059669"
                            : "rgba(255, 255, 255, 0.2)",
                          color: "#fff",
                        }}
                      >
                        Đặt sân ngay
                      </Button>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </section>
    </div>
  );
}
