import { describe, expect, test } from '@jest/globals';
import { BPP } from '../src';

import paymentTxs from './data/payment-txs.json';
import paymentDocs from './data/payment-docs.json';
import Shapeshifter from 'icellan-shapeshifter.js';

describe('bbp', () => {
  test('init', () => {
    const bpp = new BPP();
    expect(typeof bpp).toBe('object');
  });

  test('getOutputsFromString', () => {
    const bpp = new BPP();
    const outputs = bpp.getOutputsFromString(paymentDocs[0].paywallPayouts);
    expect(outputs).toStrictEqual([
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 0.09 },
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 0.01 }
    ]);
  });

  test('getOutputsFromString exchange rate', () => {
    const bpp = new BPP();
    const outputs = bpp.getOutputsFromString(paymentDocs[0].paywallPayouts, 0.01);
    expect(outputs).toStrictEqual([
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 9 },
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 1 }
    ]);
  });

  test('getOutputsFromBob', () => {
    const bpp = new BPP();
    const { txId , rawTx } = paymentTxs[0];
    const bob = Shapeshifter.toBob(rawTx);
    const outputs = bpp.getOutputsFromBob(bob);
    expect(outputs).toStrictEqual([
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 5596 },
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 50362 },
      { address: '1AN3sNoqNhwsud8edaSyd72GUNTkkoocNT', amount: 2152635 }
    ]);
  });

  test('compareOutputs', () => {
    const bpp = new BPP();
    const neededOutputs = [
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 50009 },
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 5201 }
    ];
    const givenOutputs = [
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 5596 },
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 50362 },
      { address: '1AN3sNoqNhwsud8edaSyd72GUNTkkoocNT', amount: 2152635 }
    ];
    const result = bpp.compareOutputs(neededOutputs, givenOutputs);
    expect(result).toBe(true);
  });

  test('compareOutputs 2', () => {
    const bpp = new BPP();
    const neededOutputs = [
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 59 },
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 51 }
    ];
    const givenOutputs = [
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 5596 },
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 50362 },
      { address: '1AN3sNoqNhwsud8edaSyd72GUNTkkoocNT', amount: 2152635 }
    ];
    const result = bpp.compareOutputs(neededOutputs, givenOutputs);
    expect(result).toBe(false);
    expect(bpp.errors.length).toBe(2);
    expect(bpp.errors[0].message).toBe("Difference is greater than 10%");
    expect(bpp.errors[1].message).toBe("Difference is greater than 10%");
  });

  test('compareOutputs 2', () => {
    const bpp = new BPP();
    const neededOutputs = [
      { address: 'test', amount: 50362 },
      { address: 'ergser', amount: 5596 }
    ];
    const givenOutputs = [
      { address: '1Z1HDmB12inMu5svMeA9YuELZtcqAczQA', amount: 5596 },
      { address: '1HgUejUeEi1as5tqeP1QvcrJumN5A97mts', amount: 50362 },
      { address: '1AN3sNoqNhwsud8edaSyd72GUNTkkoocNT', amount: 2152635 }
    ];
    const result = bpp.compareOutputs(neededOutputs, givenOutputs);
    expect(result).toBe(false);
    expect(bpp.errors.length).toBe(2);
    expect(bpp.errors[0].message).toBe("No output found for payment");
    expect(bpp.errors[1].message).toBe("No output found for payment");
  });

  test('isTransactionValidPaywallPayment', async () => {
    const bpp = new BPP();
    const { txId , rawTx } = paymentTxs[0];
    const {txId: paymentTxId, valid} = await bpp.isTransactionValidPaywallPayment(paymentDocs[0], rawTx);
    expect(paymentTxId).toBe('91ce45942c0f6feb41be05e809f1fe821f2211b86315b1da6dcdc9d7e90687b5');
    expect(valid).toBe(true);
  });
});
