/**
 * BaseEntity provides standard audit columns (id, created_at, updated_at, deleted_at).
 * Used by tables that are NOT tenant-scoped (e.g., temples, otp_sessions).
 */
export declare abstract class BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}
/**
 * TenantBaseEntity extends BaseEntity with temple_id.
 * EVERY table that stores per-temple data MUST extend this class.
 * Security rule: NEVER query a TenantBaseEntity subclass without WHERE temple_id = :templeId.
 */
export declare abstract class TenantBaseEntity extends BaseEntity {
    templeId: string;
}
