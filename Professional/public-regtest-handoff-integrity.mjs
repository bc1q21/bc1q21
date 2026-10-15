// bc1q21 Professional: public-only regtest PSBT handoff integrity gate.
// Does not prove that the UTXO remains unspent or the regtest chain still exists.
// Never accepts keys, RPC credentials, wallet data, or seeds.
import {createHash} from 'node:crypto';

const exactKeys=(value,keys)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||
    Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k)))
   throw Error('Unexpected public handoff field');
};
const sha256=value=>createHash('sha256').update(value).digest('hex');

export function preparePublicRegtestHandoff({unsignedPsbtBase64, fundingTxid, vout, inputSats, locktime, destinationSats}) {
 if(typeof unsignedPsbtBase64!=='string'||unsignedPsbtBase64.length>500000||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(unsignedPsbtBase64))throw Error('Invalid PSBT encoding');
 const bytes=Buffer.from(unsignedPsbtBase64,'base64');
 if(bytes.toString('base64')!==unsignedPsbtBase64||!bytes.subarray(0,5).equals(Buffer.from('70736274ff','hex')))
   throw Error('Not a canonical PSBT');
 if(typeof fundingTxid!=='string'||!/^[0-9a-f]{64}$/.test(fundingTxid))throw Error('Invalid funding txid');
 for(const [k,n] of Object.entries({vout,inputSats,locktime,destinationSats}))
   if(!Number.isSafeInteger(n)||n<0||(k==='vout'&&n>0xffffffff)||(k==='locktime'&&n>0xffffffff))
     throw Error('Invalid '+k);
 if(inputSats<=destinationSats||inputSats-destinationSats>100000)throw Error('Invalid fee');
 return Object.freeze({version:1,network:'regtest',kind:'unsigned-public-only',
   unsignedPsbtBase64,psbtSha256:sha256(bytes),fundingTxid,vout,inputSats,locktime,destinationSats});
}
export function verifyPublicRegtestHandoff(record) {
 exactKeys(record,['version','network','kind','unsignedPsbtBase64','psbtSha256','fundingTxid','vout','inputSats','locktime','destinationSats']);
 if(record.version!==1||record.network!=='regtest'||record.kind!=='unsigned-public-only')throw Error('Wrong handoff type');
 const rebuilt=preparePublicRegtestHandoff(record);
 if(rebuilt.psbtSha256!==record.psbtSha256)throw Error('PSBT checksum mismatch');
 return rebuilt;
}
