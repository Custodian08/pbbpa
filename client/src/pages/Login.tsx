import React from 'react';
import { Button, Card, Form, Input, Typography, App as AntApp, Modal } from 'antd';
import { useAuth } from '../modules/auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/premises';
  const [open, setOpen] = React.useState(false);
  const [regForm] = Form.useForm();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка входа');
    }
  };

  const onRegister = async (values: { email: string; fullName?: string; password: string }) => {
    try {
      await api.post('/auth/register', values);
      message.success('Регистрация выполнена');
      setOpen(false);
      regForm.resetFields();
      navigate(from, { replace: true });
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка регистрации');
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
          <Button type="link" block onClick={()=> setOpen(true)}>Зарегистрироваться</Button>
        </Form>
      </Card>

      <Modal
        open={open}
        title="Регистрация"
        onCancel={()=> setOpen(false)}
        okText="Создать"
        okButtonProps={{ htmlType: 'submit', form: 'registerForm' }}
      >
        <Form id="registerForm" form={regForm} layout="vertical" onFinish={onRegister}>
          <Form.Item label="E-mail" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input type="email" />
          </Form.Item>
          <Form.Item label="ФИО" name="fullName">
            <Input />
          </Form.Item>
          <Form.Item label="Пароль" name="password" rules={[{ required: true, min: 6 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Будет создан обычный пользователь с правами USER
          </Typography.Paragraph>
        </Form>
      </Modal>
    </div>
  );
};
