-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "position" TEXT,
    "payrollAmount" DECIMAL(18,6) NOT NULL DEFAULT 0.25,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollReceipt" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_walletAddress_key" ON "Employee"("walletAddress");

-- CreateIndex
CREATE INDEX "Employee_walletAddress_idx" ON "Employee"("walletAddress");

-- CreateIndex
CREATE INDEX "Employee_active_idx" ON "Employee"("active");

-- CreateIndex
CREATE INDEX "PayrollReceipt_employeeId_idx" ON "PayrollReceipt"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollReceipt_status_idx" ON "PayrollReceipt"("status");

-- CreateIndex
CREATE INDEX "PayrollReceipt_createdAt_idx" ON "PayrollReceipt"("createdAt");

-- AddForeignKey
ALTER TABLE "PayrollReceipt" ADD CONSTRAINT "PayrollReceipt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
