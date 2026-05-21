import { EntityManager } from '@mikro-orm/core';
import { BillDashboardService } from './bill-dashboard.service';
import { BillDashboardQueryDto } from './dto/bill-dashboard.dto';

function makeService() {
  const conn = { execute: jest.fn() };
  const em = {
    getConnection: jest.fn().mockReturnValue(conn),
  } as unknown as EntityManager;
  return { service: new BillDashboardService(em), conn };
}

const userId = 'user-1';

describe('BillDashboardService', () => {
  describe('getDashboard — month view', () => {
    it('fills all 30 days of April; zero-fills missing days', async () => {
      const { service, conn } = makeService();
      conn.execute
        .mockResolvedValueOnce([{ period: '2026-04-15', total: '1192.21' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const dto: BillDashboardQueryDto = {
        type: 'month',
        year: 2026,
        month: 4,
      };
      const result = await service.getDashboard(userId, dto);

      expect(result.period_totals).toHaveLength(30);
      expect(
        result.period_totals.find((p) => p.period === '2026-04-15')?.total,
      ).toBeCloseTo(1192.21);
      expect(
        result.period_totals.find((p) => p.period === '2026-04-01')?.total,
      ).toBe(0);
    });
  });

  describe('getDashboard — quarter view', () => {
    it('returns 3 monthly entries for Q2; fills gap in May', async () => {
      const { service, conn } = makeService();
      conn.execute
        .mockResolvedValueOnce([
          { period: '2026-04', total: '3000' },
          { period: '2026-06', total: '2500' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const dto: BillDashboardQueryDto = {
        type: 'quarter',
        year: 2026,
        quarter: 2,
      };
      const result = await service.getDashboard(userId, dto);

      expect(result.period_totals).toHaveLength(3);
      expect(result.period_totals[1].period).toBe('2026-05');
      expect(result.period_totals[1].total).toBe(0);
    });
  });

  describe('getDashboard — year view', () => {
    it('returns 12 monthly entries', async () => {
      const { service, conn } = makeService();
      conn.execute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const dto: BillDashboardQueryDto = { type: 'year', year: 2026 };
      const result = await service.getDashboard(userId, dto);

      expect(result.period_totals).toHaveLength(12);
      expect(result.period_totals[0].period).toBe('2026-01');
      expect(result.period_totals[11].period).toBe('2026-12');
    });
  });

  describe('getDashboard — category_stats', () => {
    it('computes percentages from category totals', async () => {
      const { service, conn } = makeService();
      conn.execute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { category_id: 'cat-1', category_name: 'Dairy', total_amount: '450' },
          {
            category_id: 'cat-2',
            category_name: 'Meat & Fish',
            total_amount: '550',
          },
        ]);

      const dto: BillDashboardQueryDto = {
        type: 'month',
        year: 2026,
        month: 4,
      };
      const result = await service.getDashboard(userId, dto);

      expect(result.category_stats[0].percentage).toBeCloseTo(45);
      expect(result.category_stats[1].percentage).toBeCloseTo(55);
    });

    it('returns [] when no categorized spending', async () => {
      const { service, conn } = makeService();
      conn.execute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboard(userId, {
        type: 'month',
        year: 2026,
        month: 4,
      });
      expect(result.category_stats).toEqual([]);
    });
  });

  describe('getDashboard — bills', () => {
    it('maps raw DB row to DashboardBillSummaryDto with numeric casts', async () => {
      const { service, conn } = makeService();
      conn.execute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'bill-1',
            bill_date: '2026-04-15',
            total_amount: '1192.21',
            currency: 'MDL',
            market_name: 'Nr.1 SUPERMARKET',
            items_count: '25',
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboard(userId, {
        type: 'month',
        year: 2026,
        month: 4,
      });

      expect(result.bills[0]).toEqual({
        id: 'bill-1',
        bill_date: '2026-04-15',
        total_amount: 1192.21,
        currency: 'MDL',
        market_name: 'Nr.1 SUPERMARKET',
        items_count: 25,
      });
    });
  });
});
