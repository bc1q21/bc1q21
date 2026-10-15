// bc1q21 Professional isolated regtest chain continuity manifest validation.
// Pure validation: no RPC calls, no persistence, no wallet data, no broadcasting.
// Caller must obtain each observation independently from Bitcoin Core regtest RPC.
const txid=/^[0-9a-f]{64}$/;
const u32=n=>Number.isSafeInteger(n)&&n>=0&&n<=0xffffffff;
const sat=n=>Number.isSafeInteger(n)&&n>0&&n<=2100000000000000;
function fields(o,keys) {
 if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).length!==keys.length||
    Object.keys(o).some(k=>!keys.includes(k))) throw Error('Unexpected chain continuity field');
}
export function validateRegtestFundingCheckpoint(x) {
 fields(x,['version','chain','fundingTxid','vout','amountSats','scriptPubKeyHex','fundingBlockHash','fundingBlockHeight']);
 if(x.version!==1||x.chain!=='regtest')throw Error('Regtest-only checkpoint required');
 if(!txid.test(x.fundingTxid)||!txid.test(x.fundingBlockHash)||!u32(x.vout)||
    !sat(x.amountSats)||!u32(x.fundingBlockHeight)||x.fundingBlockHeight<1||
    typeof x.scriptPubKeyHex!=='string'||!/^[0-9a-f]{46}$/.test(x.scriptPubKeyHex)||
    !x.scriptPubKeyHex.startsWith('a914')||!x.scriptPubKeyHex.endsWith('87'))
   throw Error('Invalid confirmed legacy P2SH funding checkpoint');
 return Object.freeze({...x});
}
export function assertSameRegtestFunding(checkpoint,observation) {
 const expected=validateRegtestFundingCheckpoint(checkpoint);
 fields(observation,['chain','fundingTxid','vout','amountSats','scriptPubKeyHex','fundingBlockHash','fundingBlockHeight','confirmations','unspent']);
 if(observation.chain!=='regtest'||observation.confirmations<1||
    !Number.isSafeInteger(observation.confirmations)||observation.unspent!==true)
   throw Error('Regtest funding output is not confirmed and unspent');
 for(const k of ['fundingTxid','vout','amountSats','scriptPubKeyHex','fundingBlockHash','fundingBlockHeight'])
   if(observation[k]!==expected[k])throw Error('Regtest funding continuity mismatch: '+k);
 return Object.freeze({verified:true,chain:'regtest',fundingTxid:expected.fundingTxid,vout:expected.vout});
}
