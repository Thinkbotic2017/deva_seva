CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY')),
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE temples ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES membership_plans(id);
ALTER TABLE temples ADD COLUMN IF NOT EXISTS plan_billing_cycle VARCHAR(20);
ALTER TABLE temples ADD COLUMN IF NOT EXISTS plan_amount DECIMAL(10,2);
ALTER TABLE temples ADD COLUMN IF NOT EXISTS plan_razorpay_payment_id VARCHAR(100);
ALTER TABLE temples ADD COLUMN IF NOT EXISTS plan_auto_renew BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE temples ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;
ALTER TABLE temples ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(255);
INSERT INTO membership_plans (name, billing_cycle, price, description, features, sort_order) VALUES
('Starter Monthly','MONTHLY',999,'Basic plan billed monthly','["Up to 100 donations/month","Seva booking","WhatsApp receipts"]',1),
('Starter Quarterly','QUARTERLY',2699,'Basic plan billed quarterly','["Up to 100 donations/month","Seva booking","WhatsApp receipts"]',2),
('Starter Half-Yearly','HALF_YEARLY',4999,'Basic plan billed half-yearly','["Up to 100 donations/month","Seva booking","WhatsApp receipts"]',3),
('Starter Yearly','YEARLY',8999,'Basic plan billed yearly','["Up to 100 donations/month","Seva booking","WhatsApp receipts","Priority support"]',4),
('Growth Monthly','MONTHLY',2499,'Growth plan billed monthly','["Unlimited donations","All Starter features","80G reports","Custom receipt"]',5),
('Growth Quarterly','QUARTERLY',6999,'Growth plan billed quarterly','["Unlimited donations","All Starter features","80G reports","Custom receipt"]',6),
('Growth Half-Yearly','HALF_YEARLY',12999,'Growth plan billed half-yearly','["Unlimited donations","All Starter features","80G reports","Custom receipt"]',7),
('Growth Yearly','YEARLY',22999,'Growth plan billed yearly','["Unlimited donations","All Starter features","80G reports","Custom receipt","Dedicated support"]',8);
