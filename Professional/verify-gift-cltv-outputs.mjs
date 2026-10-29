// bc1q21 Professional: independently derive a Bitcoin CLTV P2SH output from
// an approved calendar release and the recipient's Jade PUBLIC child key.
// No private key, no signing, no chain queries, no broadcast. Regtest only.
import bitcoin from 'bitcoinjs-lib';
const fail=m=>{throw Error('Professional CLTV output: '+m)};
export function verifyGiftCltvOutputs({intent,plan,recipientPublicKeys}) {
 if(intent?.format!=='bc1q21-professional-funded-distribution-intent-v1'||
    intent.network!=='regtest'||intent.signed!==false||
    intent.broadcastAuthorized!==false||
    plan?.format!=='bc1q21-professional-retail-plan-preview-v1'||
    plan.status!=='UNFUNDED_PREVIEW_NOT_SIGNABLE'||
    !Array.isArray(plan.releases)||!plan.releases.length||
    !Array.isArray(intent.gifts)||intent.gifts.length!==plan.releases.length||
    !Array.isArray(recipientPublicKeys)||recipientPublicKeys.length!==plan.releases.length)
   fail('Approved regtest gift schedule and recipient public keys required');
 const releases=[];
 for(let i=0;i<plan.releases.length;i++){
   const planned=plan.releases[i],gift=intent.gifts[i],key=recipientPublicKeys[i];
   if(typeof planned.date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(planned.date)||
      !Number.isSafeInteger(planned.amountSats)||planned.amountSats<=0||
      gift?.date!==planned.date||gift.valueSats!==planned.amountSats)
     fail('Release date or value differs from approved plan');
   const midnight=Date.parse(planned.date+'T00:00:00.000Z');
   if(!Number.isFinite(midnight)||new Date(midnight).toISOString().slice(0,10)!==planned.date)
     fail('Invalid calendar date');
   const locktime=midnight/1000;
   if(!Number.isSafeInteger(locktime)||locktime<500000000||gift.locktime!==locktime)
     fail('Incorrect timestamp CLTV locktime');
   if(typeof key!=='string'||!/^(02|03)[0-9a-fA-F]{64}$/.test(key))
     fail('Compressed recipient public key required');
   const pubkey=Buffer.from(key,'hex');
   try{bitcoin.payments.p2pkh({pubkey,network:bitcoin.networks.regtest})}
   catch{fail('Invalid recipient public key')}
   const redeem=bitcoin.script.compile([
     bitcoin.script.number.encode(locktime),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
     bitcoin.opcodes.OP_DROP,pubkey,bitcoin.opcodes.OP_CHECKSIG
   ]);
   const output=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest}).output;
   if(!output||output.toString('hex')!==gift.scriptPubKeyHex?.toLowerCase())
     fail('Gift CLTV script does not match intended recipient and release date');
   releases.push(Object.freeze({date:planned.date,locktime,
     valueSats:gift.valueSats,recipientPubkeyHex:pubkey.toString('hex'),
     scriptPubKeyHex:output.toString('hex'),redeemScriptHex:redeem.toString('hex')}));
 }
 return Object.freeze({
   format:'bc1q21-professional-cltv-output-consistency-v1',
   network:'regtest',releases:Object.freeze(releases),
   scriptsMatchSuppliedPublicKeysAndPlan:true,
   recipientKeyOriginAuthenticated:false,
   chainVerified:false,signingAuthorized:false,broadcastAuthorized:false
 });
}
