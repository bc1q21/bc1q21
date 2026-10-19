// bc1q21 Professional: public gift locator to independently script-bound funding.
// Node-only regtest integration; does not authenticate recipient or unlock dates.
import assert from 'node:assert/strict';
import {giftLocator} from './gift-link-public-candidate.mjs';
import {verifyProfessionalPublicHandoff} from './public-handoff.mjs';
import {prepareProfessionalReleaseFromPublicHandoff} from './public-funding-release-integration.mjs';

export function verifyGiftSpecificFundingBinding(url, publicHandoff, funding) {
  const locator=giftLocator(url);
  const wallet=verifyProfessionalPublicHandoff(publicHandoff);
  assert.equal(locator.fundingAddress,wallet.fundingAddress,'Gift link does not match verified CLTV address');
  assert.ok(funding && typeof funding==='object','Funding evidence missing');
  // Build validates txid, vout, amount, redeem script, destination and fee.
  // It is used here only as a local integrity check, never as signing authorization.
  const prepared=prepareProfessionalReleaseFromPublicHandoff(publicHandoff,funding);
  assert.equal(prepared.fundingAddress,locator.fundingAddress);
  return Object.freeze({
    format:'bc1q21-professional-public-funding-binding-v1',
    network:'regtest',
    fundingAddress:locator.fundingAddress,
    txid:prepared.transactionSummary.txid,
    vout:prepared.transactionSummary.vout,
    inputSats:prepared.transactionSummary.inputSats,
    scriptBound:true,
    // A raw transaction alone does NOT establish confirmations, unspent status,
    // private schedule provenance, recipient ownership or chain maturity.
    chainVerified:false,
    authenticated:false,
    scheduleUnlocked:false,
    canSign:false,
    canBroadcast:false
  });
}
