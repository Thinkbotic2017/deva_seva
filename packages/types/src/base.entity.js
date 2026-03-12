"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantBaseEntity = exports.BaseEntity = void 0;
/**
 * Base entity classes shared across all apps.
 * Every entity in the platform extends one of these.
 */
const typeorm_1 = require("typeorm");
/**
 * BaseEntity provides standard audit columns (id, created_at, updated_at, deleted_at).
 * Used by tables that are NOT tenant-scoped (e.g., temples, otp_sessions).
 */
class BaseEntity {
}
exports.BaseEntity = BaseEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BaseEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BaseEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], BaseEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], BaseEntity.prototype, "deletedAt", void 0);
/**
 * TenantBaseEntity extends BaseEntity with temple_id.
 * EVERY table that stores per-temple data MUST extend this class.
 * Security rule: NEVER query a TenantBaseEntity subclass without WHERE temple_id = :templeId.
 */
class TenantBaseEntity extends BaseEntity {
}
exports.TenantBaseEntity = TenantBaseEntity;
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'temple_id', type: 'uuid' }),
    __metadata("design:type", String)
], TenantBaseEntity.prototype, "templeId", void 0);
