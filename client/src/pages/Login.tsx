import React from 'react';
import { Button, Card, Form, Input, Typography, App as AntApp } from 'antd';
import { useAuth } from '../modules/auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/premises';

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка входа');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <Card title="Вход" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ email: '', password: '' }}>
          <Form.Item label="E-mail" name="email" rules={[{ required: true, type: 'email', message: 'Введите e-mail' }]}> 
            <Input placeholder="you@example.com" autoFocus />
          </Form.Item>
          <Form.Item label="Пароль" name="password" rules={[{ required: true, message: 'Введите пароль' }]}> 
            <Input.Password placeholder="••••••" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>Войти</Button>
          </Form.Item>
          <Typography.Paragraph type="secondary">По умолчанию регистрация доступна через API Swagger.</Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
};
