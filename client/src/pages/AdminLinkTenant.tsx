import React from 'react';
import { Card, Form, Select, Button, Space, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

 type User = {
  id: string;
  email: string;
  fullName?: string | null;
};

 type Tenant = {
  id: string;
  name: string;
};

export const AdminLinkTenantPage: React.FC = () => {
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => (await api.get('/tenants')).data,
  });

  const link = useMutation({
    mutationFn: async (values: { userId: string; tenantId: string }) => (await api.post('/admin/link-tenant', values)).data,
    onSuccess: async () => {
      message.success('Пользователь успешно привязан к контрагенту');
      form.resetFields();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['users'] }),
        qc.invalidateQueries({ queryKey: ['tenants'] }),
      ]);
    },
  });

  return (
    <Card title="Привязка контрагента к пользователю">
      <Form form={form} layout="inline" onFinish={(v) => link.mutate(v as any)}>
        <Space wrap>
          <Form.Item name="userId" rules={[{ required: true, message: 'Выберите пользователя' }]}>
            <Select
              style={{ width: 300 }}
              loading={usersLoading}
              placeholder="Пользователь"
              options={(users || []).map((u) => ({
                label: `${u.email}${u.fullName ? ' — ' + u.fullName : ''}`,
                value: u.id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="tenantId" rules={[{ required: true, message: 'Выберите контрагента' }]}>
            <Select
              style={{ width: 300 }}
              loading={tenantsLoading}
              placeholder="Контрагент"
              options={(tenants || []).map((t) => ({ label: t.name, value: t.id }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={link.isPending}>Привязать</Button>
          </Form.Item>
        </Space>
      </Form>
    </Card>
  );
};
