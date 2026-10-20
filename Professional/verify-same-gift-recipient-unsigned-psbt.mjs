// One-gift REAL Bitcoin Core regtest -> recipient UNSIGNED CLTV PSBT.
// Reuses the same 24-output funding transaction. Read-only RPC, no secrets/signing/broadcast.
// Synthetic destination and fingerprint are NOT authorized recipient identity.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyReturnedSignedProfessionalPsbt} from './verify-signed-psbt-return.mjs';
import bitcoin from 'bitcoinjs-lib';
import {HDKey} from '@scure/bip32';
import {createLocalRegtestReadOnlyRpc} from './one-gift-local-regtest-rpc.mjs';
import {buildUnsignedCltvPsbt} from './unsigned-cltv-psbt.mjs';
const [fixturePath,discoveryPath,phase,outputPath]=process.argv.slice(2);
assert.ok(fixturePath&&discoveryPath&&['premature','mature'].includes(phase),'Expected public fixture, discovery and phase');
const fixture=JSON.parse(readFileSync(fixturePath,'utf8'));
const discovery=JSON.parse(readFileSync(discoveryPath,'utf8'));
assert.equal(fixture.network,'regtest');assert.equal(discovery.network,'regtest');
assert.equal(fixture.privateKeysIncluded,false);
assert.equal(fixture.masterFingerprintHex,'e29ac13c','Expected pinned disposable Jade public fingerprint');
assert.equal(fixture.descriptors.length,24);assert.equal(discovery.releaseOutputs.length,24);
const d=fixture.descriptors[0],release=discovery.releaseOutputs.find(x=>x.index===d.index);
assert.ok(release,'First gift release must be present');
const rpc=createLocalRegtestReadOnlyRpc({username:'regtest',password:'disposable',port:18443});
const before=await rpc('getblockchaininfo');
assert.equal(before.chain,'regtest');assert.match(before.bestblockhash,/^[0-9a-f]{64}$/);
const tx=await rpc('getrawtransaction',[discovery.fundingTxid,true]);
assert.equal(tx.txid,discovery.fundingTxid);assert.match(tx.blockhash,/^[0-9a-f]{64}$/);
const head=await rpc('getblockheader',[tx.blockhash,true]);
assert.ok(head.confirmations>=1&&head.height>=1,'Funding must be confirmed');
const raw=await rpc('getrawtransaction',[discovery.fundingTxid,false]);
const funding=bitcoin.Transaction.fromHex(raw);
assert.equal(funding.getId(),discovery.fundingTxid);
const matches=funding.outs.map((x,i)=>({vout:i,sats:x.value,script:Buffer.from(x.script).toString('hex')})).filter(x=>x.script===d.scriptPubKey);
assert.equal(matches.length,1,'Unique gift release output required');
const match=matches[0];
assert.equal(match.vout,release.vout);assert.equal(match.sats,release.sats);
assert.equal(match.sats,d.sats);assert.equal(match.script,release.scriptPubKey);
const unspent=await rpc('gettxout',[discovery.fundingTxid,match.vout,true]);
assert.ok(unspent&&unspent.confirmations>=1,'Funding output missing/spent');
assert.equal(unspent.bestblock,before.bestblockhash);
assert.equal(unspent.scriptPubKey.hex,match.script);
assert.equal(Math.round(unspent.value*1e8),match.sats);
const after=await rpc('getblockchaininfo');
assert.equal(after.chain,'regtest');assert.equal(after.bestblockhash,before.bestblockhash);
assert.equal(after.blocks,before.blocks);
const confirm=await rpc('getblockheader',[tx.blockhash,true]);
assert.ok(confirm.confirmations>=1&&confirm.hash===head.hash&&confirm.height===head.height,'Funding block disconnected');
assert.ok(Number.isSafeInteger(d.locktime)&&d.locktime>=1&&d.locktime<500000000,'Height CLTV only');
const nextBlockHeight=after.blocks+1;
const canMature=nextBlockHeight>d.locktime;
if(phase==='premature'){
 assert.equal(canMature,false,'Premature check must run before CLTV maturity');
 console.log(JSON.stringify({result:'PASS_SAME_GIFT_PREMATURE_PSBT_BLOCKED',network:'regtest',fundingTxid:tx.txid,releaseIndex:d.index,locktime:d.locktime,nextBlockHeight,canSign:false,canBroadcast:false}));
}else{
 assert.equal(canMature,true,'Release must pass CLTV next-block maturity');
 // Legacy redeem is spending one P2SH output: strip SegWit witness from the
 // funding tx serialization, preserving txid and outputs, for the legacy PSBT parser.
 const legacy=funding.clone();for(const vin of legacy.ins)vin.witness=[];
 const legacyHex=legacy.toHex();
 assert.equal(bitcoin.Transaction.fromHex(legacyHex).getId(),funding.getId());
 const path=d.path.match(/^m\/84'\/0'\/0'\/1\/(\d+)$/);
 assert.ok(path&&Number(path[1])===d.index,'Unrecognized public derivation path');
 const payout=match.sats-1000;
 const account=HDKey.fromExtendedKey(fixture.accountXpub);
 const recipientPub=Buffer.from(account.deriveChild(0).deriveChild(0).publicKey);
 const destinationScriptHex='0014'+createHash('ripemd160').update(createHash('sha256').update(recipientPub).digest()).digest('hex');
 // This destination is not associated with a user wallet: NO SIGNING.
 const result=buildUnsignedCltvPsbt({fundingTxHex:legacyHex,
  vout:match.vout,expectedTxid:discovery.fundingTxid,expectedSats:match.sats,
  redeemScriptHex:d.redeemScriptHex,signerPubkeyHex:d.publicKeyHex,
  masterFingerprintHex:fixture.masterFingerprintHex,
  derivationPath:[0x80000054,0x80000000,0x80000000,1,d.index],
  locktime:d.locktime,destinationScriptHex:destinationScriptHex,destinationSats:payout});
 const psbt=bitcoin.Psbt.fromBase64(result.psbtBase64,{network:bitcoin.networks.regtest});
 assert.equal(psbt.txInputs.length,1);assert.equal(psbt.txOutputs.length,1);
 assert.equal(psbt.txInputs[0].index,match.vout);
 assert.equal(Buffer.from(psbt.txInputs[0].hash).reverse().toString('hex'),discovery.fundingTxid);
 assert.equal(psbt.txOutputs[0].value,payout);
 assert.equal(result.summary.locktime,d.locktime);
 assert.equal(result.summary.feeSats,1000);
 assert.equal(psbt.data.inputs[0].partialSig,undefined,'PSBT must remain unsigned');
 // Connect the EXACT real-funded unsigned PSBT to the existing signed-return
 // boundary. A missing signature MUST fail, and even a valid signature later
 // would require independent recipient approval and current-Core rechecks.
 const approvedDigest=createHash('sha256').update(Buffer.from(result.psbtBase64,'base64')).digest('hex');
 assert.throws(()=>verifyReturnedSignedProfessionalPsbt(result.psbtBase64,result.psbtBase64,approvedDigest),
  /no signing material/,'Unsigned handoff cannot masquerade as signed Jade return');
 const altered=bitcoin.Psbt.fromBase64(result.psbtBase64,{network:bitcoin.networks.regtest});
 altered.updateInput(0,{sighashType:bitcoin.Transaction.SIGHASH_NONE});
 assert.throws(()=>verifyReturnedSignedProfessionalPsbt(result.psbtBase64,altered.toBase64(),approvedDigest),
  /sighash metadata differs/,'Changed signed-return metadata must be rejected');
 assert.throws(()=>verifyReturnedSignedProfessionalPsbt(result.psbtBase64,result.psbtBase64,'0'.repeat(64)),
  /fingerprint mismatch/,'Mismatched approved unsigned fingerprint must be rejected');

 if(outputPath){
  // Unsigned/public-only review artifact. This fixture's xpub and arbitrary
  // destination are NOT recipient authority or usable Jade wallet evidence.
  const manifest={format:'bc1q21-professional-same-gift-unsigned-handoff-v1',
   network:'regtest',fundingTxid:discovery.fundingTxid,vout:match.vout,
   inputSats:match.sats,releaseIndex:d.index,locktime:d.locktime,
   nextBlockHeight,chainTipHash:after.bestblockhash,
   fundingBlockHash:tx.blockhash,confirmedUnspentAtObservation:true,
   signerPubkeyHex:d.publicKeyHex,redeemScriptHex:d.redeemScriptHex,
   destinationScriptHex:destinationScriptHex,
   payoutSats:payout,feeSats:1000,psbtSha256:approvedDigest,
   unsignedPsbtBase64:result.psbtBase64,
   publicOnly:true,disposableFixture:true,recipientAuthenticated:false,
   walletOriginAttested:false,recipientIntentApproved:false,
   signingAuthorized:false,broadcastAuthorized:false};
  assert.ok(!Object.keys(manifest).some(k=>/seed|privateKey|secret|wif/i.test(k)));
  writeFileSync(outputPath,JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
 }
 console.log(JSON.stringify({result:'PASS_REAL_SAME_GIFT_UNSIGNED_CLTV_PSBT',network:'regtest',fundingTxid:discovery.fundingTxid,vout:match.vout,releaseIndex:d.index,locktime:d.locktime,nextBlockHeight,feeSats:1000,psbtBytes:Buffer.from(result.psbtBase64,'base64').length,signedReturnGuardExercised:true,signatureCryptographicallyVerified:false,syntheticDestination:true,fingerprintAttested:false,recipientAuthenticated:false,canSign:false,canBroadcast:false}));
}
