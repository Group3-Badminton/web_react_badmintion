import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from '../common/AppHeader';
import AppSidebar from '../common/AppSidebar';

const { Content, Footer } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout>
        <AppSidebar collapsed={collapsed} />
        <Layout style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column' }}>
          <Content
            style={{
              background: 'transparent',
              minHeight: 280,
              flex: 1
            }}
          >
            <Outlet />
          </Content>
          <Footer style={{ textAlign: 'center', color: '#888', padding: '16px 0', fontSize: 13 }}>
            🏸 BCMS — Hệ Thống Quản Lý Sân Cầu Lông © 2026. All rights reserved.
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}
