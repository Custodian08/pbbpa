import React from 'react';
import { Button, Card, DatePicker, Form, Modal, Space, Table, Tag, App as AntApp } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import dayjs, { Dayjs } from 'dayjs';

 type Premise = {
  id: string;
  code?: string | null;
  type: 'OFFICE' | 'RETAIL' | 'WAREHOUSE';
  address: string;
  area: number;
  availableFrom?: string | null;
};

export const CatalogPage: React.FC = () => {
  const qc = useQueryClient();
  const { message } = AntApp.useApp();
  const { data, isLoading } = useQuery<Premise[]>({
    queryKey: ['catalog-available-premises'],
    queryFn: async () => (await api.get('/premises/available')).data,
  });

  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();
  const [currentPremise, setCurrentPremise] = React.useState<Premise | null>(null);

  const createReservation = useMutation({
    mutationFn: async (values: { until: Dayjs }) =>
      (await api.post('/reservations', { premiseId: currentPremise!.id, until: values.until.format('YYYY-MM-DD') })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['catalog-available-premises'] });
      setOpen(false); form.resetFields(); setCurrentPremise(null);
      message.success('Бронирование создано');
    },
  });

  const reserve = (p: Premise) => { setCurrentPremise(p); setOpen(true); };

  return (
    <Card title="Доступные помещения">
      <Table<Premise>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Код', dataIndex: 'code' },
          { title: 'Тип', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
          { title: 'Адрес', dataIndex: 'address' },
          { title: 'Площадь, м²', dataIndex: 'area' },
          { title: 'Доступно с', dataIndex: 'availableFrom', render: (v) => (v ? String(v).slice(0,10) : 'сейчас') },
          { title: 'Действия', key: 'a', render: (_: any, r) => (
            <Space>
              <Button type="primary" onClick={()=> reserve(r)}>Забронировать</Button>
            </Space>
          )},
        ]}
      />

      <Modal open={open} title={currentPremise ? `Бронирование: ${currentPremise.code ? currentPremise.code + ' — ' : ''}${currentPremise.address}` : 'Бронь'}
        onCancel={()=> { setOpen(false); setCurrentPremise(null); }} onOk={()=> form.submit()} okText="Подтвердить" confirmLoading={createReservation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v)=> createReservation.mutate(v)}>
          <Form.Item label="Действует до" name="until" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(d)=> d.isBefore(dayjs().startOf('day'))} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
