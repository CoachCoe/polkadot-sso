import * as crypto from 'crypto';
import { getDatabaseConnection, releaseDatabaseConnection } from '../../../config/db';
import { getCacheStrategies } from '../../../services/cacheService';
import { decryptData, encryptData } from '../../../utils/encryption';
import { createLogger } from '../../../utils/logger';
import {
  CreateCredentialRequest,
  CreateIssuanceRequest,
  Credential,
  CredentialRevocation,
  CredentialShare,
  CredentialType,
  CredentialVerification,
  IssuanceRequest,
  ShareCredentialRequest,
  UserProfile,
  VerifyCredentialRequest,
} from '../types/credential';

const logger = createLogger('credential-service');

interface CreateCredentialTypeRequest {
  name: string;
  description?: string;
  schema_version: string;
  schema_definition: Record<string, unknown>;
  issuer_pattern?: string;
  required_fields: string[];
  optional_fields: string[];
  validation_rules: Record<string, unknown>;
  created_by: string;
}

export class CredentialService {
  constructor() {}

  async createUserProfile(
    address: string,
    profileData: Partial<UserProfile>
  ): Promise<UserProfile> {
    let db: any = null;
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const profile: UserProfile = {
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

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO user_profiles (
          id, address, display_name, email, avatar_url, bio, website,
          location, timezone, preferences, created_at, updated_at,
          last_login_at, is_verified, verification_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
        ]
      );

      const cacheStrategies = getCacheStrategies();
      await cacheStrategies.setUserProfile(address, profile);

      logger.info('User profile created successfully', { address, profileId: id });
      return profile;
    } catch (error) {
      logger.error('Failed to create user profile', {
        error: error instanceof Error ? error.message : String(error),
        address,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getUserProfile(address: string): Promise<UserProfile | undefined> {
    let db: any = null;
    try {
      const cacheStrategies = getCacheStrategies();
      let profile = (await cacheStrategies.getUserProfile(address)) as UserProfile | null;

      if (!profile) {
        db = await getDatabaseConnection();
        profile = (await db.get('SELECT * FROM user_profiles WHERE address = ?', [
          address,
        ])) as UserProfile | null;

        if (profile) {
          await cacheStrategies.setUserProfile(address, profile);
        }
      }

      return profile || undefined;
    } catch (error) {
      logger.error('Failed to get user profile', {
        error: error instanceof Error ? error.message : String(error),
        address,
      });
      return undefined;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async updateUserProfile(address: string, updates: Partial<UserProfile>): Promise<void> {
    let db: any = null;
    try {
      const setFields: string[] = [];
      const values: unknown[] = [];

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
        values.push(
          typeof updates.preferences === 'string'
            ? updates.preferences
            : JSON.stringify(updates.preferences)
        );
      }
      if (updates.last_login_at !== undefined) {
        setFields.push('last_login_at = ?');
        values.push(updates.last_login_at);
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

      db = await getDatabaseConnection();
      await db.run(`UPDATE user_profiles SET ${setFields.join(', ')} WHERE address = ?`, values);

      // Clear user profile cache to force refresh
      const cacheStrategies = getCacheStrategies();
      await cacheStrategies.clearUserCache(address);

      logger.info('User profile updated successfully', { address });
    } catch (error) {
      logger.error('Failed to update user profile', {
        error: error instanceof Error ? error.message : String(error),
        address,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async createCredentialType(typeData: CreateCredentialTypeRequest): Promise<CredentialType> {
    let db: any = null;
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const credentialType: CredentialType = {
        id,
        name: typeData.name,
        description: typeData.description,
        schema_version: typeData.schema_version,
        schema_definition: JSON.stringify(typeData.schema_definition),
        issuer_pattern: typeData.issuer_pattern,
        required_fields: JSON.stringify(typeData.required_fields),
        optional_fields: JSON.stringify(typeData.optional_fields),
        validation_rules: JSON.stringify(typeData.validation_rules),
        is_active: true,
        created_at: now,
        updated_at: now,
        created_by: typeData.created_by,
      };

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO credential_types (
          id, name, description, schema_version, schema_definition,
          issuer_pattern, required_fields, optional_fields, validation_rules,
          is_active, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          credentialType.id,
          credentialType.name,
          credentialType.description,
          credentialType.schema_version,
          credentialType.schema_definition,
          credentialType.issuer_pattern,
          credentialType.required_fields,
          credentialType.optional_fields,
          credentialType.validation_rules,
          credentialType.is_active ? 1 : 0,
          credentialType.created_at,
          credentialType.updated_at,
          credentialType.created_by,
        ]
      );

      logger.info('Credential type created successfully', {
        typeId: id,
        name: typeData.name,
      });
      return credentialType;
    } catch (error) {
      logger.error('Failed to create credential type', {
        error: error instanceof Error ? error.message : String(error),
        name: typeData.name,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getCredentialType(typeId: string): Promise<CredentialType | undefined> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const result = (await db.get(
        'SELECT * FROM credential_types WHERE id = ? AND is_active = 1',
        [typeId]
      )) as CredentialType | undefined;

      if (result) {
        return {
          ...result,
          schema_definition: JSON.parse(result.schema_definition),
          required_fields: JSON.parse(result.required_fields),
          optional_fields: JSON.parse(result.optional_fields),
          validation_rules: JSON.parse(result.validation_rules),
        };
      }

      return undefined;
    } catch (error) {
      logger.error('Failed to get credential type', {
        error: error instanceof Error ? error.message : String(error),
        typeId,
      });
      return undefined;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getActiveCredentialTypes(): Promise<CredentialType[]> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      return db.all(
        'SELECT * FROM credential_types WHERE is_active = 1 ORDER BY name'
      ) as CredentialType[];
    } catch (error) {
      logger.error('Failed to get active credential types', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async createCredential(
    userAddress: string,
    issuerAddress: string,
    request: CreateCredentialRequest
  ): Promise<Credential> {
    let db: any = null;
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const encryptedData = encryptData(JSON.stringify(request.credential_data));

      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(request.credential_data))
        .digest('hex');

      const credential: Credential = {
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

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO credentials (
          id, user_address, credential_type_id, issuer_address, issuer_name,
          credential_data, credential_hash, proof_signature, proof_type,
          status, issued_at, expires_at, created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
        ]
      );

      logger.info('Credential created successfully', {
        credentialId: id,
        userAddress: userAddress,
        credentialTypeId: request.credential_type_id,
      });
      return credential;
    } catch (error) {
      logger.error('Failed to create credential', {
        error: error instanceof Error ? error.message : String(error),
        userAddress: userAddress,
        credentialTypeId: request.credential_type_id,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getCredential(id: string): Promise<Credential | undefined> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const credential = (await db.get('SELECT * FROM credentials WHERE id = ?', [id])) as
        | Credential
        | undefined;

      if (credential) {
        return {
          ...credential,
          credential_data: JSON.parse(credential.credential_data),
          metadata: JSON.parse(credential.metadata || '{}'),
        };
      }

      return undefined;
    } catch (error) {
      logger.error('Failed to get credential', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: id,
      });
      return undefined;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getUserCredentials(userAddress: string): Promise<Credential[]> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const credentials = (await db.all(
        'SELECT * FROM credentials WHERE user_address = ? ORDER BY created_at DESC',
        [userAddress]
      )) as Credential[];

      return credentials.map(cred => ({
        ...cred,
        credential_data: JSON.parse(cred.credential_data),
        metadata: JSON.parse(cred.metadata || '{}'),
      }));
    } catch (error) {
      logger.error('Failed to get user credentials', {
        error: error instanceof Error ? error.message : String(error),
        userAddress: userAddress,
      });
      return [];
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getCredentialData(credentialId: string): Promise<Record<string, unknown> | null> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const credential = (await db.get('SELECT * FROM credentials WHERE id = ?', [
        credentialId,
      ])) as Credential | undefined;
      if (!credential) return null;

      const decryptedData = decryptData(credential.credential_data);
      return JSON.parse(decryptedData);
    } catch (error) {
      logger.error('Failed to get credential data', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: credentialId,
      });
      return null;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async shareCredential(
    ownerAddress: string,
    request: ShareCredentialRequest
  ): Promise<CredentialShare> {
    let db: any = null;
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const share: CredentialShare = {
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

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO credential_shares (
          id, credential_id, owner_address, shared_with_address,
          shared_with_client_id, permissions, access_level, expires_at,
          created_at, created_by, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
        ]
      );

      logger.info('Credential share created successfully', {
        shareId: id,
        credentialId: request.credential_id,
        ownerAddress: ownerAddress,
      });
      return share;
    } catch (error) {
      logger.error('Failed to share credential', {
        error: error instanceof Error ? error.message : String(error),
        ownerAddress: ownerAddress,
        credentialId: request.credential_id,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getSharedCredentials(userAddress: string): Promise<CredentialShare[]> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const shares = (await db.all(
        `SELECT cs.*, c.* FROM credential_shares cs
         JOIN credentials c ON cs.credential_id = c.id
         WHERE cs.shared_with_address = ? AND cs.is_active = 1
         AND (cs.expires_at IS NULL OR cs.expires_at > ?)
         ORDER BY cs.created_at DESC`,
        [userAddress, Date.now()]
      )) as CredentialShare[];

      return shares.map(share => ({
        ...share,
        permissions: JSON.parse(share.permissions),
      }));
    } catch (error) {
      logger.error('Failed to get shared credentials', {
        error: error instanceof Error ? error.message : String(error),
        userAddress: userAddress,
      });
      return [];
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async revokeCredentialShare(shareId: string): Promise<void> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      await db.run('UPDATE credential_shares SET is_active = 0 WHERE id = ?', [shareId]);
      logger.info('Credential share revoked successfully', { shareId });
    } catch (error) {
      logger.error('Failed to revoke credential share', {
        error: error instanceof Error ? error.message : String(error),
        shareId,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async verifyCredential(
    verifierAddress: string,
    request: VerifyCredentialRequest
  ): Promise<CredentialVerification> {
    let db: any = null;
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const verification: CredentialVerification = {
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

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO credential_verifications (
          id, credential_id, verifier_address, verification_type,
          verification_data, verification_signature, status, verified_at,
          expires_at, created_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
        ]
      );

      logger.info('Credential verified successfully', {
        verificationId: id,
        credentialId: request.credential_id,
        verifierAddress: verifierAddress,
      });
      return verification;
    } catch (error) {
      logger.error('Failed to verify credential', {
        error: error instanceof Error ? error.message : String(error),
        verifierAddress: verifierAddress,
        credentialId: request.credential_id,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getCredentialVerifications(credentialId: string): Promise<CredentialVerification[]> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const verifications = (await db.all(
        'SELECT * FROM credential_verifications WHERE credential_id = ? ORDER BY created_at DESC',
        [credentialId]
      )) as CredentialVerification[];

      return verifications.map(v => ({
        ...v,
        verification_data: JSON.parse(v.verification_data || '{}'),
      }));
    } catch (error) {
      logger.error('Failed to get credential verifications', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: credentialId,
      });
      return [];
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async revokeCredential(
    credentialId: string,
    revokedByAddress: string,
    reason?: string
  ): Promise<CredentialRevocation> {
    let db: any = null;
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      db = await getDatabaseConnection();
      await db.run('UPDATE credentials SET status = ?, updated_at = ? WHERE id = ?', [
        'revoked',
        now,
        credentialId,
      ]);

      const revocation: CredentialRevocation = {
        id,
        credential_id: credentialId,
        revoked_by_address: revokedByAddress,
        revocation_reason: reason,
        revoked_at: now,
        created_at: now,
      };

      await db.run(
        `INSERT INTO credential_revocations (
          id, credential_id, revoked_by_address, revocation_reason,
          revocation_signature, revoked_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          revocation.id,
          revocation.credential_id,
          revocation.revoked_by_address,
          revocation.revocation_reason,
          revocation.revocation_signature,
          revocation.revoked_at,
          revocation.created_at,
        ]
      );

      logger.info('Credential revoked successfully', {
        revocationId: id,
        credentialId: credentialId,
        revokedByAddress: revokedByAddress,
      });
      return revocation;
    } catch (error) {
      logger.error('Failed to revoke credential', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: credentialId,
        revokedByAddress: revokedByAddress,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async createIssuanceRequest(
    requesterAddress: string,
    request: CreateIssuanceRequest
  ): Promise<IssuanceRequest> {
    let db: any = null;
    try {
      const id = crypto.randomUUID();
      const now = Date.now();

      const issuanceRequest: IssuanceRequest = {
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

      db = await getDatabaseConnection();
      await db.run(
        `INSERT INTO issuance_requests (
          id, requester_address, issuer_address, credential_type_id,
          template_id, request_data, status, approved_at, rejected_at,
          rejection_reason, issued_credential_id, created_at, updated_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
        ]
      );

      logger.info('Issuance request created successfully', {
        issuanceRequestId: id,
        requesterAddress: requesterAddress,
        issuerAddress: request.issuer_address,
      });
      return issuanceRequest;
    } catch (error) {
      logger.error('Failed to create issuance request', {
        error: error instanceof Error ? error.message : String(error),
        requesterAddress: requesterAddress,
        issuerAddress: request.issuer_address,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getPendingIssuanceRequests(issuerAddress: string): Promise<IssuanceRequest[]> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const requests = (await db.all(
        `SELECT * FROM issuance_requests
         WHERE issuer_address = ? AND status = 'pending'
         AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY created_at ASC`,
        [issuerAddress, Date.now()]
      )) as IssuanceRequest[];

      return requests.map(req => ({
        ...req,
        request_data: JSON.parse(req.request_data),
      }));
    } catch (error) {
      logger.error('Failed to get pending issuance requests', {
        error: error instanceof Error ? error.message : String(error),
        issuerAddress: issuerAddress,
      });
      return [];
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async approveIssuanceRequest(
    requestId: string,
    approvedBy: string,
    issuedCredentialId?: string
  ): Promise<void> {
    let db: any = null;
    try {
      const now = Date.now();
      db = await getDatabaseConnection();
      await db.run(
        `UPDATE issuance_requests SET
         status = ?, approved_at = ?, issued_credential_id = ?, updated_at = ?
         WHERE id = ?`,
        ['issued', now, issuedCredentialId, now, requestId]
      );
      logger.info('Issuance request approved successfully', {
        issuanceRequestId: requestId,
        approvedBy: approvedBy,
        issuedCredentialId: issuedCredentialId,
      });
    } catch (error) {
      logger.error('Failed to approve issuance request', {
        error: error instanceof Error ? error.message : String(error),
        issuanceRequestId: requestId,
        approvedBy: approvedBy,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async rejectIssuanceRequest(
    requestId: string,
    rejectedBy: string,
    reason: string
  ): Promise<void> {
    let db: any = null;
    try {
      const now = Date.now();
      db = await getDatabaseConnection();
      await db.run(
        `UPDATE issuance_requests SET
         status = ?, rejected_at = ?, rejection_reason = ?, updated_at = ?
         WHERE id = ?`,
        ['rejected', now, reason, now, requestId]
      );
      logger.info('Issuance request rejected successfully', {
        issuanceRequestId: requestId,
        rejectedBy: rejectedBy,
        reason: reason,
      });
    } catch (error) {
      logger.error('Failed to reject issuance request', {
        error: error instanceof Error ? error.message : String(error),
        issuanceRequestId: requestId,
        rejectedBy: rejectedBy,
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async cleanupExpiredCredentials(): Promise<void> {
    let db: any = null;
    try {
      const now = Date.now();
      db = await getDatabaseConnection();

      await db.run(
        `UPDATE credentials SET status = 'expired', updated_at = ?
         WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'active'`,
        [now, now]
      );

      await db.run(
        `UPDATE credential_shares SET is_active = 0
         WHERE expires_at IS NOT NULL AND expires_at < ? AND is_active = 1`,
        [now]
      );

      await db.run(
        `UPDATE credential_verifications SET status = 'expired'
         WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'verified'`,
        [now]
      );

      await db.run(
        `UPDATE issuance_requests SET status = 'expired'
         WHERE expires_at IS NOT NULL AND expires_at < ? AND status = 'pending'`,
        [now]
      );

      logger.info('Expired credentials and requests cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup expired credentials', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }

  async getCredentialStats(): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    by_type: Record<string, number>;
  }> {
    let db: any = null;
    try {
      db = await getDatabaseConnection();
      const now = Date.now();

      const totalResult = await db.get('SELECT COUNT(*) as count FROM credentials');
      const activeResult = await db.get(
        'SELECT COUNT(*) as count FROM credentials WHERE status = "active" AND (expires_at IS NULL OR expires_at > ?)',
        [now]
      );
      const revokedResult = await db.get(
        'SELECT COUNT(*) as count FROM credentials WHERE status = "revoked"'
      );
      const expiredResult = await db.get(
        'SELECT COUNT(*) as count FROM credentials WHERE status = "active" AND expires_at <= ?',
        [now]
      );
      const typeResults = await db.all(
        'SELECT credential_type_id, COUNT(*) as count FROM credentials GROUP BY credential_type_id'
      );

      const by_type: Record<string, number> = {};
      typeResults.forEach((row: any) => {
        by_type[row.credential_type_id] = row.count;
      });

      return {
        total: totalResult?.count || 0,
        active: activeResult?.count || 0,
        revoked: revokedResult?.count || 0,
        expired: expiredResult?.count || 0,
        by_type,
      };
    } catch (error) {
      logger.error('Failed to get credential stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        total: 0,
        active: 0,
        revoked: 0,
        expired: 0,
        by_type: {},
      };
    } finally {
      if (db) {
        releaseDatabaseConnection(db);
      }
    }
  }
}
