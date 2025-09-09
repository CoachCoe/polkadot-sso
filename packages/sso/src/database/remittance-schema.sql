-- Remittance Database Schema
-- Extends the existing Polkadot SSO database with remittance-specific tables

-- Extend existing users table with remittance fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS custody_level INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_limit DECIMAL(10,2) DEFAULT 500.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(10,2) DEFAULT 2000.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS per_transaction_limit DECIMAL(10,2) DEFAULT 500.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Remittance transactions table
CREATE TABLE IF NOT EXISTS remittance_transactions (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  recipient_contact VARCHAR(255) NOT NULL,
  recipient_id VARCHAR(36),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  claim_link VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  fees JSON,
  exchange_rate DECIMAL(10,6),
  on_chain_tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX idx_sender_id (sender_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_claim_link (claim_link),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
);

-- Custody level upgrades table
CREATE TABLE IF NOT EXISTS custody_upgrades (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  required_auth JSON,
  completed_auth JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Recovery methods table
CREATE TABLE IF NOT EXISTS recovery_methods (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL,
  value VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_verified (verified)
);

-- Wallet addresses table (for multi-chain support)
CREATE TABLE IF NOT EXISTS wallet_addresses (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  chain_id VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_chain_id (chain_id),
  INDEX idx_address (address),
  UNIQUE KEY unique_user_chain_address (user_id, chain_id, address)
);

-- KYC verification records
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL,
  risk_score DECIMAL(3,2),
  required_actions JSON,
  expires_at TIMESTAMP,
  provider VARCHAR(50),
  provider_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_expires_at (expires_at)
);

-- Compliance checks table
CREATE TABLE IF NOT EXISTS compliance_checks (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36),
  user_id VARCHAR(36),
  check_type VARCHAR(50) NOT NULL,
  passed BOOLEAN NOT NULL,
  risk_score DECIMAL(3,2),
  flags JSON,
  required_actions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_user_id (user_id),
  INDEX idx_check_type (check_type),
  INDEX idx_passed (passed)
);

-- Exchange rates table (for caching)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id VARCHAR(36) PRIMARY KEY,
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10,6) NOT NULL,
  source VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  -- Indexes
  INDEX idx_currencies (from_currency, to_currency),
  INDEX idx_expires_at (expires_at),
  UNIQUE KEY unique_currency_pair (from_currency, to_currency, source)
);

-- Transaction limits table (for dynamic limits)
CREATE TABLE IF NOT EXISTS transaction_limits (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  custody_level INTEGER NOT NULL,
  daily_limit DECIMAL(10,2),
  monthly_limit DECIMAL(10,2),
  per_transaction_limit DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  effective_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_custody_level (custody_level),
  INDEX idx_effective_from (effective_from)
);

-- Audit trail for remittance operations
CREATE TABLE IF NOT EXISTS remittance_audit_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  transaction_id VARCHAR(36),
  action VARCHAR(50) NOT NULL,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);

-- Cash-out partners table
CREATE TABLE IF NOT EXISTS cash_out_partners (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(3) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  fee_percentage DECIMAL(5,4),
  fee_fixed DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_country (country),
  INDEX idx_currency (currency),
  INDEX idx_is_active (is_active)
);

-- Partner transactions table
CREATE TABLE IF NOT EXISTS partner_transactions (
  id VARCHAR(36) PRIMARY KEY,
  remittance_transaction_id VARCHAR(36) NOT NULL,
  partner_id VARCHAR(36) NOT NULL,
  partner_reference VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  fees DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_remittance_transaction_id (remittance_transaction_id),
  INDEX idx_partner_id (partner_id),
  INDEX idx_status (status),
  FOREIGN KEY (remittance_transaction_id) REFERENCES remittance_transactions(id),
  FOREIGN KEY (partner_id) REFERENCES cash_out_partners(id)
);

-- Create views for common queries
CREATE OR REPLACE VIEW user_remittance_summary AS
SELECT
  u.id as user_id,
  u.custody_level,
  u.kyc_status,
  u.daily_limit,
  u.monthly_limit,
  u.per_transaction_limit,
  COUNT(rt.id) as total_transactions,
  SUM(CASE WHEN rt.status = 'completed' THEN rt.amount ELSE 0 END) as total_sent,
  SUM(CASE WHEN rt.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN rt.amount ELSE 0 END) as daily_sent,
  SUM(CASE WHEN rt.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN rt.amount ELSE 0 END) as monthly_sent
FROM users u
LEFT JOIN remittance_transactions rt ON u.id = rt.sender_id
GROUP BY u.id;

-- Create view for transaction analytics
CREATE OR REPLACE VIEW transaction_analytics AS
SELECT
  DATE(created_at) as transaction_date,
  target_currency,
  COUNT(*) as transaction_count,
  SUM(amount) as total_volume,
  AVG(amount) as average_amount,
  SUM(fees->>'$.total') as total_fees
FROM remittance_transactions
WHERE status = 'completed'
GROUP BY DATE(created_at), target_currency
ORDER BY transaction_date DESC;

-- Insert default custody level configurations
INSERT IGNORE INTO transaction_limits (id, custody_level, daily_limit, monthly_limit, per_transaction_limit, currency) VALUES
('custody-0', 0, 500.00, 2000.00, 500.00, 'USD'),
('custody-1', 1, 2000.00, 10000.00, 2000.00, 'USD'),
('custody-2', 2, 10000.00, 50000.00, 10000.00, 'USD'),
('custody-3', 3, NULL, NULL, NULL, 'USD');

-- Insert sample cash-out partners
INSERT IGNORE INTO cash_out_partners (id, name, country, currency, min_amount, max_amount, fee_percentage, fee_fixed) VALUES
('partner-argentina-1', 'Banco de la Nación Argentina', 'ARG', 'ARS', 1000.00, 100000.00, 0.015, 50.00),
('partner-argentina-2', 'Western Union Argentina', 'ARG', 'ARS', 500.00, 50000.00, 0.025, 100.00),
('partner-brazil-1', 'Banco do Brasil', 'BRA', 'BRL', 1000.00, 100000.00, 0.012, 75.00),
('partner-brazil-2', 'MoneyGram Brazil', 'BRA', 'BRL', 500.00, 50000.00, 0.020, 80.00);

-- Create triggers for automatic updates
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_remittance_transaction_updated_at
  BEFORE UPDATE ON remittance_transactions
  FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER IF NOT EXISTS update_user_last_activity
  AFTER INSERT ON remittance_transactions
  FOR EACH ROW
BEGIN
  UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = NEW.sender_id;
END//

DELIMITER ;
