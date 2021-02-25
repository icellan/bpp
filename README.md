# Bitcoin Paywall Protocol (BPP)
> A simple protocol for creating a generic pay-to-access paywall.

Authors: Siggi

## Problem statement

At the moment there are a lot of paywall solutions available, for instance for Wordpress there around 54 plugins that can be found when searching for "paywall". All these paywall solutions rely on hiding content on the server side, until a payment has been made. This does not work on Bitcoin when the content is posted to the blockchain directly.

## Solution

To create a functioning paywall for content that is published to an open ledger, the only viable solution is to encrypt the paywall part of the content and reveal the encryption key to the reader after payment. The reader can then decrypt the content with the encryption key and see access all the content.

For this to work, the BPP protocol describes a way a service provider can keep the encryption key in escrow until a valid payment transaction has been presented and the encryption key is shared.

This would work in the following way:

1) The creator would create content and encrypt with a key
2) The creator would create a transaction of the data, including the BPP data
3) The creator would register the decryption key with a service provider, referencing the transaction created in 2)
4) A reader would create a payment transaction for the amount needed
5) A reader would send the payment transaction to the service provider, the service provider would respond with the decryption key
6) The service provider publishes and settles the transaction on the blockchain
7) A reader can now decrypt and access the content at any time from anywhere
8) The reader stores the received decryption key on-chain in a transaction

## Protocol

The protocol follows the [Bitcom](https://bitcom.bitdb.network/) syntax and should only be used in conjunction with other Bitcom protols (like [B](https://github.com/unwriter/B)).

```
OP_RETURN
  ...
  |
  BPP
  PAY
  <currency>
  <address(es) for payment>:<amount(s)>
  <api endpoint>
```

Example using B protocol, totalling USD 0.10:

```
OP_RETURN
  19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut
  <encrypted Hello World!>
  text/plain;ecies
  utf-8
  hello.txt
  |
  BPP
  PAY
  USD
  1LrcP5Sub18uhdJur8Ekw1YwgWkms7rqyL:0.10
  https://blockpost.network/v1/paywall
```

An example of a multi payout request, totalling 0.004 BSV:

```
OP_RETURN
  ...
  |
  BPP
  PAY
  BSV
  1LrcP5Sub18uhdJur8Ekw1YwgWkms7rqyL:0.002,16ESASXcutrWPqC1GJYZBBHSm1xtsgn6Zb:0.001,1KNWoxv3nXEk1eSwsJiPtBA1j79XMjE6Y1:0.001
  https://blockpost.network/v1/paywall
```

A POST request needs to be sent to the API endpoint with the transaction id of the data, and a raw Bitcoin transaction in the POST body, where the recipient(s) is being paid the correct amount.

```shell
curl -X POST -d <JSON data> "https://blockpost.network/v1/paywall"
```

The JSON payload of the paywall API request is as follows:

```json
{
  "txId": "<transactionId of content being paid for>",
  "paymentTx": "<raw payment transaction in hex>",
  "publicKey": "<Public key of user used to encrypt the decryption key>"
}
```

This would return:

```json
{
  "txId": "<transactionId of payment receipt>",
  "key": "<decryption key>"
}
```

## Receipt

The public key of the user will be used to create a transaction with the decryption key and the address corresponding to the public key. In this way the user will have both a receipt of payment, but also a way to access the decryption key at any time in the future.

```
OP_RETURN
  BPP
    PAID
    <txId>
    <address corresponding to public key>
    <encrypted decryption key>
  MAP
    SET
    app
    <appname>
    type
    payment
    context
    tx
    tx
    <txId>
  AIP
    [Signing Algorithm]
    [Signing Address]
    [Signature]
```

This transaction will be signed and posted by the apiEndpoint service provider.
