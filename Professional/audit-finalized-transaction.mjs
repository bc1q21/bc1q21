// Isolated Professional regtest: independently inspect the raw finalized
// legacy P2SH CLTV transaction. Never signs, broadcasts or uses secrets.
import bitcoin from 'bitcoinjs-lib';
import { createHash } from 'node:crypto';
import { secp256k1 } from '@noble/curves/secp256k1';
const fail=m=>{throw Error('Professional final transaction audit: '+m)};
export function auditFinalizedProfessionalTransaction(rawHex,approved){
 if(typeof rawHex!=='string'||!/^([a-f0-9]{2})+$/i.test(rawHex)||rawHex.length>200000)
  fail('Invalid raw transaction');
 const fields=['fundingTxid','fundingVout','inputSats','destinationScriptHex','payoutSats','locktime','signerPubkeyHex','redeemScriptHex'];
 if(!approved||typeof approved!=='object'||Array.isArray(approved)||
   Object.keys(approved).length!==fields.length||fields.some(k=>!Object.hasOwn(approved,k)))
  fail('Exact independent expected transaction record required');
 let tx;
 try{tx=bitcoin.Transaction.fromHex(rawHex)}catch{fail('Cannot decode raw transaction')}
 if(tx.ins.length!==1||tx.outs.length!==1||tx.version<2)fail('Unexpected final transaction shape');
 const input=tx.ins[0],output=tx.outs[0];
 if(Buffer.from(input.hash).reverse().toString('hex')!==approved.fundingTxid||
  input.index!==approved.fundingVout)fail('Final transaction spends unexpected UTXO');
 if(tx.locktime!==approved.locktime||input.sequence===0xffffffff)
  fail('Final CLTV locktime or sequence mismatch');
 if(output.script.toString('hex')!==approved.destinationScriptHex||
  output.value!==approved.payoutSats)fail('Final destination or payout mismatch');
 if(!Number.isSafeInteger(approved.inputSats)||approved.inputSats<output.value)
  fail('Invalid expected input amount');
 const fee=approved.inputSats-output.value;
 if(fee<0||fee>100000)fail('Unsafe transaction fee');
 const chunks=bitcoin.script.decompile(input.script);
 if(!chunks||chunks.length!==2||!Buffer.isBuffer(chunks[0])||!Buffer.isBuffer(chunks[1]))
  fail('Unexpected final P2SH unlocking script');
 const redeem=chunks[1];
 if(redeem.toString('hex')!==approved.redeemScriptHex)fail('Final redeem script mismatch');
 const ops=bitcoin.script.decompile(redeem);
 if(!ops||ops.length!==5||!Buffer.isBuffer(ops[0])||
  ops[1]!==bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY||ops[2]!==bitcoin.opcodes.OP_DROP||
  !Buffer.isBuffer(ops[3])||ops[4]!==bitcoin.opcodes.OP_CHECKSIG||
  ops[3].toString('hex')!==approved.signerPubkeyHex)
  fail('Final signer or CLTV script mismatch');
 if(bitcoin.script.number.decode(ops[0],5,true)!==approved.locktime)
  fail('Final CLTV script locktime mismatch');
 let sig;
 try{sig=bitcoin.script.signature.decode(chunks[0])}catch{fail('Invalid final DER signature')}
 if(sig.hashType!==bitcoin.Transaction.SIGHASH_ALL)fail('Final signature is not SIGHASH_ALL');
 const sighash=tx.hashForSignature(0,redeem,sig.hashType);
 if(!secp256k1.verify(sig.signature,sighash,ops[3],{lowS:true}))
  fail('Final Bitcoin signature invalid');
 const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
 return Object.freeze({network:'regtest',txid:tx.getId(),rawSha256:createHash('sha256').update(Buffer.from(rawHex,'hex')).digest('hex'),
  fundingTxid:approved.fundingTxid,feeSats:fee,payoutSats:output.value,
  fundingScriptPubKeyHex:payment.output.toString('hex'),
  signatureCryptographicallyVerified:true,finalTransactionVerified:true,broadcast:false});
}
