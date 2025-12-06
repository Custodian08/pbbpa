import React from 'react';
import { Button, Card, Form, Select, Table, Tag } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

 type User = {
  id: string;
  email: string;
  fullName?: string | null;
  roles?: { role: { name: string } }[];
};

 const roleOptions = [
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'OPERATOR', value: 'OPERATOR' },
  { label: 'ANALYST', value: 'ANALYST' },
 ];

 export const AdminUsersPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<User[]>({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data });

  const [form] = Form.useForm();
  const assign = useMutation({
    mutationFn: async (values: { userId: string; roleName: string }) => (await api.post('/admin/assign-role', values)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] });
      form.resetFields();
    },
  });

  return (
    <Card title="Пользователи и роли" extra={
      <Form form={form} layout="inline" onFinish={(v)=> assign.mutate(v as any)}>
        <Form.Item name="userId" rules={[{ required: true }]}>
          <Select style={{ width: 260 }} placeholder="Выберите пользователя"
            options={(data||[]).map(u=>({ label: `${u.email}${u.fullName? ' — '+u.fullName:''}`, value: u.id }))} />
        </Form.Item>
        <Form.Item name="roleName" rules={[{ required: true }]}>
          <Select style={{ width: 160 }} placeholder="Роль" options={roleOptions} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={assign.isPending}>Назначить</Button>
        </Form.Item>
      </Form>
    }>
      <Table<User>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        columns={[
          { title: 'E-mail', dataIndex: 'email' },
          { title: 'ФИО', dataIndex: 'fullName' },
          { title: 'Роли', dataIndex: 'roles', render: (_: any, r) => (
            <>
              {(r.roles||[]).map((x, i)=> <Tag key={i}>{x.role.name}</Tag>)}
            </>
          ) },
        ]}
      />
    </Card>
  );
 }
