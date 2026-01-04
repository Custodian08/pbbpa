import React from 'react';
import { Card, Col, Row, Statistic, Table, Tag } from 'antd';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

 type Occupancy = { total: number; rented: number; reserved: number; free: number; occupancy: number };
 type MonthlyRow = { period: string; accruals: number; payments: number };
 type Aging = { ['0-30']: number; ['31-60']: number; ['61-90']: number; ['90+']: number };
type Kpi = { accrualMonth: number; paymentsMonth: number; agingTotal: number; occupancy: any };

 export const DashboardPage: React.FC = () => {
  const { data: occ } = useQuery<Occupancy>({ queryKey: ['analytics','occupancy'], queryFn: async () => (await api.get('/analytics/occupancy')).data });
  const { data: monthly } = useQuery<MonthlyRow[]>({ queryKey: ['analytics','monthly'], queryFn: async () => (await api.get('/analytics/monthly', { params: { months: 12 } })).data });
  const { data: aging } = useQuery<Aging>({ queryKey: ['analytics','aging'], queryFn: async () => (await api.get('/analytics/aging')).data });
  const { data: kpi } = useQuery<Kpi>({ queryKey: ['analytics','kpi'], queryFn: async () => (await api.get('/analytics/kpi')).data });

  const monthlyData = (monthly || []).map((r) => ({ period: String(r.period).slice(0,7), accruals: r.accruals, payments: r.payments }));
  const occPie = occ ? [
    { name: 'Сдано', value: occ.rented, color: '#3f8600' },
    { name: 'Забронировано', value: occ.reserved, color: '#faad14' },
    { name: 'Свободно', value: occ.free, color: '#1677ff' },
  ] : [];

  return (
    <Row gutter={[16,16]}>
      <Col xs={24} sm={12} md={6}>
        <Card><Statistic title="Всего помещений" value={occ?.total ?? 0} /></Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card><Statistic title="Арендуется" value={occ?.rented ?? 0} /></Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card><Statistic title="Резерв" value={occ?.reserved ?? 0} /></Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card><Statistic title="Загрузка (Occupancy)" valueStyle={{ color: '#3f8600' }} value={(occ?.occupancy ?? 0) * 100} precision={1} suffix="%" /></Card>
      </Col>

      <Col xs={24} sm={12} md={8}>
        <Card><Statistic title="Начислено за месяц" value={kpi?.accrualMonth ?? 0} precision={2} /></Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card><Statistic title="Оплачено за месяц" value={kpi?.paymentsMonth ?? 0} precision={2} /></Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card><Statistic title="Дебиторка (всего)" value={kpi?.agingTotal ?? 0} precision={2} /></Card>
      </Col>

      <Col xs={24} md={16}>
        <Card title="Начисления vs Оплаты (месячная динамика)">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="accruals" name="Начислено" fill="#1677ff" />
                <Bar dataKey="payments" name="Оплачено" fill="#52c41a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card title="Загрузка по типам статусов">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={occPie} dataKey="value" nameKey="name" outerRadius={100} label>
                  {occPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>

      <Col span={24}>
        <Card title="Начисления / Оплаты по месяцам">
          <Table<MonthlyRow>
            rowKey={(r)=> r.period}
            size="small"
            pagination={false}
            dataSource={monthly || []}
            columns={[
              { title: 'Период', dataIndex: 'period' },
              { title: 'Начислено', dataIndex: 'accruals' },
              { title: 'Оплачено', dataIndex: 'payments' },
            ]}
          />
        </Card>
      </Col>

      <Col span={24}>
        <Card title="Дебиторка (aging)">
          <Table<{ bucket: string; amount: number }>
            rowKey={(r)=> r.bucket}
            size="small"
            pagination={false}
            dataSource={aging ? [
              { bucket: '0-30', amount: aging['0-30'] },
              { bucket: '31-60', amount: aging['31-60'] },
              { bucket: '61-90', amount: aging['61-90'] },
              { bucket: '90+', amount: aging['90+'] },
            ] : []}
            columns={[
              { title: 'Корзина', dataIndex: 'bucket', render: (v)=> <Tag>{v}</Tag> },
              { title: 'Сумма', dataIndex: 'amount' },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
 }
