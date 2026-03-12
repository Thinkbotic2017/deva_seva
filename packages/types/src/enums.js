"use strict";
/**
 * All shared enums for the DevaSeva platform.
 * NEVER re-define these locally in any app or module.
 * Import from '@devaseva/types'.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.NotificationStatus = exports.NotificationChannel = exports.FinanceCategoryType = exports.InventoryTransactionType = exports.InventoryUnit = exports.InventoryCategory = exports.ExpenseStatus = exports.LedgerType = exports.SevaBookingStatus = exports.SevaBookingPaymentMode = exports.SevaFrequency = exports.DonationStatus = exports.DonationMode = exports.DevoteeTier = exports.Gender = exports.OtpPurpose = exports.UserRole = exports.TemplePlan = exports.TempleCategory = void 0;
var TempleCategory;
(function (TempleCategory) {
    TempleCategory["HINDU"] = "HINDU";
    TempleCategory["JAIN"] = "JAIN";
    TempleCategory["SIKH"] = "SIKH";
    TempleCategory["BUDDHIST"] = "BUDDHIST";
    TempleCategory["CHRISTIAN"] = "CHRISTIAN";
    TempleCategory["OTHER"] = "OTHER";
})(TempleCategory || (exports.TempleCategory = TempleCategory = {}));
var TemplePlan;
(function (TemplePlan) {
    TemplePlan["STARTER"] = "STARTER";
    TemplePlan["GROWTH"] = "GROWTH";
    TemplePlan["ENTERPRISE"] = "ENTERPRISE";
})(TemplePlan || (exports.TemplePlan = TemplePlan = {}));
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
    UserRole["COUNTER_STAFF"] = "COUNTER_STAFF";
    UserRole["INVENTORY_MANAGER"] = "INVENTORY_MANAGER";
    UserRole["HEAD_PRIEST"] = "HEAD_PRIEST";
    UserRole["PRIEST"] = "PRIEST";
    UserRole["TRUSTEE"] = "TRUSTEE";
})(UserRole || (exports.UserRole = UserRole = {}));
var OtpPurpose;
(function (OtpPurpose) {
    OtpPurpose["LOGIN"] = "LOGIN";
    OtpPurpose["INVITE_ACCEPT"] = "INVITE_ACCEPT";
})(OtpPurpose || (exports.OtpPurpose = OtpPurpose = {}));
var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
})(Gender || (exports.Gender = Gender = {}));
var DevoteeTier;
(function (DevoteeTier) {
    DevoteeTier["REGULAR"] = "REGULAR";
    DevoteeTier["PATRON"] = "PATRON";
    DevoteeTier["VIP"] = "VIP";
    DevoteeTier["LIFE_TRUSTEE"] = "LIFE_TRUSTEE";
})(DevoteeTier || (exports.DevoteeTier = DevoteeTier = {}));
var DonationMode;
(function (DonationMode) {
    DonationMode["CASH"] = "CASH";
    DonationMode["UPI"] = "UPI";
    DonationMode["CARD"] = "CARD";
    DonationMode["CHEQUE"] = "CHEQUE";
    DonationMode["NEFT"] = "NEFT";
    DonationMode["DD"] = "DD";
    DonationMode["ONLINE"] = "ONLINE";
})(DonationMode || (exports.DonationMode = DonationMode = {}));
var DonationStatus;
(function (DonationStatus) {
    DonationStatus["PENDING"] = "PENDING";
    DonationStatus["CONFIRMED"] = "CONFIRMED";
    DonationStatus["RECEIPT_GENERATED"] = "RECEIPT_GENERATED";
    DonationStatus["RECEIPT_SENT"] = "RECEIPT_SENT";
    DonationStatus["CANCELLED"] = "CANCELLED";
})(DonationStatus || (exports.DonationStatus = DonationStatus = {}));
var SevaFrequency;
(function (SevaFrequency) {
    SevaFrequency["DAILY"] = "DAILY";
    SevaFrequency["WEEKLY"] = "WEEKLY";
    SevaFrequency["MONTHLY"] = "MONTHLY";
    SevaFrequency["FESTIVAL"] = "FESTIVAL";
    SevaFrequency["ON_DEMAND"] = "ON_DEMAND";
})(SevaFrequency || (exports.SevaFrequency = SevaFrequency = {}));
var SevaBookingPaymentMode;
(function (SevaBookingPaymentMode) {
    SevaBookingPaymentMode["CASH"] = "CASH";
    SevaBookingPaymentMode["UPI"] = "UPI";
    SevaBookingPaymentMode["CARD"] = "CARD";
    SevaBookingPaymentMode["ONLINE"] = "ONLINE";
})(SevaBookingPaymentMode || (exports.SevaBookingPaymentMode = SevaBookingPaymentMode = {}));
var SevaBookingStatus;
(function (SevaBookingStatus) {
    SevaBookingStatus["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    SevaBookingStatus["CONFIRMED"] = "CONFIRMED";
    SevaBookingStatus["COMPLETED"] = "COMPLETED";
    SevaBookingStatus["CANCELLED"] = "CANCELLED";
    SevaBookingStatus["NO_SHOW"] = "NO_SHOW";
})(SevaBookingStatus || (exports.SevaBookingStatus = SevaBookingStatus = {}));
var LedgerType;
(function (LedgerType) {
    LedgerType["INCOME"] = "INCOME";
    LedgerType["EXPENSE"] = "EXPENSE";
})(LedgerType || (exports.LedgerType = LedgerType = {}));
var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    ExpenseStatus["APPROVED"] = "APPROVED";
    ExpenseStatus["REJECTED"] = "REJECTED";
})(ExpenseStatus || (exports.ExpenseStatus = ExpenseStatus = {}));
var InventoryCategory;
(function (InventoryCategory) {
    InventoryCategory["FLOWERS"] = "FLOWERS";
    InventoryCategory["PRASAD"] = "PRASAD";
    InventoryCategory["INCENSE"] = "INCENSE";
    InventoryCategory["OIL_GHEE"] = "OIL_GHEE";
    InventoryCategory["CLEANING"] = "CLEANING";
    InventoryCategory["MAINTENANCE"] = "MAINTENANCE";
    InventoryCategory["ASSETS"] = "ASSETS";
    InventoryCategory["OTHER"] = "OTHER";
})(InventoryCategory || (exports.InventoryCategory = InventoryCategory = {}));
var InventoryUnit;
(function (InventoryUnit) {
    InventoryUnit["KG"] = "KG";
    InventoryUnit["GRAM"] = "GRAM";
    InventoryUnit["LITRE"] = "LITRE";
    InventoryUnit["ML"] = "ML";
    InventoryUnit["PCS"] = "PCS";
    InventoryUnit["DOZEN"] = "DOZEN";
    InventoryUnit["BOX"] = "BOX";
    InventoryUnit["PACKET"] = "PACKET";
})(InventoryUnit || (exports.InventoryUnit = InventoryUnit = {}));
var InventoryTransactionType;
(function (InventoryTransactionType) {
    InventoryTransactionType["PURCHASE"] = "PURCHASE";
    InventoryTransactionType["CONSUMPTION"] = "CONSUMPTION";
    InventoryTransactionType["ADJUSTMENT"] = "ADJUSTMENT";
    InventoryTransactionType["OPENING_STOCK"] = "OPENING_STOCK";
    InventoryTransactionType["WASTAGE"] = "WASTAGE";
})(InventoryTransactionType || (exports.InventoryTransactionType = InventoryTransactionType = {}));
var FinanceCategoryType;
(function (FinanceCategoryType) {
    FinanceCategoryType["INCOME"] = "INCOME";
    FinanceCategoryType["EXPENSE"] = "EXPENSE";
})(FinanceCategoryType || (exports.FinanceCategoryType = FinanceCategoryType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["WHATSAPP"] = "WHATSAPP";
    NotificationChannel["SMS"] = "SMS";
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["PUSH"] = "PUSH";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["QUEUED"] = "QUEUED";
    NotificationStatus["SENT"] = "SENT";
    NotificationStatus["DELIVERED"] = "DELIVERED";
    NotificationStatus["READ"] = "READ";
    NotificationStatus["FAILED"] = "FAILED";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "CREATE";
    AuditAction["UPDATE"] = "UPDATE";
    AuditAction["DELETE"] = "DELETE";
    AuditAction["CANCEL"] = "CANCEL";
    AuditAction["APPROVE"] = "APPROVE";
    AuditAction["REJECT"] = "REJECT";
    AuditAction["LOGIN"] = "LOGIN";
    AuditAction["LOGOUT"] = "LOGOUT";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
