import React from 'react';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, App as AntApp, Alert } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';

// Types matching backend includes
type Lease = {
  id: string;
  number?: string | null;
  date?: string | null;
  periodFrom: string;
  periodTo?: string | null;
  premiseId: string;
  tenantId: string;
  base: 'M2' | 'FIXED';
  currency: string;
  vatRate: number;
  deposit?: number | null;
  dueDay: number;
  penaltyRatePerDay: number;
  status: 'DRAFT' | 'ACTIVE' | 'TERMINATING' | 'CLOSED';
  premise?: { code?: string | null; address: string; area: number; baseRate?: number | null };
  tenant?: { name: string };
};

type Premise = { id: string; code?: string | null; address: string };

type Tenant = { id: string; name: string };

const rateTypes = [
  { label: 'BYN/м²', value: 'M2' },
  { label: 'Фикс', value: 'FIXED' },
];

export const LeasesPage: React.FC = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { message, modal } = AntApp.useApp();

  const { data: premises } = useQuery<Premise[]>({
    queryKey: ['premises'],
    queryFn: async () => (await api.get('/premises')).data,
  });
  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ['tenants'],
    queryFn: async () => (await api.get('/tenants')).data,
  });
  const { data, isLoading } = useQuery<Lease[]>({
    queryKey: ['leases'],
    queryFn: async () => (await api.get('/leases')).data,
  });

  const [open, setOpen] = React.useState(false);
  const [form] = Form.useForm();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  const [resv, setResv] = React.useState<any | null>(null);
  const premiseIdWatch = Form.useWatch('premiseId', form);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!premiseIdWatch) { setResv(null); return; }
      try {
        const r = await api.get(`/reservations/active-by-premise/${premiseIdWatch}`);
        if (cancelled) return;
        setResv(r.data || null);
        const tId = r.data?.createdBy?.tenantId;
        if (tId && !form.getFieldValue('tenantId')) {
          form.setFieldsValue({ tenantId: tId });
        }
      } catch {
        if (!cancelled) setResv(null);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [premiseIdWatch, form]);

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        periodFrom: (values.period?.from as Dayjs).format('YYYY-MM-DD'),
        periodTo: values.period?.to ? (values.period.to as Dayjs).format('YYYY-MM-DD') : undefined,
        vatRate: values.vatRate !== undefined ? Number(values.vatRate) : undefined,
        deposit: values.deposit !== undefined ? Number(values.deposit) : undefined,
        penaltyRatePerDay: values.penaltyRatePerDay !== undefined ? Number(values.penaltyRatePerDay) : undefined,
        dueDay: Number(values.dueDay),
        reservationId: resv?.id,
      };
      delete (payload as any).period;
      return (await api.post('/leases', payload)).data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['leases'] });
      setOpen(false);
      form.resetFields();
    },
  });

  const doAction = async (id: string, kind: 'activate' | 'terminate' | 'close') => {
    await api.post(`/leases/${id}/${kind}`);
    await qc.invalidateQueries({ queryKey: ['leases'] });
    message.success(kind === 'activate' ? 'Договор активирован' : kind === 'terminate' ? 'Договор помечен к расторжению' : 'Договор закрыт');
  };

  const action = (id: string, kind: 'activate' | 'terminate' | 'close') => async () => {
    if (kind === 'terminate' || kind === 'close') {
      modal.confirm({
        title: kind === 'terminate' ? 'Расторгнуть договор?' : 'Закрыть договор?',
        okText: 'Да', cancelText: 'Нет',
        onOk: () => doAction(id, kind),
      });
    } else {
      doAction(id, kind);
    }
  };

  const filtered = React.useMemo(() => {
    const list = data || [];
    const ql = q.trim().toLowerCase();
    return list.filter((r) => {
      if (status && r.status !== status) return false;
      if (!ql) return true;
      const premise = `${r.premise?.code || ''} ${r.premise?.address || ''}`.toLowerCase();
      const tenant = (r.tenant?.name || '').toLowerCase();
      return premise.includes(ql) || tenant.includes(ql) || (r.number || '').toLowerCase().includes(ql);
    });
  }, [data, q, status]);

  return (
    <Card title="Договоры" extra={<Button type="primary" onClick={() => setOpen(true)}>Добавить</Button>}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search allowClear placeholder="Поиск: арендатор/помещение/№" value={q} onChange={(e)=> setQ(e.target.value)} style={{ width: 320 }} />
        <Select allowClear placeholder="Статус" value={status} onChange={setStatus} style={{ width: 180 }}
          options={[{value:'DRAFT',label:'DRAFT'},{value:'ACTIVE',label:'ACTIVE'},{value:'TERMINATING',label:'TERMINATING'},{value:'CLOSED',label:'CLOSED'}]} />
      </Space>
      <Table<Lease>
        rowKey="id"
        loading={isLoading}
        dataSource={filtered}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '№', dataIndex: 'number' },
          { title: 'Статус', dataIndex: 'status', render: (v) => <Tag color={v==='ACTIVE'?'green':v==='DRAFT'?'default':v==='TERMINATING'?'orange':'blue'}>{v}</Tag> },
          { title: 'Помещение', dataIndex: ['premise','address'], render: (_: any, r) => r.premise?.code ? `${r.premise.code} — ${r.premise.address}` : r.premise?.address },
          { title: 'Арендатор', dataIndex: ['tenant','name'], render: (_: any, r) => r.tenant?.name },
          { title: 'База', dataIndex: 'base' },
          { title: 'Период с', dataIndex: 'periodFrom', render: (v) => String(v).slice(0,10) },
          { title: 'по', dataIndex: 'periodTo', render: (v) => (v ? String(v).slice(0,10) : '') },
          { title: 'Срок оплаты, день', dataIndex: 'dueDay' },
          { title: 'Действия', key: 'actions', render: (_: any, r) => (
            <Space>
              <Button size="small" onClick={() => navigate(`/leases/${r.id}`)}>Подробнее</Button>
              {r.status === 'DRAFT' && <Button size="small" onClick={action(r.id,'activate')}>Активировать</Button>}
              {(r.status === 'ACTIVE' || r.status === 'TERMINATING') && <Button size="small" onClick={action(r.id,'terminate')}>Расторгнуть</Button>}
              {(r.status === 'ACTIVE' || r.status === 'TERMINATING') && <Button danger size="small" onClick={action(r.id,'close')}>Закрыть</Button>}
            </Space>
          )},
        ]}
      />

      <Modal open={open} title="Новый договор" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending} okText="Сохранить">
        <Form form={form} layout="vertical" onFinish={(values)=> createMutation.mutate(values)}>
          <Form.Item label="Помещение" name="premiseId" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={(premises||[]).map(p=>({ label: (p.code? `${p.code} — `:'') + p.address, value: p.id }))} />
          </Form.Item>
          {resv && (
            <Alert
              showIcon
              type="info"
              message={`Резервировал: ${resv?.createdBy?.fullName || resv?.createdBy?.email || '—'}`}
              style={{ marginBottom: 12 }}
            />
          )}
          <Form.Item label="Арендатор" name="tenantId" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={(tenants||[]).map(t=>({ label: t.name, value: t.id }))} />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="Период с" name={['period','from']} rules={[{ required: true }]} style={{ width: '50%' }}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item label="по" name={['period','to']} style={{ width: '50%' }}>
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="База" name="base" rules={[{ required: true }]} style={{ width: '50%' }}>
              <Select options={rateTypes} />
            </Form.Item>
            <Form.Item label="Срок оплаты, день" name="dueDay" rules={[{ required: true }]} style={{ width: '50%' }}>
              <InputNumber min={1} max={28} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Ставка НДС, %" name="vatRate" style={{ width: '33%' }}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Депозит" name="deposit" style={{ width: '33%' }}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Пени, %/день" name="penaltyRatePerDay" style={{ width: '34%' }}>
              <InputNumber min={0} step={0.001} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
        </Form>
      </Modal>
    </Card>
  );
};
