import React from 'react';
import { Layout, Menu, Button, Flex } from 'antd';
import { ShopOutlined, TeamOutlined, LogoutOutlined, FileTextOutlined, FileDoneOutlined, FileSyncOutlined, HomeOutlined, CalendarOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Header, Content, Sider } = Layout;

export const AppLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const isAdmin = (user?.roles || []).includes('ADMIN');

  const selected = React.useMemo(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/dashboard')) return ['dashboard'];
    if (location.pathname.startsWith('/premises')) return ['premises'];
    if (location.pathname.startsWith('/tenants')) return ['tenants'];
    if (location.pathname.startsWith('/leases')) return ['leases'];
    if (location.pathname.startsWith('/invoices')) return ['invoices'];
    if (location.pathname.startsWith('/payments')) return ['payments'];
    if (location.pathname.startsWith('/reservations')) return ['reservations'];
    if (location.pathname.startsWith('/admin/users')) return ['admin-users'];
    if (location.pathname.startsWith('/admin/audit')) return ['admin-audit'];
    return [] as string[];
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="light">
        <div style={{ padding: 16, fontWeight: 600 }}>Landlord</div>
        <Menu mode="inline" selectedKeys={selected}>
          <Menu.Item key="dashboard" icon={<HomeOutlined />}> <Link to="/dashboard">Дашборд</Link> </Menu.Item>
          <Menu.Item key="premises" icon={<ShopOutlined />}> <Link to="/premises">Помещения</Link> </Menu.Item>
          <Menu.Item key="tenants" icon={<TeamOutlined />}> <Link to="/tenants">Арендаторы</Link> </Menu.Item>
          <Menu.Item key="leases" icon={<FileTextOutlined />}> <Link to="/leases">Договоры</Link> </Menu.Item>
          <Menu.Item key="invoices" icon={<FileDoneOutlined />}> <Link to="/invoices">Счета</Link> </Menu.Item>
          <Menu.Item key="payments" icon={<FileSyncOutlined />}> <Link to="/payments">Платежи</Link> </Menu.Item>
          <Menu.Item key="reservations" icon={<CalendarOutlined />}> <Link to="/reservations">Резервации</Link> </Menu.Item>
          {isAdmin && <Menu.Item key="admin-users"> <Link to="/admin/users">Пользователи</Link> </Menu.Item>}
          {isAdmin && <Menu.Item key="admin-audit"> <Link to="/admin/audit">Аудит</Link> </Menu.Item>}
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px' }}>
          <Flex justify="space-between" align="center">
            <div />
            <Button type="text" icon={<LogoutOutlined />} onClick={logout}>Выйти</Button>
          </Flex>
        </Header>
        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
