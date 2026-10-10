import React from "react";
import { Outlet, Link } from "react-router-dom";
import bgHero from "../../assets/BG-HomePage.png";
import badmintionLogo from "../../assets/BadmintionLogo.png";

export default function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundImage: `url(${bgHero})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        padding: "32px 16px",
        position: "relative",
      }}
    >
      {/* Top Header Logo Brand */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
          }}
        >
          <img
            src={badmintionLogo}
            alt="Logo"
            style={{ width: 48, height: 48, objectFit: "contain" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div style={{ textAlign: "left" }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "0.5px",
                lineHeight: 1.1,
                textShadow: "0 2px 10px rgba(0,0,0,0.7)",
              }}
            >
              CẦU LÔNG <span style={{ color: "#4ade80" }}>HUB</span>
            </h1>
          </div>
        </Link>
        <p
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            marginTop: 6,
            fontSize: 14,
            textShadow: "0 1px 6px rgba(0,0,0,0.7)",
          }}
        >
          Hệ Thống Quản Lý Sân Cầu Lông Toàn Diện
        </p>
      </div>
      <div
        className="auth-glass-card"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: "36px 32px",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
