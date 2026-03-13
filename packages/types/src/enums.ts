/**
 * All shared enums for the DevaSeva platform.
 * NEVER re-define these locally in any app or module.
 * Import from '@devaseva/types'.
 */

export enum TempleCategory {
  HINDU = 'HINDU',
  JAIN = 'JAIN',
  SIKH = 'SIKH',
  BUDDHIST = 'BUDDHIST',
  CHRISTIAN = 'CHRISTIAN',
  OTHER = 'OTHER',
}

export enum TemplePlan {
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  COUNTER_STAFF = 'COUNTER_STAFF',
  INVENTORY_MANAGER = 'INVENTORY_MANAGER',
  HEAD_PRIEST = 'HEAD_PRIEST',
  PRIEST = 'PRIEST',
  TRUSTEE = 'TRUSTEE',
}

export enum OtpPurpose {
  LOGIN = 'LOGIN',
  INVITE_ACCEPT = 'INVITE_ACCEPT',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum DevoteeTier {
  REGULAR = 'REGULAR',
  PATRON = 'PATRON',
  VIP = 'VIP',
  LIFE_TRUSTEE = 'LIFE_TRUSTEE',
}

export enum DonationMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  CHEQUE = 'CHEQUE',
  NEFT = 'NEFT',
  DD = 'DD',
  ONLINE = 'ONLINE',
}

export enum DonationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  RECEIPT_GENERATED = 'RECEIPT_GENERATED',
  RECEIPT_SENT = 'RECEIPT_SENT',
  CANCELLED = 'CANCELLED',
}

export enum SevaFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  FESTIVAL = 'FESTIVAL',
  ON_DEMAND = 'ON_DEMAND',
}

export enum SevaBookingPaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
}

export enum SevaBookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum LedgerType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum ExpenseStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum InventoryCategory {
  FLOWERS = 'FLOWERS',
  PRASAD = 'PRASAD',
  INCENSE = 'INCENSE',
  OIL_GHEE = 'OIL_GHEE',
  CLEANING = 'CLEANING',
  MAINTENANCE = 'MAINTENANCE',
  ASSETS = 'ASSETS',
  OTHER = 'OTHER',
}

export enum InventoryUnit {
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  PCS = 'PCS',
  DOZEN = 'DOZEN',
  BOX = 'BOX',
  PACKET = 'PACKET',
}

export enum InventoryTransactionType {
  PURCHASE = 'PURCHASE',
  CONSUMPTION = 'CONSUMPTION',
  ADJUSTMENT = 'ADJUSTMENT',
  OPENING_STOCK = 'OPENING_STOCK',
  WASTAGE = 'WASTAGE',
}

export enum FinanceCategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum NotificationChannel {
  WHATSAPP = 'WHATSAPP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  YEARLY = 'YEARLY',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CANCEL = 'CANCEL',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}
