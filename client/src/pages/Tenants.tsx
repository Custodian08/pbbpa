import React from 'react';
import { Button, Card, Form, Input, Modal, Select, Table, Tag, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

type Tenant = {
  id: string;
  type: 'LEGAL' | 'INDIVIDUAL';
  name: string;
  unp: string;
  email?: string | null;
  phone?: string | null;
  bankAccount?: string | null;
  address?: string | null;
};

const types = [
  { label: 'Юр.лицо', value: 'LEGAL' },
  { label: 'Физ.лицо', value: 'INDIVIDUAL' },
];

export const TenantsPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => (await api.get('/tenants')).data,
  });

  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState<string | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: async (values: any) => (await api.post('/tenants', values)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tenants'] });
      setOpen(false);
      form.resetFields();
    },
  });

  const filtered = React.useMemo(() => {
    const list = data || [];
    const ql = q.trim().toLowerCase();
    return list.filter((r) => {
      if (type && r.type !== (type as any)) return false;
      if (!ql) return true;
      return (
        (r.name || '').toLowerCase().includes(ql) ||
        (r.unp || '').toLowerCase().includes(ql) ||
        (r.email || '').toLowerCase().includes(ql) ||
        (r.phone || '').toLowerCase().includes(ql)
      );
    });
  }, [data, q, type]);

  return (
    <Card title="Арендаторы" extra={<Button type="primary" onClick={() => setOpen(true)}>Добавить</Button>}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search allowClear placeholder="Поиск: наименование/УНП/e-mail/телефон" value={q} onChange={(e)=> setQ(e.target.value)} style={{ width: 360 }} />
        <Select allowClear placeholder="Тип" value={type} onChange={setType} style={{ width: 160 }} options={types} />
      </Space>
      <Table<Tenant>
        rowKey="id"
        loading={isLoading}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Тип', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
          { title: 'Наименование', dataIndex: 'name' },
          { title: 'УНП', dataIndex: 'unp' },
          { title: 'E-mail', dataIndex: 'email' },
          { title: 'Телефон', dataIndex: 'phone' },
          { title: 'Р/счёт', dataIndex: 'bankAccount' },
          { title: 'Адрес', dataIndex: 'address' },
        ]}
      />

      <Modal open={open} title="Новый арендатор" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending} okText="Сохранить">
        <Form form={form} layout="vertical" onFinish={(values)=> createMutation.mutate(values)}>
          <Form.Item label="Тип" name="type" rules={[{ required: true }]}>
            <Select options={types} placeholder="Выберите тип" />
          </Form.Item>
          <Form.Item label="Наименование" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="УНП" name="unp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="E-mail" name="email"><Input /></Form.Item>
          <Form.Item label="Телефон" name="phone"><Input /></Form.Item>
          <Form.Item label="Р/счёт" name="bankAccount"><Input /></Form.Item>
          <Form.Item label="Адрес" name="address"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
