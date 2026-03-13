import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SevaBookingService } from '../seva-booking.service';
import { FinanceService } from '../../finance/finance.service';
import { SevaBooking } from '../../../database/entities/seva-booking.entity';
import { SevaType } from '../../../database/entities/seva-type.entity';
import { Temple } from '../../../database/entities/temple.entity';
import { FiscalYearUtil } from '../../../common/utils/fiscal-year.util';
import { ReceiptNumberUtil } from '../../../common/utils/receipt-number.util';
import {
  SevaBookingPaymentMode,
  SevaBookingStatus,
  SevaFrequency,
} from '@devaseva/types';
import { CreateSevaBookingDto } from '../dto/create-seva-booking.dto';
import { CancelSevaBookingDto } from '../dto/cancel-seva-booking.dto';

// ─── Mock factories ───────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';
const USER_ID = 'user-uuid';
const BOOKING_ID = 'booking-uuid';
const SEVA_TYPE_ID = 'seva-type-uuid';

const MOCK_SEVA_TYPE: Partial<SevaType> = {
  id: SEVA_TYPE_ID,
  templeId: TEMPLE_ID,
  name: 'Abhishekam',
  maxBookingsPerSlot: 2,
  availableTimeSlots: [{ time: '07:00', label: 'Morning', maxBookings: 2 }],
  frequency: SevaFrequency.DAILY,
  durationMinutes: 60,
  advanceBookingDays: 30,
  requiresSankalpa: false,
  isActive: true,
  isOnlineBookable: false,
  sortOrder: 0,
  pricingTiers: [],
  availableDays: [0, 1, 2, 3, 4, 5, 6],
};

const MOCK_TEMPLE: Partial<Temple> = {
  id: TEMPLE_ID,
  receiptPrefix: 'RAMS',
  isActive: true,
};

const MOCK_BOOKING: Partial<SevaBooking> = {
  id: BOOKING_ID,
  templeId: TEMPLE_ID,
  sevaTypeId: SEVA_TYPE_ID,
  devoteeName: 'Ramesh Kumar',
  sevaDate: '2025-06-15',
  timeSlot: '07:00',
  amount: '1100.00',
  status: SevaBookingStatus.CONFIRMED,
  fiscalYear: '2025-26',
  additionalNames: [],
};

const VALID_CREATE_DTO: CreateSevaBookingDto = {
  sevaTypeId: SEVA_TYPE_ID,
  devoteeName: 'Ramesh Kumar',
  devoteePhone: '9876543210',
  sevaDate: '2025-06-15',
  timeSlot: '07:00',
  amount: 1100,
  paymentMode: SevaBookingPaymentMode.CASH,
};

/**
 * Creates a mock EntityManager that supports create/save/update/getOne/getCount.
 * The query builder chain returns a lockable, filterable stub.
 */
function mockEntityManager(opts: {
  sevaType?: Partial<SevaType> | null;
  existingBookingCount?: number;
}) {
  // Use 'hasOwnProperty' so an explicit null is preserved (not replaced by default)
  const sevaTypeResult =
    Object.prototype.hasOwnProperty.call(opts, 'sevaType')
      ? opts.sevaType
      : MOCK_SEVA_TYPE;
  const bookingCount = opts.existingBookingCount ?? 0;

  const qbBooking = {
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(bookingCount),
  };

  const qbSevaType = {
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(sevaTypeResult),
  };

  return {
    create: jest.fn((Entity: unknown, data: unknown) => ({ ...(data as object), id: BOOKING_ID })),
    save: jest.fn((entity: unknown) =>
      Promise.resolve({ ...(entity as object), id: BOOKING_ID }),
    ),
    update: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn((Entity: unknown) => {
      if (Entity === SevaType) return qbSevaType;
      return qbBooking;
    }),
    // Expose internals so tests can assert on query builder calls
    _qbSevaType: qbSevaType,
    _qbBooking: qbBooking,
  };
}

/** DataSource mock that calls the callback with the mock EntityManager. */
function mockDataSource(
  emOpts: Parameters<typeof mockEntityManager>[0] = {},
) {
  const em = mockEntityManager(emOpts);
  return {
    _em: em,
    transaction: jest.fn(
      (cb: (em: ReturnType<typeof mockEntityManager>) => unknown) => cb(em),
    ),
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('SevaBookingService', () => {
  let service: SevaBookingService;
  let bookingRepo: Record<string, jest.Mock>;
  let sevaTypeRepo: Record<string, jest.Mock>;
  let templeRepo: Record<string, jest.Mock>;
  let financeService: jest.Mocked<FinanceService>;
  let fiscalYearUtil: jest.Mocked<FiscalYearUtil>;
  let receiptNumberUtil: jest.Mocked<ReceiptNumberUtil>;
  let ds: ReturnType<typeof mockDataSource>;

  /** Rebuild the testing module before each test so mocks are fresh. */
  async function buildModule(
    dsOpts: Parameters<typeof mockDataSource>[0] = {},
  ) {
    ds = mockDataSource(dsOpts);

    bookingRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    sevaTypeRepo = {
      findOne: jest.fn().mockResolvedValue(MOCK_SEVA_TYPE),
    };

    templeRepo = {
      findOne: jest.fn().mockResolvedValue(MOCK_TEMPLE),
    };

    financeService = {
      autoPostIncome: jest.fn().mockResolvedValue({}),
      autoPostReversal: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<FinanceService>;

    fiscalYearUtil = {
      fromDate: jest.fn().mockReturnValue('2025-26'),
    } as unknown as jest.Mocked<FiscalYearUtil>;

    receiptNumberUtil = {
      next: jest.fn().mockResolvedValue('RAMSS-2025-26-0001'),
    } as unknown as jest.Mocked<ReceiptNumberUtil>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SevaBookingService,
        { provide: getRepositoryToken(SevaBooking), useValue: bookingRepo },
        { provide: getRepositoryToken(SevaType), useValue: sevaTypeRepo },
        { provide: getRepositoryToken(Temple), useValue: templeRepo },
        { provide: DataSource, useValue: ds },
        { provide: FinanceService, useValue: financeService },
        { provide: FiscalYearUtil, useValue: fiscalYearUtil },
        { provide: ReceiptNumberUtil, useValue: receiptNumberUtil },
      ],
    }).compile();

    service = moduleRef.get(SevaBookingService);
  }

  beforeEach(async () => {
    await buildModule();
  });

  // ── create() ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a CONFIRMED booking for CASH payment and posts income to ledger', async () => {
      const result = await service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID);

      // Booking should be CONFIRMED
      expect(ds._em.create).toHaveBeenCalledWith(
        SevaBooking,
        expect.objectContaining({
          templeId: TEMPLE_ID,
          status: SevaBookingStatus.CONFIRMED,
          amount: '1100.00',
        }),
      );

      // Income must be posted for offline payments
      expect(financeService.autoPostIncome).toHaveBeenCalledWith(
        ds._em,
        expect.objectContaining({
          templeId: TEMPLE_ID,
          sevaBookingId: BOOKING_ID,
          amount: '1100.00',
        }),
      );

      // Booking number generated after commit
      expect(receiptNumberUtil.next).toHaveBeenCalledWith(
        TEMPLE_ID,
        '2025-26',
        'RAMSS',
      );

      expect(result.bookingNumber).toBe('RAMSS-2025-26-0001');
    });

    it('creates a PENDING_PAYMENT booking for ONLINE payment — no income posted', async () => {
      const dto: CreateSevaBookingDto = {
        ...VALID_CREATE_DTO,
        paymentMode: SevaBookingPaymentMode.ONLINE,
      };

      await service.create(TEMPLE_ID, dto, USER_ID);

      expect(ds._em.create).toHaveBeenCalledWith(
        SevaBooking,
        expect.objectContaining({
          status: SevaBookingStatus.PENDING_PAYMENT,
        }),
      );

      // No income entry for online/unconfirmed bookings
      expect(financeService.autoPostIncome).not.toHaveBeenCalled();
      // No booking number generated either
      expect(receiptNumberUtil.next).not.toHaveBeenCalled();
    });

    it('creates a PENDING_PAYMENT booking when paymentMode is omitted', async () => {
      const dto: CreateSevaBookingDto = { ...VALID_CREATE_DTO };
      delete (dto as Partial<CreateSevaBookingDto>).paymentMode;

      await service.create(TEMPLE_ID, dto, USER_ID);

      expect(ds._em.create).toHaveBeenCalledWith(
        SevaBooking,
        expect.objectContaining({ status: SevaBookingStatus.PENDING_PAYMENT }),
      );

      expect(financeService.autoPostIncome).not.toHaveBeenCalled();
    });

    it('always uses templeId from parameter — never from dto', async () => {
      await service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID);

      expect(ds._em.create).toHaveBeenCalledWith(
        SevaBooking,
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
    });

    it('stores amount as decimal string (toFixed(2))', async () => {
      const dto: CreateSevaBookingDto = { ...VALID_CREATE_DTO, amount: 1100 };

      await service.create(TEMPLE_ID, dto, USER_ID);

      expect(ds._em.create).toHaveBeenCalledWith(
        SevaBooking,
        expect.objectContaining({ amount: '1100.00' }),
      );
    });
  });

  // ── Availability check ────────────────────────────────────────────────────────

  describe('availability check (assertSlotAvailable)', () => {
    it('throws UnprocessableEntityException when the slot is full', async () => {
      // Rebuild with a full slot (existing count = maxBookings = 2)
      await buildModule({ sevaType: MOCK_SEVA_TYPE, existingBookingCount: 2 });

      await expect(
        service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID),
      ).rejects.toThrow(UnprocessableEntityException);

      // Income must NOT be posted when slot is full
      expect(financeService.autoPostIncome).not.toHaveBeenCalled();
    });

    it('succeeds when the slot has one free spot (count < max)', async () => {
      await buildModule({ sevaType: MOCK_SEVA_TYPE, existingBookingCount: 1 });

      await expect(
        service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID),
      ).resolves.toBeDefined();
    });

    it('throws NotFoundException when the seva type is not found', async () => {
      await buildModule({ sevaType: null });

      await expect(
        service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('uses per-slot maxBookings from availableTimeSlots config', async () => {
      // Slot '07:00' has maxBookings=1 in this custom config
      const customSevaType: Partial<SevaType> = {
        ...MOCK_SEVA_TYPE,
        maxBookingsPerSlot: 5,
        availableTimeSlots: [{ time: '07:00', label: 'Morning', maxBookings: 1 }],
      };

      await buildModule({ sevaType: customSevaType, existingBookingCount: 1 });

      await expect(
        service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('falls back to entity maxBookingsPerSlot when slot not in availableTimeSlots', async () => {
      const customSevaType: Partial<SevaType> = {
        ...MOCK_SEVA_TYPE,
        maxBookingsPerSlot: 3,
        availableTimeSlots: [], // No slot config → use entity-level limit
      };

      // Slot count = 2, max = 3 → should succeed
      await buildModule({ sevaType: customSevaType, existingBookingCount: 2 });

      await expect(
        service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID),
      ).resolves.toBeDefined();
    });

    it('acquires a pessimistic_write lock on SevaType inside the transaction', async () => {
      await service.create(TEMPLE_ID, VALID_CREATE_DTO, USER_ID);

      expect(ds._em._qbSevaType.setLock).toHaveBeenCalledWith('pessimistic_write');
    });
  });

  // ── findById() ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns the booking when found', async () => {
      bookingRepo.findOne.mockResolvedValue(MOCK_BOOKING);

      const result = await service.findById(TEMPLE_ID, BOOKING_ID);

      expect(result).toEqual(MOCK_BOOKING);
      expect(bookingRepo.findOne).toHaveBeenCalledWith({
        where: { id: BOOKING_ID, templeId: TEMPLE_ID },
      });
    });

    it('throws NotFoundException when booking is not found', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(TEMPLE_ID, BOOKING_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('scopes query to the provided templeId (cross-tenant guard)', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('other-temple', BOOKING_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(bookingRepo.findOne).toHaveBeenCalledWith({
        where: { id: BOOKING_ID, templeId: 'other-temple' },
      });
    });
  });

  // ── cancel() ─────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    const CANCEL_DTO: CancelSevaBookingDto = { reason: 'Devotee requested cancellation' };

    it('cancels a CONFIRMED booking and posts a REVERSAL entry', async () => {
      bookingRepo.findOne.mockResolvedValue({ ...MOCK_BOOKING, status: SevaBookingStatus.CONFIRMED });

      const result = await service.cancel(TEMPLE_ID, BOOKING_ID, CANCEL_DTO, USER_ID);

      // Status updated inside transaction
      expect(ds._em.update).toHaveBeenCalledWith(
        SevaBooking,
        BOOKING_ID,
        expect.objectContaining({
          status: SevaBookingStatus.CANCELLED,
          cancellationReason: CANCEL_DTO.reason,
        }),
      );

      // Reversal entry posted for CONFIRMED bookings
      expect(financeService.autoPostReversal).toHaveBeenCalledWith(
        ds._em,
        expect.objectContaining({
          templeId: TEMPLE_ID,
          sevaBookingId: BOOKING_ID,
          amount: '1100.00',
        }),
      );

      expect(result.status).toBe(SevaBookingStatus.CANCELLED);
    });

    it('cancels a PENDING_PAYMENT booking without posting a reversal', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...MOCK_BOOKING,
        status: SevaBookingStatus.PENDING_PAYMENT,
      });

      await service.cancel(TEMPLE_ID, BOOKING_ID, CANCEL_DTO, USER_ID);

      expect(ds._em.update).toHaveBeenCalledWith(
        SevaBooking,
        BOOKING_ID,
        expect.objectContaining({ status: SevaBookingStatus.CANCELLED }),
      );

      // No reversal for PENDING_PAYMENT (no income was posted)
      expect(financeService.autoPostReversal).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when booking does not exist for the temple', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancel(TEMPLE_ID, BOOKING_ID, CANCEL_DTO, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when booking is already CANCELLED', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...MOCK_BOOKING,
        status: SevaBookingStatus.CANCELLED,
      });

      await expect(
        service.cancel(TEMPLE_ID, BOOKING_ID, CANCEL_DTO, USER_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when booking is COMPLETED', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...MOCK_BOOKING,
        status: SevaBookingStatus.COMPLETED,
      });

      await expect(
        service.cancel(TEMPLE_ID, BOOKING_ID, CANCEL_DTO, USER_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException when booking is NO_SHOW', async () => {
      bookingRepo.findOne.mockResolvedValue({
        ...MOCK_BOOKING,
        status: SevaBookingStatus.NO_SHOW,
      });

      await expect(
        service.cancel(TEMPLE_ID, BOOKING_ID, CANCEL_DTO, USER_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
