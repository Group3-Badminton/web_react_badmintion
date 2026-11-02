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
        padding: "32px 16px",
        position: "relative",
      }}
    >
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
              CẦU LÔNG <span style={{ color: "#3ddc25" }}>HUB</span>
            </h1>
          </div>
        </Link>
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 12px 35px rgba(0, 0, 0, 0.25)",
          padding: "26px 28px",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
