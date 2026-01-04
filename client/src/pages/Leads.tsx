import React from 'react';
import { App as AntApp, Button, Card, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Link, useNavigate } from 'react-router-dom';

 type Lead = { id: string; name?: string | null; email?: string | null; phone?: string | null; source?: string | null; requirements?: string | null; status: 'NEW'|'IN_PROGRESS'|'WON'|'LOST'; createdAt: string };

const statusOptions = [
  { label: 'NEW', value: 'NEW' },
  { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
  { label: 'WON', value: 'WON' },
  { label: 'LOST', value: 'LOST' },
];

export const LeadsPage: React.FC = () => {
  const qc = useQueryClient();
  const { message } = AntApp.useApp();
  const nav = useNavigate();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  const { data, isLoading } = useQuery<Lead[]>({ queryKey: ['leads', q, status], queryFn: async ()=> (await api.get('/leads', { params: { q: q || undefined, status } })).data });

  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();

  const createMutation = useMutation({
    mutationFn: async (values: any)=> (await api.post('/leads', values)).data,
    onSuccess: async (r: Lead)=> { await qc.invalidateQueries({ queryKey: ['leads'] }); setOpen(false); form.resetFields(); message.success('Лид создан'); nav(`/leads/${r.id}`); },
  });

  return (
    <Card title="Лиды" extra={<Space>
      <Input.Search allowClear placeholder="Поиск (имя/e-mail/телефон/источник)" value={q} onChange={(e)=> setQ(e.target.value)} style={{ width: 300 }} />
      <Select allowClear placeholder="Статус" value={status} onChange={setStatus} style={{ width: 180 }} options={statusOptions} />
      <Button type="primary" onClick={()=> setOpen(true)}>Новый лид</Button>
    </Space>}>
      <Table<Lead>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Имя', dataIndex: 'name' },
          { title: 'E-mail', dataIndex: 'email' },
          { title: 'Телефон', dataIndex: 'phone' },
          { title: 'Источник', dataIndex: 'source' },
          { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='NEW'?'default':v==='IN_PROGRESS'?'blue':v==='WON'?'green':'red'}>{v}</Tag> },
          { title: 'Действия', key: 'a', render: (_: any, r)=> <Space><Link to={`/leads/${r.id}`}>Открыть</Link></Space> },
        ]}
      />

      <Modal open={open} title="Новый лид" onCancel={()=> setOpen(false)} onOk={()=> form.submit()} okText="Сохранить" confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v)=> createMutation.mutate(v)}>
          <Form.Item label="Имя" name="name"><Input /></Form.Item>
          <Form.Item label="E-mail" name="email"><Input type="email" /></Form.Item>
          <Form.Item label="Телефон" name="phone"><Input /></Form.Item>
          <Form.Item label="Источник" name="source"><Input /></Form.Item>
          <Form.Item label="Требования" name="requirements"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="Статус" name="status"><Select allowClear options={statusOptions} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
