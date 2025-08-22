import { config } from 'dotenv';
import { initializeDatabase } from '../config/db';
import { CredentialService } from '../services/credentialService';
config();

// Utility function to add delays for better pacing
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg: string) => console.log(`\n${colors.magenta}${colors.bright}🔹 ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.blue}${colors.bright}🎯 ${msg}${colors.reset}`),
  section: (msg: string) =>
    console.log(`\n${colors.yellow}${colors.bright}📋 ${msg}${colors.reset}`),
  data: (msg: string) => console.log(`${colors.white}   ${msg}${colors.reset}`),
};

async function runCredentialDemo() {
  console.clear();
  log.header('🚀 Starting Polkadot Credential Management Demo');
  console.log(
    `${colors.cyan}This demo showcases the complete credential lifecycle:${colors.reset}`
  );
  console.log('   • User profile creation');
  console.log('   • Credential type definition');
  console.log('   • Credential issuance');
  console.log('   • Credential sharing');
  console.log('   • Credential verification');
  console.log('   • Issuance request workflow');
  await delay(2000);

  const db = await initializeDatabase();
  const credentialService = new CredentialService(db);

  // Clean up any existing demo data to avoid conflicts
  log.section('🧹 Cleaning up existing demo data...');
  try {
    await db.run('DELETE FROM credential_shares WHERE shared_with_address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    ]);
    await db.run('DELETE FROM credential_verifications WHERE verifier_address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    ]);
    await db.run('DELETE FROM credentials WHERE user_address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    ]);
    await db.run('DELETE FROM credential_types WHERE created_by IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    ]);
    await db.run(
      'DELETE FROM issuance_requests WHERE requester_address IN (?, ?, ?) OR issuer_address IN (?, ?, ?)',
      [
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      ]
    );
    await db.run('DELETE FROM user_profiles WHERE address IN (?, ?, ?)', [
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    ]);
    log.success('Demo data cleanup completed');
  } catch (error) {
    log.warning(
      `Cleanup warning (this is normal for first run): ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
  await delay(1000);

  try {
    const issuerAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const userAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
    const verifierAddress = '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y';

    log.section('👥 Creating User Profiles');
    console.log('Setting up three user profiles for the demo:');
    await delay(500);

    // Create user profiles with error handling
    const profiles = [
      {
        address: issuerAddress,
        name: 'Polkadot University',
        role: 'Credential Issuer',
        profile: {
          display_name: 'Polkadot University',
          email: 'admin@polkadot.edu',
          bio: 'Official credential issuer for Polkadot University',
          website: 'https://polkadot.edu',
          verification_level: 3,
        },
      },
      {
        address: userAddress,
        name: 'Alice Smith',
        role: 'Credential Holder',
        profile: {
          display_name: 'Alice Smith',
          email: 'alice@example.com',
          bio: 'Blockchain developer and Polkadot enthusiast',
          verification_level: 2,
        },
      },
      {
        address: verifierAddress,
        name: 'Blockchain Verification Service',
        role: 'Credential Verifier',
        profile: {
          display_name: 'Blockchain Verification Service',
          email: 'verify@blockchain.org',
          bio: 'Professional credential verification service',
          verification_level: 3,
        },
      },
    ];

    for (const { address, name, role, profile } of profiles) {
      log.step(`Creating profile for ${name} (${role})`);
      log.data(`Address: ${address.substring(0, 10)}...${address.substring(address.length - 10)}`);
      try {
        await credentialService.createUserProfile(address, profile);
        log.success(`${name} profile created successfully`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          log.warning(`${name} profile already exists, skipping...`);
        } else {
          throw error;
        }
      }
      await delay(800);
    }

    log.success('All user profiles created successfully');
    await delay(1000);

    log.section('🎓 Creating Credential Types');
    console.log('Defining credential schemas and validation rules:');
    await delay(500);

    log.step('Creating University Degree credential type');
    log.data('Schema: Academic degree with GPA, honors, institution');
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
          honors: { type: 'string' },
        },
        required: ['degree', 'field', 'institution', 'graduation_date'],
      }),
      issuer_pattern: '^5.*$',
      required_fields: JSON.stringify(['degree', 'field', 'institution', 'graduation_date']),
      optional_fields: JSON.stringify(['gpa', 'honors']),
      validation_rules: JSON.stringify({
        gpa: { min: 0, max: 4.0 },
        graduation_date: { format: 'date', max: 'now' },
      }),
      is_active: true,
    });
    log.success(
      `Degree credential type created (ID: ${degreeCredentialType.id.substring(0, 8)}...)`
    );
    await delay(800);

    log.step('Creating Skill Certification credential type');
    log.data('Schema: Professional skills with levels and scores');
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
          score: { type: 'number', minimum: 0, maximum: 100 },
        },
        required: ['skill', 'level', 'certifying_organization', 'certification_date'],
      }),
      issuer_pattern: '^5.*$',
      required_fields: JSON.stringify([
        'skill',
        'level',
        'certifying_organization',
        'certification_date',
      ]),
      optional_fields: JSON.stringify(['expiry_date', 'score']),
      validation_rules: JSON.stringify({
        score: { min: 0, max: 100 },
        certification_date: { format: 'date', max: 'now' },
      }),
      is_active: true,
    });
    log.success(`Skill credential type created (ID: ${skillCredentialType.id.substring(0, 8)}...)`);
    await delay(1000);

    log.section('🎓 Issuing Credentials');
    console.log('Creating and issuing credentials to Alice:');
    await delay(500);

    log.step('Issuing University Degree credential');
    log.data('Degree: Bachelor of Science in Computer Science');
    log.data('Institution: Polkadot University');
    log.data('GPA: 3.8 (magna cum laude)');
    const degreeCredential = await credentialService.createCredential(issuerAddress, userAddress, {
      credential_type_id: degreeCredentialType.id,
      credential_data: {
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        institution: 'Polkadot University',
        graduation_date: '2023-05-15',
        gpa: 3.8,
        honors: 'magna_cum_laude',
      },
      expires_at: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
      metadata: {
        transcript_url: 'https://polkadot.edu/transcripts/12345',
        verification_url: 'https://polkadot.edu/verify/12345',
      },
    });
    log.success(`Degree credential issued (ID: ${degreeCredential.id.substring(0, 8)}...)`);
    await delay(800);

    log.step('Issuing Skill Certification credential');
    log.data('Skill: Substrate Development');
    log.data('Level: Advanced');
    log.data('Score: 95/100');
    await credentialService.createCredential(issuerAddress, userAddress, {
      credential_type_id: skillCredentialType.id,
      credential_data: {
        skill: 'Substrate Development',
        level: 'advanced',
        certifying_organization: 'Polkadot University',
        certification_date: '2023-12-01',
        expiry_date: '2025-12-01',
        score: 95,
      },
      expires_at: Date.now() + 2 * 365 * 24 * 60 * 60 * 1000,
      metadata: {
        exam_id: 'SUB-2023-001',
        certificate_url: 'https://polkadot.edu/certificates/substrate-001',
      },
    });
    log.success('Skill certification credential issued');
    await delay(1000);

    log.section('🔍 Retrieving and Displaying Credentials');
    console.log("Fetching Alice's credentials from the database:");
    await delay(500);

    const userCredentials = await credentialService.getUserCredentials(userAddress);
    log.success(`Found ${userCredentials.length} credentials for Alice`);
    await delay(500);

    for (const credential of userCredentials) {
      const credentialType = await credentialService.getCredentialType(
        credential.credential_type_id
      );
      const credentialData = await credentialService.getCredentialData(credential.id);

      log.step(`${credentialType?.name || 'Unknown Credential'}`);
      log.data(`ID: ${credential.id.substring(0, 8)}...`);
      log.data(`Status: ${credential.status}`);
      log.data(`Issued: ${new Date(credential.issued_at).toLocaleDateString()}`);
      log.data(
        `Expires: ${credential.expires_at ? new Date(credential.expires_at).toLocaleDateString() : 'Never'}`
      );

      if (credentialData) {
        console.log(
          `${colors.white}   Data: ${JSON.stringify(credentialData, null, 2).replace(/\n/g, '\n   ')}${colors.reset}`
        );
      }
      await delay(1000);
    }

    log.section('🔐 Demonstrating Credential Sharing');
    console.log('Alice shares her degree credential with the verification service:');
    await delay(500);

    log.step('Sharing degree credential');
    log.data(
      `Shared with: ${verifierAddress.substring(0, 10)}...${verifierAddress.substring(verifierAddress.length - 10)}`
    );
    log.data('Permissions: read, verify');
    log.data('Duration: 30 days');
    const share = await credentialService.shareCredential(userAddress, {
      credential_id: degreeCredential.id,
      shared_with_address: verifierAddress,
      permissions: ['read', 'verify'],
      access_level: 'read',
      expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    log.success(`Credential shared successfully`);
    log.data(`Share ID: ${share.id.substring(0, 8)}...`);
    await delay(800);

    const sharedCredentials = await credentialService.getSharedCredentials(verifierAddress);
    log.success(`Verifier now has access to ${sharedCredentials.length} shared credential(s)`);
    await delay(1000);

    log.section('✅ Demonstrating Credential Verification');
    console.log("Verification service validates Alice's degree credential:");
    await delay(500);

    log.step('Verifying degree credential');
    log.data('Verification type: Manual institutional verification');
    log.data('Verifier: Blockchain Verification Service');
    const verification = await credentialService.verifyCredential(verifierAddress, {
      credential_id: degreeCredential.id,
      verification_type: 'manual',
      verification_data: {
        verification_method: 'institutional_verification',
        verified_by: 'Blockchain Verification Service',
        verification_notes: 'Degree verified through institutional records',
      },
      notes: 'Degree credential verified and validated',
    });

    log.success('Credential verification completed');
    log.data(`Verification ID: ${verification.id.substring(0, 8)}...`);
    log.data(`Status: ${verification.status}`);
    log.data(`Verified at: ${new Date(verification.verified_at ?? Date.now()).toLocaleString()}`);
    await delay(1000);

    log.section('📝 Demonstrating Issuance Request Workflow');
    console.log('Alice requests a new credential through the issuance workflow:');
    await delay(500);

    log.step('Creating issuance request');
    log.data('Requested skill: Rust Programming');
    log.data('Level: Intermediate');
    log.data('Target issuer: Polkadot University');
    const issuanceRequest = await credentialService.createIssuanceRequest(userAddress, {
      issuer_address: issuerAddress,
      credential_type_id: skillCredentialType.id,
      request_data: {
        skill: 'Rust Programming',
        level: 'intermediate',
        certifying_organization: 'Polkadot University',
        certification_date: new Date().toISOString().split('T')[0],
        score: 88,
      },
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    log.success('Issuance request created');
    log.data(`Request ID: ${issuanceRequest.id.substring(0, 8)}...`);
    log.data(`Status: ${issuanceRequest.status}`);
    await delay(800);

    const pendingRequests = await credentialService.getPendingIssuanceRequests(issuerAddress);
    log.info(`Issuer has ${pendingRequests.length} pending request(s)`);
    await delay(500);

    log.step('Approving issuance request');
    log.data('Approved by: Polkadot University');
    await credentialService.approveIssuanceRequest(issuanceRequest.id, issuerAddress);
    log.success('Issuance request approved');
    await delay(1000);

    log.section('🧹 Running Cleanup');
    console.log('Cleaning up expired credentials and old data:');
    await delay(500);

    await credentialService.cleanupExpiredCredentials();
    log.success('Cleanup completed');
    await delay(500);

    log.header('🎉 Credential Management Demo Completed Successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`   ${colors.green}• Created ${3} user profiles${colors.reset}`);
    console.log(`   ${colors.green}• Created ${2} credential types${colors.reset}`);
    console.log(`   ${colors.green}• Issued ${2} credentials${colors.reset}`);
    console.log(`   ${colors.green}• Shared ${1} credential${colors.reset}`);
    console.log(`   ${colors.green}• Verified ${1} credential${colors.reset}`);
    console.log(`   ${colors.green}• Processed ${1} issuance request${colors.reset}`);

    console.log(
      `\n${colors.cyan}This demonstrates a complete digital credential ecosystem with:${colors.reset}`
    );
    console.log('   • Secure credential issuance and storage');
    console.log('   • Flexible credential sharing with permissions');
    console.log('   • Verifiable credential validation');
    console.log('   • Request-based credential workflows');
    console.log('   • Encrypted data protection');
  } catch (error) {
    log.error(`Demo failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  runCredentialDemo().catch(console.error);
}

export { runCredentialDemo };
