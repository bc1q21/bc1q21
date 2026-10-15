// bc1q21 Professional: convert independently fetched Bitcoin Core regtest RPC
// responses to a fail-closed chain-continuity observation.
// Pure data transformation: no RPC, no signing, no wallet access, no broadcast.
import {assertSameRegtestFunding,validateRegtestFundingCheckpoint} from './regtest-chain-continuity.mjs';

function satsFromBtc(value) {
 if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>21000000)
  throw Error('Invalid Bitcoin Core amount');
 const scaled=value*100000000;
 const n=Math.round(scaled);
 if(!Number.isSafeInteger(n)||Math.abs(scaled-n)>0.00001)
  throw Error('Non-satoshi Bitcoin Core amount');
 return n;
}
export function verifyCoreFundingObservation(checkpoint,{chainInfo,transaction,blockHeader,txout}) {
 const cp=validateRegtestFundingCheckpoint(checkpoint);
 if(!chainInfo||chainInfo.chain!=='regtest')throw Error('Not a regtest Bitcoin Core chain');
 if(!transaction||transaction.txid!==cp.fundingTxid||transaction.blockhash!==cp.fundingBlockHash||
    !Array.isArray(transaction.vout))throw Error('Funding transaction not confirmed in expected block');
 if(!blockHeader||blockHeader.hash!==cp.fundingBlockHash||blockHeader.height!==cp.fundingBlockHeight||
    !Number.isSafeInteger(blockHeader.confirmations)||blockHeader.confirmations<1)
  throw Error('Funding block missing, replaced or not confirmed');
 const output=transaction.vout[cp.vout];
 if(!output||output.n!==cp.vout||!output.scriptPubKey||
    typeof output.scriptPubKey.hex!=='string')throw Error('Funding output absent');
 if(!txout||!txout.scriptPubKey||typeof txout.scriptPubKey.hex!=='string'||
    !Number.isSafeInteger(txout.confirmations)||txout.confirmations<1)
  throw Error('Funding output spent, missing or unconfirmed');
 if(txout.bestblock!==undefined &&
    (typeof txout.bestblock!=='string'||!/^[0-9a-f]{64}$/.test(txout.bestblock)))
  throw Error('Invalid Bitcoin Core bestblock');
 const observation={
  chain:chainInfo.chain,fundingTxid:transaction.txid,vout:output.n,
  amountSats:satsFromBtc(output.value),scriptPubKeyHex:output.scriptPubKey.hex,
  fundingBlockHash:transaction.blockhash,fundingBlockHeight:blockHeader.height,
  confirmations:Math.min(blockHeader.confirmations,txout.confirmations),
  unspent:true
 };
 if(satsFromBtc(txout.value)!==observation.amountSats||
    txout.scriptPubKey.hex!==observation.scriptPubKeyHex)
  throw Error('Bitcoin Core UTXO and funding transaction disagree');
 return assertSameRegtestFunding(cp,observation);
}
