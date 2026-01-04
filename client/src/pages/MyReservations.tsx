import React from 'react';
import { Card, Table, Tag, Button, Space, App as AntApp } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

 type MyReservation = {
  id: string;
  premiseId: string;
  until: string;
  status: 'ACTIVE'|'EXPIRED'|'CANCELLED';
  createdAt: string;
  premise?: { id: string; code?: string | null; address: string };
};

export const MyReservationsPage: React.FC = () => {
  const qc = useQueryClient();
  const { message, modal } = AntApp.useApp();
  const { data, isLoading } = useQuery<MyReservation[]>({ queryKey: ['me','reservations'], queryFn: async ()=> (await api.get('/me/reservations')).data });

  const cancelMutation = useMutation({
    mutationFn: async (id: string)=> (await api.post(`/reservations/${id}/cancel`)).data,
    onSuccess: async ()=> {
      await qc.invalidateQueries({ queryKey: ['me','reservations'] });
      await qc.invalidateQueries({ queryKey: ['catalog-available-premises'] });
      message.success('Резервация отменена');
    },
  });

  const onCancel = (id: string) => {
    modal.confirm({ title: 'Отменить резервацию?', okText: 'Да', cancelText: 'Нет', onOk: ()=> cancelMutation.mutate(id) });
  };

  return (
    <Card title="Мои резервации">
      <Table<MyReservation>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Помещение', dataIndex: 'premiseId', render: (_: any, r)=> r.premise ? (r.premise.code ? `${r.premise.code} — ${r.premise.address}` : r.premise.address) : r.premiseId },
          { title: 'До', dataIndex: 'until', render: (v)=> String(v).slice(0,10) },
          { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='ACTIVE'?'blue':v==='CANCELLED'?'orange':'default'}>{v}</Tag> },
          { title: 'Создано', dataIndex: 'createdAt', render: (v)=> String(v).replace('T',' ').slice(0,19) },
          { title: 'Действия', key: 'a', render: (_: any, r)=> (
            <Space>
              {r.status==='ACTIVE' && <Button danger size="small" loading={cancelMutation.isPending} onClick={()=> onCancel(r.id)}>Отменить</Button>}
            </Space>
          ) },
        ]}
      />
    </Card>
  );
};
