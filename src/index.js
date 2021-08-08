import dns from 'dns';
import bsv from 'bsv';
import { PaymailClient } from '@moneybutton/paymail-client';
import Shapeshifter from 'icellan-shapeshifter.js';
import 'node-fetch';

/**
 * Bitcoin Paywall Protocol class
 *
 * @type {BPP}
 */
export const BPP = class {
  constructor() {
    this.errors = [];
  }

  getOutputsFromString(paywallPayouts, exchangeRate = 1) {
    const payouts = paywallPayouts.split(',');
    const outputs = [];
    for (let i = 0; i < payouts.length; i++) {
      const [address, amount] = payouts[i].split(':');
      outputs.push({
        address,
        amount: Number(amount) / exchangeRate,
      });
    }

    return outputs;
  }

  getOutputsFromBob(bob) {
    const outputs = [];
    for (let i = 0; i < bob.out.length; i++) {
      const { v, a } = bob.out[i].e;
      if (v && a) {
        outputs.push({
          address: a,
          amount: v,
        });
      }
    }

    return outputs;
  }

  /**
   * Get a transaction output for the given paymail
   *
   * @param {String} paymail
   * @param {Number} amount
   * @returns {String} Output hex for the transaction
   */
  getPaymailOutput = async function (paymail, amount) {
    const client = new PaymailClient(dns, fetch);
    const result = await client.getOutputFor(paymail, {
      senderHandle: 'blockpost@moneybutton.com',
      amount,
      dt: JSON.stringify(new Date()),
    });

    return result.output;
  };

  /**
   * Get the payment outputs for the given paywallDoc definition
   *
   * This function will lookup any paymails and return bitcoin outputs in hex format
   *
   * @param paywallDoc
   */
  async getPaymentOutputs(paywallDoc) {
    const { paywallCurrency, paywallPayouts } = paywallDoc;
    let exchangeRate = 1;
    if (paywallCurrency !== 'BSV') {
      exchangeRate = await this.getExchangeRate(paywallCurrency);
    }

    const outputAddresses = this.getOutputsFromString(paywallPayouts, exchangeRate);
    const outputs = [];
    for (let i = 0; i < outputAddresses.length; i++) {
      const { address, amount } = outputAddresses[i];
      if (address.match(/@/)) {
        // paymail address
        outputs.push(this.getPaymailOutput(address, amount));
      } else {
        const tx = new bsv.Transaction();
        tx.addOutput(new bsv.Transaction.Output({
          script: bsv.Script.buildPublicKeyHashOut(address).toHex(),
          satoshis: amount,
        }));
        outputs.push(tx.toString('hex'));
      }
    }

    return outputs;
  }

  /**
   * Get the consolidated payment output (for all outputs) for the given paywall doc
   *
   * @param paywallDoc
   * @returns {Promise<*>}
   */
  async getPaymentOutput(paywallDoc) {
    const outputs = await this.getPaymentOutputs(paywallDoc);
    const tx = new bsv.Transaction();
    for (let i = 0; i < outputs.length; i++) {
      tx.fromBuffer(Buffer.from(outputs[i], 'hex'));
    }

    return tx.toString('hex');
  }

  async getExchangeRate() {
    const result = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate');
    const exchangeRate = await result.json();
    return exchangeRate.rate / 100000000; // in satoshis
  }

  /**
   * Compare the needed outputs against what was given in the transaction
   *
   * @param neededOutputs
   * @param givenOutputs
   * @returns {boolean}
   */
  compareOutputs(neededOutputs, givenOutputs) {
    let allOk = true;
    for (let i = 0; i < neededOutputs.length; i++) {
      // check whether we can find each address in the outputs and whether the payment is enough
      const { address, amount } = neededOutputs[i];
      const inOutput = givenOutputs.find((o) => { return o.address === address; });
      if (inOutput) {
        const amountDiff = Math.abs(amount - inOutput.amount);
        const amountMax = Math.max(amount, inOutput.amount);
        if (Number.isNaN(amountDiff) || Number.isNaN(amountMax) || (amountDiff / amountMax > 0.1)) {
          // difference is greater than 10%
          this.errors.push({
            address,
            amount,
            output: inOutput,
            message: 'Difference is greater than 10%',
          });
          allOk = false;
        }
      } else if (amount > 0) {
        // no need to check anything related to zero amounts
        this.errors.push({
          address,
          amount,
          message: 'No output found for payment',
        });
        allOk = false;
      }
    }

    return allOk;
  }

  isTransactionValidPaywallPayment = async function (paywallDoc, paywallTx) {
    const bob = Shapeshifter.toBob(paywallTx);
    const txId = bob.tx.h;

    const { paywallCurrency, paywallPayouts } = paywallDoc;
    let exchangeRate = 1;
    if (paywallCurrency !== 'BSV') {
      exchangeRate = await this.getExchangeRate(paywallCurrency);
    }

    const givenOutputs = this.getOutputsFromBob(bob);

    // paymail BPP is not working yet
    // still need a way to check whether an address belongs to a paymail
    // const neededOutputs = this.getPaymentOutput(paywallPayouts, exchangeRate);
    const neededOutputs = this.getOutputsFromString(paywallPayouts, exchangeRate);

    return {
      txId,
      valid: this.compareOutputs(neededOutputs, givenOutputs),
    };
  };
};
