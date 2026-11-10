import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from '../common/AppHeader';
import AppSidebar from '../common/AppSidebar';

const { Content, Footer } = Layout;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: '#f5f7fa' }}>
      <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <AppSidebar collapsed={collapsed} />
        <Layout style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <Content
            style={{
              background: 'transparent',
              minHeight: 280,
              flex: '1 0 auto'
            }}
          >
            <Outlet />
          </Content>
          <Footer style={{ textAlign: 'center', color: '#888', padding: '16px 0', fontSize: 13, flexShrink: 0 }}>
            🏸 BCMS — Hệ Thống Quản Lý Sân Cầu Lông © 2026. All rights reserved.
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  );
}
