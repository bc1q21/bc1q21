// Isolated Professional: cryptographically validate a returned single-input
// legacy P2SH CLTV PSBT signature against the EXACT approved transaction.
// No secrets, signing, finalization, network access or broadcast.
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { verifyReturnedSignedProfessionalPsbt } from './verify-signed-psbt-return.mjs';
const fail=m=>{throw Error('Professional signature verification: '+m)};
export function verifyProfessionalReturnedSignature(originalBase64,signedBase64,approvedSha256){
 const integrity=verifyReturnedSignedProfessionalPsbt(originalBase64,signedBase64,approvedSha256);
 let psbt;
 try{psbt=bitcoin.Psbt.fromBase64(signedBase64)}catch{fail('Invalid signed PSBT')}
 const meta=psbt.data.inputs[0];
 if(!meta.redeemScript||!meta.nonWitnessUtxo||!meta.partialSig||
  meta.partialSig.length!==1||meta.finalScriptSig||meta.finalScriptWitness)
  fail('Expected exactly one non-final legacy signature');
 const ops=bitcoin.script.decompile(meta.redeemScript);
 if(!ops||ops.length!==5||!Buffer.isBuffer(ops[0])||
  ops[1]!==bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY||
  ops[2]!==bitcoin.opcodes.OP_DROP||!Buffer.isBuffer(ops[3])||
  ops[4]!==bitcoin.opcodes.OP_CHECKSIG)fail('Unsupported CLTV redeem script');
 const locktime=bitcoin.script.number.decode(ops[0],5,true);
 const unsigned=psbt.data.globalMap.unsignedTx;
 const tx=bitcoin.Transaction.fromBuffer(unsigned.toBuffer());
 if(tx.ins.length!==1||tx.outs.length!==1||tx.locktime!==locktime||
  tx.ins[0].sequence===0xffffffff)fail('CLTV transaction mismatch');
 const prev=bitcoin.Transaction.fromBuffer(meta.nonWitnessUtxo);
 if(prev.getId()!==Buffer.from(tx.ins[0].hash).reverse().toString('hex')||
  !prev.outs[tx.ins[0].index])fail('Funding mismatch');
 const p2sh=bitcoin.payments.p2sh({redeem:{output:meta.redeemScript},network:bitcoin.networks.regtest});
 if(!prev.outs[tx.ins[0].index].script.equals(p2sh.output))fail('Funding script mismatch');
 const signature=meta.partialSig[0];
 if(!signature.pubkey.equals(ops[3]))fail('Signer does not match CLTV script');
 let decoded;
 try{decoded=bitcoin.script.signature.decode(signature.signature)}
 catch{fail('Malformed DER Bitcoin signature')}
 if(decoded.hashType!==bitcoin.Transaction.SIGHASH_ALL)fail('Only SIGHASH_ALL is permitted');
 if(meta.sighashType!==undefined&&meta.sighashType!==bitcoin.Transaction.SIGHASH_ALL)
  fail('PSBT sighash metadata is not SIGHASH_ALL');
 const hash=tx.hashForSignature(0,meta.redeemScript,decoded.hashType);
 if(!secp256k1.verify(decoded.signature,hash,signature.pubkey,{lowS:true}))
  fail('Invalid Bitcoin transaction signature');
 return Object.freeze({...integrity,signatureCryptographicallyVerified:true,
  signerPubkeyHex:signature.pubkey.toString('hex'),sighashType:decoded.hashType,
  finalized:false,broadcast:false});
}
