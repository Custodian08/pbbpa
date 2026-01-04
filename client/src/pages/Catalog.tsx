import React from 'react';
import { Button, Card, DatePicker, Form, Modal, Space, Tag, App as AntApp, Row, Col, Typography, Divider } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../modules/auth/AuthContext';
import { labelPremiseType, labelPremiseStatus, labelRateType } from '../i18n/labels';

 type Premise = {
  id: string;
  code?: string | null;
  type: 'OFFICE' | 'RETAIL' | 'WAREHOUSE';
  address: string;
  area: number;
  availableFrom?: string | null;
  status?: 'FREE' | 'RESERVED' | 'RENTED';
  rateType?: 'M2' | 'FIXED';
  baseRate?: number | null;
};

export const CatalogPage: React.FC = () => {
  const qc = useQueryClient();
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  const roles = (user?.roles || []) as string[];
  const isStaff = roles.some(r => ['ADMIN','OPERATOR','MANAGER','EXEC','ANALYST'].includes(r));
  const { data, isLoading } = useQuery<Premise[]>({
    queryKey: ['catalog', isStaff ? 'all' : 'available'],
    queryFn: async () => (await api.get(isStaff ? '/premises' : '/premises/available')).data,
  });

  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();
  const [currentPremise, setCurrentPremise] = React.useState<Premise | null>(null);

  const createReservation = useMutation({
    mutationFn: async (values: { until: Dayjs }) =>
      (await api.post('/reservations', { premiseId: currentPremise!.id, until: values.until.format('YYYY-MM-DD') })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['catalog'] });
      await qc.invalidateQueries({ queryKey: ['me','reservations'] });
      setOpen(false); form.resetFields(); setCurrentPremise(null);
      message.success('Бронирование создано');
    },
  });

  // Кнопку «Арендовать и оплатить» убрали по требованию

  const reserve = (p: Premise) => { setCurrentPremise(p); setOpen(true); };

  const statusTag = (s?: string) => {
    if (!s) return null;
    const color = s==='FREE' ? 'green' : s==='RESERVED' ? 'orange' : 'red';
    return <Tag color={color}>{labelPremiseStatus(s)}</Tag>;
  };

  return (
    <Card title={isStaff ? 'Каталог помещений' : 'Доступные помещения'} loading={isLoading}>
      <Row gutter={[16,16]}>
        {(data||[]).map(p => (
          <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
            <Card hoverable>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Typography.Text strong>{p.code || 'Без кода'}</Typography.Text>
                  {isStaff && statusTag(p.status)}
                </Space>
                <Typography.Text>{p.address}</Typography.Text>
                <Space size={8}>
                  <Tag>{labelPremiseType(p.type)}</Tag>
                  <Tag>{p.area} м²</Tag>
                  {p.rateType && <Tag>{labelRateType(p.rateType)}{p.baseRate? ` ${p.baseRate}`: ''}</Tag>}
                </Space>
                <Divider style={{ margin: '8px 0' }} />
                <Space>
                  <Button type="primary" disabled={p.status && p.status!=='FREE'} onClick={()=> reserve(p)}>Забронировать</Button>
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

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
