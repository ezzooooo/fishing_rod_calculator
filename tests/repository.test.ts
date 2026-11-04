import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Firestore } from "firebase/firestore";

import { DemoRepository } from "../src/lib/demo-repository";
import {
  normalizeFishingRod,
  quoteTotals,
  type Brand,
  type FishingRod,
  type QuoteRecord,
} from "../src/lib/domain";
import { isDemoMode } from "../src/lib/firebase";
import {
  FirebaseRepository,
  QuoteConflictError,
  type AppRepository,
  type QuoteInput,
} from "../src/lib/repository";

function readQuote(repository: AppRepository, id: string): Promise<QuoteRecord | null> {
  return new Promise((resolve, reject) => {
    const unsubscribe = repository.watchQuote(id, (value) => {
      unsubscribe();
      resolve(value);
    }, reject);
  });
}

function readQuotes(repository: AppRepository): Promise<QuoteRecord[]> {
  return new Promise((resolve, reject) => {
    const unsubscribe = repository.watchQuotes((value) => {
      unsubscribe();
      resolve(value);
    }, reject);
  });
}

function readRods(repository: AppRepository): Promise<FishingRod[]> {
  return new Promise((resolve, reject) => {
    const unsubscribe = repository.watchRods((value) => {
      unsubscribe();
      resolve(value);
    }, reject);
  });
}

function quoteInput(): QuoteInput {
  return {
    title: "김민수 매입 상담",
    note: "토요일 오후 방문",
    customerName: "김민수",
    mode: "purchase",
    items: [
      {
        fishingRodId: "rod-1",
        fishingRodName: "독야1",
        brandName: "송원",
        length: 32,
        quantity: 3,
        unitPrice: 100000,
        rate: 0.7,
        finalUnitPrice: 70000,
      },
      {
        fishingRodId: "rod-2",
        fishingRodName: "체어맨 블루",
        brandName: "DIF",
        length: 28,
        quantity: 2,
        unitPrice: 95000,
        rate: 0.7,
        finalUnitPrice: 66000,
      },
    ],
  };
}

function existingRecord(): QuoteRecord {
  const input = quoteInput();
  return {
    ...input,
    id: "quote-1",
    createdBy: "staff-original",
    createdAt: "2026-11-04T05:35:00.000Z",
    updatedAt: null,
    revision: 0,
    ...quoteTotals(input.items),
  };
}

describe("preview repository data compatibility", () => {
  it("reads legacy catalogue prices and derives quote totals from saved snapshots", async () => {
    const repository = new DemoRepository();
    const legacy = normalizeFishingRod({
      id: "legacy-rod",
      name: "구형 가격표",
      brandId: "brand-1",
      minValue: 18,
      maxValue: 22,
      lengthPrices: { "18": 12000, "20": 16000 },
    });
    await repository.replaceRods([legacy]);
    const [restored] = await readRods(repository);
    assert.deepEqual(restored.purchaseLengthPrices, { "18": 12000, "20": 16000 });
    assert.deepEqual(restored.saleLengthPrices, restored.purchaseLengthPrices);
    assert.equal(restored.usedPrice, 14000);

    const saved = await readQuote(repository, "sample-quote");
    assert.ok(saved);
    assert.equal(saved.totalPrice, 210000);
    assert.equal(saved.totalQuantity, 3);
    assert.equal(saved.items[0].finalUnitPrice, 70000);
    assert.equal(saved.totalPrice, quoteTotals(saved.items).totalPrice);
  });

  it("retains saved names and prices after catalogue edits and deletion", async () => {
    const repository = new DemoRepository();
    const id = await repository.createQuote(quoteInput());
    const original = await readQuote(repository, id);
    assert.ok(original);
    const rods = await readRods(repository);
    const rod = rods.find((value) => value.id === "rod-1");
    assert.ok(rod);
    await repository.saveRod({
      ...rod,
      name: "변경된 낚시대 이름",
      purchaseLengthPrices: { "32": 999000 },
      saleLengthPrices: { "32": 1999000 },
    });
    await repository.updateBrand("brand-1", "변경된 브랜드");
    await repository.deleteRod("rod-1");
    await repository.deleteRod("rod-2");
    await repository.deleteBrand("brand-1");
    const restored = await readQuote(repository, id);
    assert.ok(restored);
    assert.deepEqual(restored.items, original.items);
    assert.equal(restored.items[0].fishingRodName, "독야1");
    assert.equal(restored.items[0].brandName, "송원");
    assert.equal(restored.totalPrice, 342000);
    assert.equal(restored.totalQuantity, 5);
    assert.equal(restored.createdAt, original.createdAt);
  });

  it("preserves original author and creation time while updating revision and totals", async () => {
    const repository = new DemoRepository();
    const original = await readQuote(repository, "sample-quote");
    assert.ok(original);
    await repository.updateQuote({
      ...original,
      title: "상담 내용 수정",
      customerName: "김민수 고객",
      createdBy: "another-staff",
      createdAt: "2099-01-01T00:00:00.000Z",
      totalPrice: -1,
      totalQuantity: 999,
      items: [{ ...original.items[0], quantity: 4 }],
    });
    const updated = await readQuote(repository, original.id);
    assert.ok(updated);
    assert.equal(updated.createdBy, original.createdBy);
    assert.equal(updated.createdAt, original.createdAt);
    assert.equal(updated.revision, original.revision + 1);
    assert.ok(updated.updatedAt);
    assert.equal(updated.title, "상담 내용 수정");
    assert.equal(updated.customerName, "김민수 고객");
    assert.equal(updated.totalQuantity, 4);
    assert.equal(updated.totalPrice, 280000);
    assert.equal(updated.items[0].finalUnitPrice, original.items[0].finalUnitPrice);
  });

  it("rejects a stale editor without overwriting the first saved changes", async () => {
    const repository = new DemoRepository();
    const firstEditor = await readQuote(repository, "sample-quote");
    const secondEditor = await readQuote(repository, "sample-quote");
    assert.ok(firstEditor);
    assert.ok(secondEditor);
    await repository.updateQuote({ ...firstEditor, title: "먼저 저장된 견적" });
    await assert.rejects(
      repository.updateQuote({ ...secondEditor, title: "이전 버전의 변경" }),
      QuoteConflictError,
    );
    const saved = await readQuote(repository, "sample-quote");
    assert.equal(saved?.title, "먼저 저장된 견적");
    assert.equal(saved?.revision, firstEditor.revision + 1);
  });

  it("does not recreate a quote deleted while an editor was open", async () => {
    const repository = new DemoRepository();
    const original = await readQuote(repository, "sample-quote");
    assert.ok(original);
    await repository.deleteQuote(original.id);
    await assert.rejects(repository.updateQuote({ ...original, title: "수정 시도" }), /삭제된 견적/);
    assert.equal(await readQuote(repository, original.id), null);
    assert.ok((await readQuotes(repository)).every((value) => value.id !== original.id));
  });
});

describe("Firebase authorization happens before SDK access", () => {
  const invalidDatabase = {} as Firestore;
  const authorizationError = /로그인한 직원만/;

  for (const [name, state] of [
    ["signed-out session", { uid: null, authorized: false }],
    ["disabled staff account", { uid: "staff", authorized: false }],
    ["missing user ID", { uid: null, authorized: true }],
  ] as const) {
    it(`rejects quote mutations for ${name}`, async () => {
      const repository = new FirebaseRepository(invalidDatabase, () => state);
      await assert.rejects(repository.createQuote(quoteInput()), authorizationError);
      await assert.rejects(repository.updateQuote(existingRecord()), authorizationError);
      await assert.rejects(repository.deleteQuote("quote-1"), authorizationError);
    });
  }

  it("rejects catalogue writes and subscriptions without initializing Firebase", async () => {
    const repository = new FirebaseRepository(invalidDatabase, () => ({ uid: null, authorized: false }));
    const brand: Brand = { id: "brand-1", name: "송원" };
    const rod = normalizeFishingRod({ id: "rod-1", name: "독야", brandId: brand.id, lengthPrices: { "18": 10000 } });
    await assert.rejects(repository.createBrand(brand.name), authorizationError);
    await assert.rejects(repository.updateBrand(brand.id, "수정"), authorizationError);
    await assert.rejects(repository.deleteBrand(brand.id), authorizationError);
    await assert.rejects(repository.saveRod(rod), authorizationError);
    await assert.rejects(repository.deleteRod(rod.id), authorizationError);
    await assert.rejects(repository.replaceBrands([brand]), authorizationError);
    await assert.rejects(repository.replaceRods([rod]), authorizationError);
    assert.throws(() => repository.watchBrands(() => {}, () => {}), authorizationError);
    assert.throws(() => repository.watchRods(() => {}, () => {}), authorizationError);
    assert.throws(() => repository.watchQuotes(() => {}, () => {}), authorizationError);
    assert.throws(() => repository.watchQuote("quote-1", () => {}, () => {}), authorizationError);
  });

  it("checks the current session again after an account loses access", async () => {
    let session = { uid: "staff", authorized: true };
    const repository = new FirebaseRepository(invalidDatabase, () => session);
    session = { uid: "staff", authorized: false };
    await assert.rejects(repository.createQuote(quoteInput()), authorizationError);
    await assert.rejects(repository.updateQuote(existingRecord()), authorizationError);
    await assert.rejects(repository.deleteQuote("quote-1"), authorizationError);
  });
});

describe("development preview isolation", () => {
  it("cannot enable demo mode in a production build", () => {
    const environment = process.env as Record<string, string | undefined>;
    const previousNodeEnv = environment.NODE_ENV;
    const previousDemoFlag = environment.NEXT_PUBLIC_DEMO_MODE;
    try {
      environment.NODE_ENV = "development";
      environment.NEXT_PUBLIC_DEMO_MODE = "true";
      assert.equal(isDemoMode(), true);
      environment.NODE_ENV = "production";
      assert.equal(isDemoMode(), false);
      environment.NODE_ENV = "test";
      environment.NEXT_PUBLIC_DEMO_MODE = "false";
      assert.equal(isDemoMode(), false);
    } finally {
      if (previousNodeEnv === undefined) delete environment.NODE_ENV;
      else environment.NODE_ENV = previousNodeEnv;
      if (previousDemoFlag === undefined) delete environment.NEXT_PUBLIC_DEMO_MODE;
      else environment.NEXT_PUBLIC_DEMO_MODE = previousDemoFlag;
    }
  });
});
