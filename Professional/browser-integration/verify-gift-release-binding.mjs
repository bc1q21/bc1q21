// Professional gift-specific release binding for the isolated regtest prototype.
// A recipient link is a public locator, never proof of authority to spend.
// This checks only consistency with caller-supplied release details. It does NOT
// authenticate those details, prove that the locator belongs to the funding
// transaction, verify chain state, or authorize signing.
import bitcoin from 'bitcoinjs-lib';
import {sha256} from '@noble/hashes/sha256';
const fail=message=>{throw Error('Professional gift binding: '+message)};
const hex64=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
export function verifyGiftReleaseBinding({gift,release,approvedUnsignedBase64,expectedApprovedSha256}){
 if(!gift||!release||typeof approvedUnsignedBase64!=='string')fail('Missing binding data');
 if(typeof gift.fundingAddress!=='string'||!/^([a-zA-Z0-9]{26,90})$/.test(gift.fundingAddress))
  fail('Invalid public gift locator');
 if(!hex64(release.fundingTxid)||!(typeof release.destinationScriptHex==='string'&&/^(?:[0-9a-f]{2}){1,10000}$/.test(release.destinationScriptHex))||
    !hex64(expectedApprovedSha256))fail('Invalid expected transaction fingerprint');
 if(!Number.isSafeInteger(release.fundingVout)||release.fundingVout<0||
    !Number.isSafeInteger(release.lockHeight)||release.lockHeight<0||
    !Number.isSafeInteger(release.amountSats)||release.amountSats<1)fail('Invalid release parameters');
 const bytes=Buffer.from(approvedUnsignedBase64,'base64');
 if(bytes.toString('base64')!==approvedUnsignedBase64||bytes.length>100000)fail('Invalid approved PSBT encoding');
 if(Buffer.from(sha256(bytes)).toString('hex')!==expectedApprovedSha256)
  fail('Approved PSBT digest mismatch');
 let psbt;
 try{psbt=bitcoin.Psbt.fromBuffer(bytes)}catch{fail('Invalid approved PSBT')}
 if(psbt.txInputs.length!==1||psbt.txOutputs.length!==1)fail('Unexpected transaction shape');
 const tx=bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer());
 const input=tx.ins[0],output=tx.outs[0];
 if(Buffer.from(input.hash).reverse().toString('hex')!==release.fundingTxid||
    input.index!==release.fundingVout)fail('Selected gift release funding mismatch');
 if(tx.locktime!==release.lockHeight||input.sequence===0xffffffff)
  fail('Selected gift release maturity mismatch');
 if(output.value!==release.amountSats||
    output.script.toString('hex')!==release.destinationScriptHex)
  fail('Selected gift release destination or amount mismatch');
 const funding=psbt.data.inputs[0]?.nonWitnessUtxo;
 if(!funding)fail('Approved PSBT funding transaction evidence missing');
 let prev;
 try{prev=bitcoin.Transaction.fromBuffer(funding)}catch{fail('Invalid PSBT funding transaction evidence')}
 if(prev.getId()!==release.fundingTxid||!prev.outs[release.fundingVout])
  fail('Approved PSBT funding transaction differs from selected release');
 if(release.fundingScriptHex!==undefined){
  if(typeof release.fundingScriptHex!=='string'||!/^(?:[0-9a-f]{2})+$/.test(release.fundingScriptHex))
   fail('Invalid selected gift funding script');
  if(prev.outs[release.fundingVout].script.toString('hex')!==release.fundingScriptHex)
   fail('Selected gift locking script mismatch');
 }
 if(release.inputSats!==undefined){
  if(!Number.isSafeInteger(release.inputSats)||release.inputSats<1||
     prev.outs[release.fundingVout].value!==release.inputSats)
   fail('Selected gift funding amount mismatch');
 }
 return Object.freeze({giftLocator:gift.fundingAddress,selectedRelease:release.releaseNumber,
  transactionMatchesSuppliedRelease:true,
  giftProvenanceVerified:false,fundingUtxoVerified:false,signingAuthorized:false,broadcast:false});
}

// Caller-supplied UTXO snapshots are useful for consistency checks but cannot
// authenticate a Bitcoin Core node or prove current chain state on their own.
export function checkGiftReleaseAgainstUtxoSnapshot({binding,release,snapshot}){
 if(binding?.transactionMatchesSuppliedRelease!==true||!release||!snapshot)
  fail('Selected release must match approved PSBT before checking UTXO');
 if(snapshot.txid!==release.fundingTxid||snapshot.vout!==release.fundingVout)
  fail('UTXO outpoint mismatch');
 if(snapshot.confirmed!==true||snapshot.spent!==false)
  fail('Funding UTXO is unconfirmed, spent or unknown');
 if(!Number.isSafeInteger(release.inputSats)||release.inputSats<1||
    snapshot.valueSats!==release.inputSats)
  fail('UTXO funding value mismatch');
 if(typeof release.fundingScriptHex!=='string'||
    snapshot.scriptPubKeyHex!==release.fundingScriptHex)
  fail('UTXO locking script mismatch');
 return Object.freeze({utxoSnapshotMatchesSelectedRelease:true,
  rpcProvenanceVerified:false,chainVerified:false,cltvMaturityVerified:false,
  signingAuthorized:false,broadcast:false});
}
