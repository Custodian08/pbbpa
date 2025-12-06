import React from 'react';
import { Button, Card, Form, InputNumber, Modal, Table, DatePicker, Tag } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import dayjs, { Dayjs } from 'dayjs';

 type Vat = { id: number; rate: number; validFrom: string };

export const AdminSettingsPage: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Vat[]>({ queryKey: ['vat-settings'], queryFn: async () => (await api.get('/settings/vat')).data });

  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();

  const createVat = useMutation({
    mutationFn: async (values: { rate: number; validFrom: Dayjs }) => (await api.post('/settings/vat', {
      rate: Number(values.rate), validFrom: values.validFrom.format('YYYY-MM-DD')
    })).data,
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['vat-settings'] }); setOpen(false); form.resetFields(); },
  });

  return (
    <Card title="Настройки НДС" extra={<Button type="primary" onClick={()=> setOpen(true)}>Добавить ставку</Button>}>
      <Table<Vat>
        rowKey={(r)=> String(r.id)}
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Ставка, %', dataIndex: 'rate', render: (v)=> <Tag>{v}</Tag> },
          { title: 'Действует с', dataIndex: 'validFrom', render: (v)=> String(v).slice(0,10) },
        ]}
      />

      <Modal open={open} title="Новая ставка НДС" onCancel={()=> setOpen(false)} onOk={()=> form.submit()} okText="Сохранить" confirmLoading={createVat.isPending}>
        <Form form={form} layout="vertical" onFinish={(v)=> createVat.mutate(v)} initialValues={{ rate: 20, validFrom: dayjs() }}>
          <Form.Item label="Ставка, %" name="rate" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Действует с" name="validFrom" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
