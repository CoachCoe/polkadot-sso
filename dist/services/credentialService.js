"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialService = void 0;
const crypto = __importStar(require("crypto"));
const encryption_1 = require("../utils/encryption");
class CredentialService {
    constructor(db) {
        this.db = db;
    }
    async createUserProfile(address, profileData) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const profile = {
            id,
            address,
            display_name: profileData.display_name,
            email: profileData.email,
            avatar_url: profileData.avatar_url,
            bio: profileData.bio,
            website: profileData.website,
            location: profileData.location,
            timezone: profileData.timezone,
            preferences: profileData.preferences ? JSON.stringify(profileData.preferences) : undefined,
            created_at: now,
            updated_at: now,
            last_login_at: now,
            is_verified: false,
            verification_level: 0,
        };
        await this.db.run(`INSERT INTO user_profiles (
        id, address, display_name, email, avatar_url, bio, website,
        location, timezone, preferences, created_at, updated_at,
        last_login_at, is_verified, verification_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            profile.id,
            profile.address,
            profile.display_name,
            profile.email,
            profile.avatar_url,
            profile.bio,
            profile.website,
            profile.location,
            profile.timezone,
            profile.preferences,
            profile.created_at,
            profile.updated_at,
            profile.last_login_at,
            profile.is_verified,
            profile.verification_level,
        ]);
        return profile;
    }
    async getUserProfile(address) {
        return this.db.get('SELECT * FROM user_profiles WHERE address = ?', [address]);
    }
    async updateUserProfile(address, updates) {
        const setFields = [];
        const values = [];
        if (updates.display_name !== undefined) {
            setFields.push('display_name = ?');
            values.push(updates.display_name);
        }
        if (updates.email !== undefined) {
            setFields.push('email = ?');
            values.push(updates.email);
        }
        if (updates.avatar_url !== undefined) {
            setFields.push('avatar_url = ?');
            values.push(updates.avatar_url);
        }
        if (updates.bio !== undefined) {
            setFields.push('bio = ?');
            values.push(updates.bio);
        }
        if (updates.website !== undefined) {
            setFields.push('website = ?');
            values.push(updates.website);
        }
        if (updates.location !== undefined) {
            setFields.push('location = ?');
            values.push(updates.location);
        }
        if (updates.timezone !== undefined) {
            setFields.push('timezone = ?');
            values.push(updates.timezone);
        }
        if (updates.preferences !== undefined) {
            setFields.push('preferences = ?');
            values.push(typeof updates.preferences === 'string'
                ? updates.preferences
                : JSON.stringify(updates.preferences));
        }
        if (updates.is_verified !== undefined) {
            setFields.push('is_verified = ?');
            values.push(updates.is_verified);
        }
        if (updates.verification_level !== undefined) {
            setFields.push('verification_level = ?');
            values.push(updates.verification_level);
        }
        setFields.push('updated_at = ?');
        values.push(Date.now());
        values.push(address);
        await this.db.run(`UPDATE user_profiles SET ${setFields.join(', ')} WHERE address = ?`, values);
    }
    async createCredentialType(creatorAddress, typeData) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const credentialType = {
            id,
            ...typeData,
            created_at: now,
            updated_at: now,
            created_by: creatorAddress,
        };
        await this.db.run(`INSERT INTO credential_types (
        id, name, description, schema_version, schema_definition,
        issuer_pattern, required_fields, optional_fields, validation_rules,
        is_active, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            credentialType.id,
            credentialType.name,
            credentialType.description,
            credentialType.schema_version,
            credentialType.schema_definition,
            credentialType.issuer_pattern,
            credentialType.required_fields,
            credentialType.optional_fields,
            credentialType.validation_rules,
            credentialType.is_active,
            credentialType.created_at,
            credentialType.updated_at,
            credentialType.created_by,
        ]);
        return credentialType;
    }
    async getCredentialType(id) {
        return this.db.get('SELECT * FROM credential_types WHERE id = ? AND is_active = 1', [id]);
    }
    async getActiveCredentialTypes() {
        return this.db.all('SELECT * FROM credential_types WHERE is_active = 1 ORDER BY name');
    }
    async createCredential(issuerAddress, userAddress, request) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const encryptedData = (0, encryption_1.encryptData)(JSON.stringify(request.credential_data));
        const dataHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(request.credential_data))
            .digest('hex');
        const credential = {
            id,
            user_address: userAddress,
            credential_type_id: request.credential_type_id,
            issuer_address: issuerAddress,
            credential_data: encryptedData,
            credential_hash: dataHash,
            status: 'active',
            issued_at: now,
            expires_at: request.expires_at,
            created_at: now,
            updated_at: now,
            metadata: request.metadata ? JSON.stringify(request.metadata) : undefined,
        };
        await this.db.run(`INSERT INTO credentials (
        id, user_address, credential_type_id, issuer_address, issuer_name,
        credential_data, credential_hash, proof_signature, proof_type,
        status, issued_at, expires_at, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            credential.id,
            credential.user_address,
            credential.credential_type_id,
            credential.issuer_address,
            credential.issuer_name,
            credential.credential_data,
            credential.credential_hash,
            credential.proof_signature,
            credential.proof_type,
            credential.status,
            credential.issued_at,
            credential.expires_at,
            credential.created_at,
            credential.updated_at,
            credential.metadata,
        ]);
        return credential;
    }
    async getCredential(id) {
        return this.db.get('SELECT * FROM credentials WHERE id = ?', [id]);
    }
    async getUserCredentials(userAddress) {
        return this.db.all('SELECT * FROM credentials WHERE user_address = ? ORDER BY created_at DESC', [userAddress]);
    }
    async getCredentialData(credentialId) {
        const credential = await this.getCredential(credentialId);
        if (!credential)
            return null;
        try {
            const decryptedData = (0, encryption_1.decryptData)(credential.credential_data);
            return JSON.parse(decryptedData);
        }
        catch (error) {
            console.error('Failed to decrypt credential data:', error);
            return null;
        }
    }
    async shareCredential(ownerAddress, request) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const share = {
            id,
            credential_id: request.credential_id,
            owner_address: ownerAddress,
            shared_with_address: request.shared_with_address,
            shared_with_client_id: request.shared_with_client_id,
            permissions: JSON.stringify(request.permissions),
            access_level: request.access_level,
            expires_at: request.expires_at,
            created_at: now,
            created_by: ownerAddress,
            is_active: true,
        };
        await this.db.run(`INSERT INTO credential_shares (
        id, credential_id, owner_address, shared_with_address,
        shared_with_client_id, permissions, access_level, expires_at,
        created_at, created_by, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            share.id,
            share.credential_id,
            share.owner_address,
            share.shared_with_address,
            share.shared_with_client_id,
            share.permissions,
            share.access_level,
            share.expires_at,
            share.created_at,
            share.created_by,
            share.is_active,
        ]);
        return share;
    }
    async getSharedCredentials(userAddress) {
        return this.db.all(`SELECT cs.*, c.* FROM credential_shares cs
       JOIN credentials c ON cs.credential_id = c.id
       WHERE cs.shared_with_address = ? AND cs.is_active = 1
       AND (cs.expires_at IS NULL OR cs.expires_at > ?)
       ORDER BY cs.created_at DESC`, [userAddress, Date.now()]);
    }
    async revokeCredentialShare(shareId) {
        await this.db.run('UPDATE credential_shares SET is_active = 0 WHERE id = ?', [shareId]);
    }
    async verifyCredential(verifierAddress, request) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const verification = {
            id,
            credential_id: request.credential_id,
            verifier_address: verifierAddress,
            verification_type: request.verification_type,
            verification_data: request.verification_data
                ? JSON.stringify(request.verification_data)
                : undefined,
            status: 'verified',
            verified_at: now,
            created_at: now,
            notes: request.notes,
        };
        await this.db.run(`INSERT INTO credential_verifications (
        id, credential_id, verifier_address, verification_type,
        verification_data, verification_signature, status, verified_at,
        expires_at, created_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            verification.id,
            verification.credential_id,
            verification.verifier_address,
            verification.verification_type,
            verification.verification_data,
            verification.verification_signature,
            verification.status,
            verification.verified_at,
            verification.expires_at,
            verification.created_at,
            verification.notes,
        ]);
        return verification;
    }
    async getCredentialVerifications(credentialId) {
        return this.db.all('SELECT * FROM credential_verifications WHERE credential_id = ? ORDER BY created_at DESC', [credentialId]);
    }
    async revokeCredential(credentialId, revokedByAddress, reason) {
        const id = crypto.randomUUID();
        const now = Date.now();
        await this.db.run('UPDATE credentials SET status = ?, updated_at = ? WHERE id = ?', [
            'revoked',
            now,
            credentialId,
        ]);
        const revocation = {
            id,
            credential_id: credentialId,
            revoked_by_address: revokedByAddress,
            revocation_reason: reason,
            revoked_at: now,
            created_at: now,
        };
        await this.db.run(`INSERT INTO credential_revocations (
        id, credential_id, revoked_by_address, revocation_reason,
        revocation_signature, revoked_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            revocation.id,
            revocation.credential_id,
            revocation.revoked_by_address,
            revocation.revocation_reason,
            revocation.revocation_signature,
            revocation.revoked_at,
            revocation.created_at,
        ]);
        return revocation;
    }
    async createIssuanceRequest(requesterAddress, request) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const issuanceRequest = {
            id,
            requester_address: requesterAddress,
            issuer_address: request.issuer_address,
            credential_type_id: request.credential_type_id,
            template_id: request.template_id,
            request_data: JSON.stringify(request.request_data),
            status: 'pending',
            created_at: now,
            updated_at: now,
            expires_at: request.expires_at,
        };
        await this.db.run(`INSERT INTO issuance_requests (
        id, requester_address, issuer_address, credential_type_id,
        template_id, request_data, status, approved_at, rejected_at,
        rejection_reason, issued_credential_id, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            issuanceRequest.id,
            issuanceRequest.requester_address,
            issuanceRequest.issuer_address,
            issuanceRequest.credential_type_id,
            issuanceRequest.template_id,
            issuanceRequest.request_data,
            issuanceRequest.status,
            issuanceRequest.approved_at,
            issuanceRequest.rejected_at,
            issuanceRequest.rejection_reason,
            issuanceRequest.issued_credential_id,
            issuanceRequest.created_at,
            issuanceRequest.updated_at,
            issuanceRequest.expires_at,
        ]);
        return issuanceRequest;
    }
    async getPendingIssuanceRequests(issuerAddress) {
        return this.db.all(`SELECT * FROM issuance_requests
       WHERE issuer_address = ? AND status = 'pending'
       AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY created_at ASC`, [issuerAddress, Date.now()]);
    }
    async approveIssuanceRequest(requestId, approvedBy, issuedCredentialId) {
        const now = Date.now();
        await this.db.run(`UPDATE issuance_requests SET
       status = ?, approved_at = ?, issued_credential_id = ?, updated_at = ?
       WHERE id = ?`, ['issued', now, issuedCredentialId, now, requestId]);
    }
    async rejectIssuanceRequest(requestId, rejectedBy, reason) {
        const now = Date.now();
        await this.db.run(`UPDATE issuance_requests SET
       status = ?, rejected_at = ?, rejection_reason = ?, updated_at = ?
       WHERE id = ?`, ['rejected', now, reason, now, requestId]);
    }
    async cleanupExpiredCredentials() {
        const now = Date.now();
        await this.db.run(`UPDATE credentials SET status = 'expired', updated_at = ?
       WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'active'`, [now, now]);
        await this.db.run(`UPDATE credential_shares SET is_active = 0
       WHERE expires_at IS NOT NULL AND expires_at < ? AND is_active = 1`, [now]);
        await this.db.run(`UPDATE credential_verifications SET status = 'expired'
       WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'verified'`, [now]);
        await this.db.run(`UPDATE issuance_requests SET status = 'expired'
       WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'pending'`, [now]);
    }
}
exports.CredentialService = CredentialService;
//# sourceMappingURL=credentialService.js.map