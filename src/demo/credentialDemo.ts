import { config } from 'dotenv';
config();
import { initializeDatabase } from '../config/db';
import { CredentialService } from '../services/credentialService';

async function runCredentialDemo() {
  console.log('🚀 Starting Polkadot Credential Management Demo\n');

  
  const db = await initializeDatabase();
  const credentialService = new CredentialService(db);

  // Clean up any existing demo data to avoid conflicts
  console.log('🧹 Cleaning up existing demo data...');
  try {
    await db.run('DELETE FROM credential_shares WHERE shared_with_address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
    ]);
    await db.run('DELETE FROM credential_verifications WHERE verifier_address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
    ]);
    await db.run('DELETE FROM credentials WHERE user_address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
    ]);
    await db.run('DELETE FROM credential_types WHERE created_by IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
    ]);
    await db.run('DELETE FROM issuance_requests WHERE requester_address IN (?, ?, ?) OR issuer_address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
    ]);
    await db.run('DELETE FROM user_profiles WHERE address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'
    ]);
    console.log('✅ Demo data cleanup completed\n');
  } catch (error) {
    console.log('⚠️  Cleanup warning (this is normal for first run):', error instanceof Error ? error.message : 'Unknown error');
    console.log('');
  }

  try {
    
    const issuerAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const userAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
    const verifierAddress = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

    console.log('📋 Creating user profiles...');
    
    // Create user profiles with error handling
    const profiles = [
      {
        address: issuerAddress,
        profile: {
          display_name: 'Polkadot University',
          email: 'admin@polkadot.edu',
          bio: 'Official credential issuer for Polkadot University',
          website: 'https://polkadot.edu',
          verification_level: 3
        }
      },
      {
        address: userAddress,
        profile: {
          display_name: 'Alice Smith',
          email: 'alice@example.com',
          bio: 'Blockchain developer and Polkadot enthusiast',
          verification_level: 2
        }
      },
      {
        address: verifierAddress,
        profile: {
          display_name: 'Blockchain Verification Service',
          email: 'verify@blockchain.org',
          bio: 'Professional credential verification service',
          verification_level: 3
        }
      }
    ];

    for (const { address, profile } of profiles) {
      try {
        await credentialService.createUserProfile(address, profile);
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          console.log(`⚠️  User profile for ${address} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ User profiles created successfully\n');

    console.log('🎓 Creating credential types...');

    
    const degreeCredentialType = await credentialService.createCredentialType(issuerAddress, {
      name: 'University Degree',
      description: 'Academic degree credential from accredited institutions',
      schema_version: '1.0.0',
      schema_definition: JSON.stringify({
        type: 'object',
        properties: {
          degree: { type: 'string' },
          field: { type: 'string' },
          institution: { type: 'string' },
          graduation_date: { type: 'string', format: 'date' },
          gpa: { type: 'number', minimum: 0, maximum: 4.0 },
          honors: { type: 'string' }
        },
        required: ['degree', 'field', 'institution', 'graduation_date']
      }),
      issuer_pattern: '^5.*$',
      required_fields: JSON.stringify(['degree', 'field', 'institution', 'graduation_date']),
      optional_fields: JSON.stringify(['gpa', 'honors']),
      validation_rules: JSON.stringify({
        gpa: { min: 0, max: 4.0 },
        graduation_date: { format: 'date', max: 'now' }
      }),
      is_active: true
    });

    const skillCredentialType = await credentialService.createCredentialType(issuerAddress, {
      name: 'Skill Certification',
      description: 'Professional skill and competency certifications',
      schema_version: '1.0.0',
      schema_definition: JSON.stringify({
        type: 'object',
        properties: {
          skill: { type: 'string' },
          level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
          certifying_organization: { type: 'string' },
          certification_date: { type: 'string', format: 'date' },
          expiry_date: { type: 'string', format: 'date' },
          score: { type: 'number', minimum: 0, maximum: 100 }
        },
        required: ['skill', 'level', 'certifying_organization', 'certification_date']
      }),
      issuer_pattern: '^5.*$',
      required_fields: JSON.stringify(['skill', 'level', 'certifying_organization', 'certification_date']),
      optional_fields: JSON.stringify(['expiry_date', 'score']),
      validation_rules: JSON.stringify({
        score: { min: 0, max: 100 },
        certification_date: { format: 'date', max: 'now' }
      }),
      is_active: true
    });

    console.log('✅ Credential types created successfully\n');

    console.log('🎓 Issuing credentials...');

    
    const degreeCredential = await credentialService.createCredential(
      issuerAddress,
      userAddress,
      {
        credential_type_id: degreeCredentialType.id,
        credential_data: {
          degree: 'Bachelor of Science',
          field: 'Computer Science',
          institution: 'Polkadot University',
          graduation_date: '2023-05-15',
          gpa: 3.8,
          honors: 'magna_cum_laude'
        },
        expires_at: Date.now() + (10 * 365 * 24 * 60 * 60 * 1000),
        metadata: {
          transcript_url: 'https://polkadot.edu/transcripts/12345',
          verification_url: 'https://polkadot.edu/verify/12345'
        }
      }
    );

    
    await credentialService.createCredential(
      issuerAddress,
      userAddress,
      {
        credential_type_id: skillCredentialType.id,
        credential_data: {
          skill: 'Substrate Development',
          level: 'advanced',
          certifying_organization: 'Polkadot University',
          certification_date: '2023-12-01',
          expiry_date: '2025-12-01',
          score: 95
        },
        expires_at: Date.now() + (2 * 365 * 24 * 60 * 60 * 1000),
        metadata: {
          exam_id: 'SUB-2023-001',
          certificate_url: 'https://polkadot.edu/certificates/substrate-001'
        }
      }
    );

    console.log('✅ Credentials issued successfully\n');

    console.log('🔍 Retrieving and displaying credentials...');

    
    const userCredentials = await credentialService.getUserCredentials(userAddress);
    console.log(`📚 User has ${userCredentials.length} credentials:`);
    
    for (const credential of userCredentials) {
      const credentialType = await credentialService.getCredentialType(credential.credential_type_id);
      const credentialData = await credentialService.getCredentialData(credential.id);
      
      console.log(`\n🎓 ${credentialType?.name}:`);
      console.log(`   ID: ${credential.id}`);
      console.log(`   Status: ${credential.status}`);
      console.log(`   Issued: ${new Date(credential.issued_at).toLocaleDateString()}`);
      console.log(`   Expires: ${credential.expires_at ? new Date(credential.expires_at).toLocaleDateString() : 'Never'}`);
      console.log(`   Data:`, credentialData);
    }

    console.log('\n🔐 Demonstrating credential sharing...');

    
    const share = await credentialService.shareCredential(userAddress, {
      credential_id: degreeCredential.id,
      shared_with_address: verifierAddress,
      permissions: ['read', 'verify'],
      access_level: 'read',
      expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000)
    });

    console.log(`✅ Credential shared with ${verifierAddress}`);
    console.log(`   Share ID: ${share.id}`);
    console.log(`   Permissions: ${share.permissions}`);

    
    const sharedCredentials = await credentialService.getSharedCredentials(verifierAddress);
    console.log(`\n📋 Verifier has access to ${sharedCredentials.length} shared credentials`);

    console.log('\n✅ Demonstrating credential verification...');

    
    const verification = await credentialService.verifyCredential(verifierAddress, {
      credential_id: degreeCredential.id,
      verification_type: 'manual',
      verification_data: {
        verification_method: 'institutional_verification',
        verified_by: 'Blockchain Verification Service',
        verification_notes: 'Degree verified through institutional records'
      },
      notes: 'Degree credential verified and validated'
    });

    console.log(`✅ Credential verified successfully`);
    console.log(`   Verification ID: ${verification.id}`);
    console.log(`   Status: ${verification.status}`);
    console.log(`   Verified at: ${new Date(verification.verified_at!).toLocaleString()}`);

    console.log('\n📝 Demonstrating issuance request workflow...');

    
    const issuanceRequest = await credentialService.createIssuanceRequest(userAddress, {
      issuer_address: issuerAddress,
      credential_type_id: skillCredentialType.id,
      request_data: {
        skill: 'Rust Programming',
        level: 'intermediate',
        certifying_organization: 'Polkadot University',
        certification_date: new Date().toISOString().split('T')[0],
        score: 88
      },
      expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000)
    });

    console.log(`📋 Issuance request created:`);
    console.log(`   Request ID: ${issuanceRequest.id}`);
    console.log(`   Status: ${issuanceRequest.status}`);
    console.log(`   Requested skill: ${JSON.parse(issuanceRequest.request_data).skill}`);

    
    const pendingRequests = await credentialService.getPendingIssuanceRequests(issuerAddress);
    console.log(`\n⏳ Issuer has ${pendingRequests.length} pending requests`);

    
    await credentialService.approveIssuanceRequest(issuanceRequest.id, issuerAddress);
    console.log(`✅ Issuance request approved`);

    console.log('\n🧹 Running cleanup...');
    
    
    await credentialService.cleanupExpiredCredentials();
    console.log('✅ Cleanup completed');

    console.log('\n🎉 Credential Management Demo completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Created ${3} user profiles`);
    console.log(`   - Created ${2} credential types`);
    console.log(`   - Issued ${2} credentials`);
    console.log(`   - Shared ${1} credential`);
    console.log(`   - Verified ${1} credential`);
    console.log(`   - Processed ${1} issuance request`);

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await db.close();
  }
}


if (require.main === module) {
  runCredentialDemo().catch(console.error);
}

export { runCredentialDemo }; 