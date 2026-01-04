import React from 'react';
import { Button, Card, DatePicker, Form, Modal, Select, Space, Table, Tag, App as AntApp } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../modules/auth/AuthContext';
import { labelReservationStatus } from '../i18n/labels';

 type Reservation = { id: string; premiseId: string; until: string; status: 'ACTIVE'|'EXPIRED'|'CANCELLED'; createdAt: string };
 type Premise = { id: string; code?: string | null; address: string };

 export const ReservationsPage: React.FC = () => {
  const qc = useQueryClient();
  const { message, modal } = AntApp.useApp();
  const { user } = useAuth();
  const isUser = (user?.roles || []).includes('USER');

  const { data, isLoading } = useQuery<any[]>({ queryKey: ['reservations'], queryFn: async () => (await api.get('/reservations')).data });
  const { data: premises } = useQuery<Premise[]>({
    queryKey: ['premises', isUser ? 'available' : 'all'],
    queryFn: async () => (await api.get(isUser ? '/premises/available' : '/premises')).data,
  });

  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();

  const createMutation = useMutation({
    mutationFn: async (values: any) => (await api.post('/reservations', { premiseId: values.premiseId, until: (values.until as Dayjs).format('YYYY-MM-DD') })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reservations'] });
      setOpen(false); form.resetFields(); message.success('Резервация создана');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/reservations/${id}/cancel`)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reservations'] });
      await qc.invalidateQueries({ queryKey: ['catalog'] });
      await qc.invalidateQueries({ queryKey: ['me','reservations'] });
      message.success('Резервация отменена');
    }
  });

  const expireNow = async () => {
    await api.post('/reservations/expire-now');
    await qc.invalidateQueries({ queryKey: ['reservations'] });
    await qc.invalidateQueries({ queryKey: ['catalog'] });
    message.success('Просроченные резервации помечены');
  };

  const cancel = (id: string) => {
    modal.confirm({
      title: 'Отменить резервацию?',
      okText: 'Да', cancelText: 'Нет',
      onOk: () => cancelMutation.mutate(id),
    });
  };

  return (
    <Card title="Резервации" extra={<Space>
      <Button onClick={expireNow}>Истечь сейчас</Button>
      <Button type="primary" onClick={()=> setOpen(true)}>Добавить</Button>
    </Space>}>
      <Table<Reservation>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Помещение', dataIndex: 'premiseId', render: (_: any, r: any)=> {
            const p = r.premise || (premises||[]).find(x=> x.id===r.premiseId);
            return p ? (p.code ? `${p.code} — ${p.address}` : p.address) : r.premiseId;
          } },
          { title: 'До', dataIndex: 'until', render: (v)=> String(v).slice(0,10) },
          { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='ACTIVE'?'blue':v==='CANCELLED'?'orange':'default'}>{labelReservationStatus(v)}</Tag> },
          { title: 'Создано', dataIndex: 'createdAt', render: (v)=> String(v).replace('T',' ').slice(0,19) },
          { title: 'Действия', key: 'a', render: (_: any, r)=> (
            <Space>
              {r.status==='ACTIVE' && <Button size="small" danger onClick={()=> cancel(r.id)}>Отменить</Button>}
            </Space>
          ) },
        ]}
      />

      <Modal open={open} title="Новая резервация" onCancel={()=> setOpen(false)} onOk={()=> form.submit()} okText="Сохранить" confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v)=> createMutation.mutate(v)}>
          <Form.Item label="Помещение" name="premiseId" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={(premises||[]).map(p=>({ label: (p.code? `${p.code} — `:'') + p.address, value: p.id }))} />
          </Form.Item>
          <Form.Item label="Действует до" name="until" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(d)=> d.isBefore(dayjs().startOf('day'))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
 }
