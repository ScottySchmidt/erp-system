import { describe, expect, it } from "vitest";

import {
  SandboxTransferEngine,
  TransferError,
  type TransferFeePolicy,
  ZeroFeeTransferPolicy,
} from "#/lib/banking/transfer";

type TestAccount = {
  id: string;
  name: string;
  availableBalance: number;
  currentBalance: number;
};

class FlatFeePolicy implements TransferFeePolicy {
  constructor(private readonly fee: number) {}

  calculateFee(): number {
    return this.fee;
  }
}

function createAccounts(): TestAccount[] {
  return [
    {
      id: "acct-a",
      name: "Account A",
      availableBalance: 1000,
      currentBalance: 1000,
    },
    {
      id: "acct-b",
      name: "Account B",
      availableBalance: 250,
      currentBalance: 250,
    },
  ];
}

describe("SandboxTransferEngine", () => {
  it("moves fake money between accounts with zero fee", () => {
    const engine = new SandboxTransferEngine<TestAccount>({
      feePolicy: new ZeroFeeTransferPolicy(),
      now: () => new Date("2026-04-24T00:00:00.000Z"),
      createTransferId: () => "txn-900",
    });

    const result = engine.transfer(createAccounts(), {
      fromAccountId: "acct-a",
      toAccountId: "acct-b",
      amount: 125.5,
      memo: "Payroll top-up",
    });

    expect(result.amount).toBe(125.5);
    expect(result.fee).toBe(0);
    expect(result.updatedAccounts).toEqual([
      {
        id: "acct-a",
        name: "Account A",
        availableBalance: 874.5,
        currentBalance: 874.5,
      },
      {
        id: "acct-b",
        name: "Account B",
        availableBalance: 375.5,
        currentBalance: 375.5,
      },
    ]);
    expect(result.ledgerEntries).toHaveLength(2);
    expect(result.ledgerEntries[0]).toMatchObject({
      id: "txn-900-debit",
      accountId: "acct-a",
      amount: -125.5,
      category: "Internal Transfer",
      status: "matched",
    });
    expect(result.ledgerEntries[1]).toMatchObject({
      id: "txn-900-credit",
      accountId: "acct-b",
      amount: 125.5,
      category: "Internal Transfer",
      status: "matched",
    });
  });

  it("applies injected fee policy and creates a fee ledger entry", () => {
    const engine = new SandboxTransferEngine<TestAccount>({
      feePolicy: new FlatFeePolicy(2.75),
      now: () => new Date("2026-04-24T00:00:00.000Z"),
      createTransferId: () => "txn-901",
    });

    const result = engine.transfer(createAccounts(), {
      fromAccountId: "acct-a",
      toAccountId: "acct-b",
      amount: 100,
    });

    expect(result.fee).toBe(2.75);
    expect(result.updatedAccounts[0]).toMatchObject({
      availableBalance: 897.25,
      currentBalance: 897.25,
    });
    expect(result.ledgerEntries).toHaveLength(3);
    expect(result.ledgerEntries[2]).toMatchObject({
      id: "txn-901-fee",
      accountId: "acct-a",
      amount: -2.75,
      category: "Transfer Fee",
    });
  });

  it("throws when transfer exceeds available balance", () => {
    const engine = new SandboxTransferEngine<TestAccount>({
      feePolicy: new ZeroFeeTransferPolicy(),
      now: () => new Date("2026-04-24T00:00:00.000Z"),
      createTransferId: () => "txn-902",
    });

    expect(() =>
      engine.transfer(createAccounts(), {
        fromAccountId: "acct-a",
        toAccountId: "acct-b",
        amount: 1500,
      }),
    ).toThrowError(TransferError);
  });

  it("throws when source and destination are the same account", () => {
    const engine = new SandboxTransferEngine<TestAccount>({
      feePolicy: new ZeroFeeTransferPolicy(),
      now: () => new Date("2026-04-24T00:00:00.000Z"),
      createTransferId: () => "txn-903",
    });

    expect(() =>
      engine.transfer(createAccounts(), {
        fromAccountId: "acct-a",
        toAccountId: "acct-a",
        amount: 10,
      }),
    ).toThrowError("Choose two different accounts for an internal transfer.");
  });

  it("covers white-box decision branches: invalid, insufficient, approved", () => {
    const engine = new SandboxTransferEngine<TestAccount>({
      feePolicy: new ZeroFeeTransferPolicy(),
      now: () => new Date("2026-04-24T00:00:00.000Z"),
      createTransferId: () => "txn-904",
    });

    // Branch 1: amount <= 0 -> invalid
    expect(() =>
      engine.transfer(createAccounts(), {
        fromAccountId: "acct-a",
        toAccountId: "acct-b",
        amount: 0,
      }),
    ).toThrowError("Transfer amount must be greater than zero.");

    // Branch 2: amount > available balance -> insufficient funds
    expect(() =>
      engine.transfer(createAccounts(), {
        fromAccountId: "acct-a",
        toAccountId: "acct-b",
        amount: 1000.01,
      }),
    ).toThrowError("Insufficient available balance for this sandbox transfer.");

    // Branch 3: valid amount within balance -> approved path
    const approved = engine.transfer(createAccounts(), {
      fromAccountId: "acct-a",
      toAccountId: "acct-b",
      amount: 100,
    });
    expect(approved.amount).toBe(100);
    expect(approved.fee).toBe(0);
    expect(approved.ledgerEntries).toHaveLength(2);
  });
});
