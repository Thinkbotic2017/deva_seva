/**
 * All shared enums for the DevaSeva platform.
 * NEVER re-define these locally in any app or module.
 * Import from '@devaseva/types'.
 */
export declare enum TempleCategory {
    HINDU = "HINDU",
    JAIN = "JAIN",
    SIKH = "SIKH",
    BUDDHIST = "BUDDHIST",
    CHRISTIAN = "CHRISTIAN",
    OTHER = "OTHER"
}
export declare enum TemplePlan {
    STARTER = "STARTER",
    GROWTH = "GROWTH",
    ENTERPRISE = "ENTERPRISE"
}
export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    ACCOUNTANT = "ACCOUNTANT",
    COUNTER_STAFF = "COUNTER_STAFF",
    INVENTORY_MANAGER = "INVENTORY_MANAGER",
    HEAD_PRIEST = "HEAD_PRIEST",
    PRIEST = "PRIEST",
    TRUSTEE = "TRUSTEE"
}
export declare enum OtpPurpose {
    LOGIN = "LOGIN",
    INVITE_ACCEPT = "INVITE_ACCEPT"
}
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
export declare enum DevoteeTier {
    REGULAR = "REGULAR",
    PATRON = "PATRON",
    VIP = "VIP",
    LIFE_TRUSTEE = "LIFE_TRUSTEE"
}
export declare enum DonationMode {
    CASH = "CASH",
    UPI = "UPI",
    CARD = "CARD",
    CHEQUE = "CHEQUE",
    NEFT = "NEFT",
    DD = "DD",
    ONLINE = "ONLINE"
}
export declare enum DonationStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    RECEIPT_GENERATED = "RECEIPT_GENERATED",
    RECEIPT_SENT = "RECEIPT_SENT",
    CANCELLED = "CANCELLED"
}
export declare enum SevaFrequency {
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    FESTIVAL = "FESTIVAL",
    ON_DEMAND = "ON_DEMAND"
}
export declare enum SevaBookingPaymentMode {
    CASH = "CASH",
    UPI = "UPI",
    CARD = "CARD",
    ONLINE = "ONLINE"
}
export declare enum SevaBookingStatus {
    PENDING_PAYMENT = "PENDING_PAYMENT",
    CONFIRMED = "CONFIRMED",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    NO_SHOW = "NO_SHOW"
}
export declare enum LedgerType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE"
}
export declare enum ExpenseStatus {
    PENDING_APPROVAL = "PENDING_APPROVAL",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare enum InventoryCategory {
    FLOWERS = "FLOWERS",
    PRASAD = "PRASAD",
    INCENSE = "INCENSE",
    OIL_GHEE = "OIL_GHEE",
    CLEANING = "CLEANING",
    MAINTENANCE = "MAINTENANCE",
    ASSETS = "ASSETS",
    OTHER = "OTHER"
}
export declare enum InventoryUnit {
    KG = "KG",
    GRAM = "GRAM",
    LITRE = "LITRE",
    ML = "ML",
    PCS = "PCS",
    DOZEN = "DOZEN",
    BOX = "BOX",
    PACKET = "PACKET"
}
export declare enum InventoryTransactionType {
    PURCHASE = "PURCHASE",
    CONSUMPTION = "CONSUMPTION",
    ADJUSTMENT = "ADJUSTMENT",
    OPENING_STOCK = "OPENING_STOCK",
    WASTAGE = "WASTAGE"
}
export declare enum FinanceCategoryType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE"
}
export declare enum NotificationChannel {
    WHATSAPP = "WHATSAPP",
    SMS = "SMS",
    EMAIL = "EMAIL",
    PUSH = "PUSH"
}
export declare enum NotificationStatus {
    QUEUED = "QUEUED",
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    READ = "READ",
    FAILED = "FAILED"
}
export declare enum AuditAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    CANCEL = "CANCEL",
    APPROVE = "APPROVE",
    REJECT = "REJECT",
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT"
}
