// Bitcoin Core regtest: fund the exact Professional public-only handoff, build its PSBT,
// sign with a deterministic disposable regtest-only fixture key, and test mempool acceptance.
// Never broadcast. No Jade, mainnet, seed phrase, or production funding.
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Buffer } from 'node:buffer';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';
import { prepareRecipientReleaseEvidence } from './professional-recipient-release-bridge.mjs';

const port=Number(process.env.REGTEST_RPC_PORT||18443);
const auth='Basic '+Buffer.from('professional:synthetic-only').toString('base64');
async function rpc(method,params=[],wallet=''){
 const body=JSON.stringify({jsonrpc:'1.0',id:'professional-integrated',method,params});
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:wallet?'/wallet/'+encodeURIComponent(wallet):'/',method:'POST',
   headers:{authorization:auth,'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
   let out='';res.on('data',b=>out+=b);res.on('end',()=>{try{
    const j=JSON.parse(out);if(j.error)reject(Error(method+': '+JSON.stringify(j.error)));else resolve(j.result);
   }catch(e){reject(e)}});
  });req.on('error',reject);req.end(body);
 });
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<30;i++){try{await rpc('getblockchaininfo');break}catch(e){if(i===29)throw e;await sleep(1000)}}
assert.equal((await rpc('getblockchaininfo')).chain,'regtest');
const wallet='professional-integrated-public-handoff';
await rpc('createwallet',[wallet]);
const miningAddress=await rpc('getnewaddress',[],wallet);
await rpc('generatetoaddress',[120,miningAddress]);

// Distinct deterministic fixture key: never use outside ephemeral regtest.
const privateKey=Buffer.alloc(32);privateKey[31]=9;
const pubkey=Buffer.from(secp256k1.getPublicKey(privateKey,true));
const locktime=110;
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pubkey,bitcoin.opcodes.OP_CHECKSIG]);
const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:pubkey.toString('hex'),locktime,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:p2sh.address};
const txid=await rpc('sendtoaddress',[p2sh.address,0.001],wallet);
await rpc('generatetoaddress',[1,miningAddress]);
const fundingWithWitnessHex=(await rpc('gettransaction',[txid],wallet)).hex;
const funding=bitcoin.Transaction.fromHex(fundingWithWitnessHex);
// The prototype's nonWitnessUtxo parser accepts legacy transaction serialization only.
// Strip witness serialization without changing the transaction ID or output scripts.
// bitcoinjs-lib v6 toBuffer() always includes witness; __toBuffer(..., false) serializes stripped tx.
const fundingHex=funding.__toBuffer(undefined,undefined,false).toString('hex');
assert.notEqual(fundingHex.slice(8,12),'0001','Funding must not contain a SegWit marker');
assert.equal(bitcoin.Transaction.fromHex(fundingHex).getId(),txid);
const vout=funding.outs.findIndex(o=>Buffer.from(o.script).equals(Buffer.from(p2sh.output)));
assert.ok(vout>=0);
const inputSats=funding.outs[vout].value;
const dest=bitcoin.payments.p2wpkh({pubkey:Buffer.from(secp256k1.getPublicKey(Buffer.from([...Buffer.alloc(31),10]),true)),network:bitcoin.networks.regtest});
const details={fundingTxHex:fundingHex,vout,expectedTxid:txid,expectedSats:inputSats,
 masterFingerprintHex:'00000009',derivationPath:[0x80000054,0x80000000,0x80000000,1,10],
 destinationScriptHex:dest.output.toString('hex'),destinationSats:inputSats-1000};
const built=prepareProfessionalReleaseFromPublicHandoff(handoff,details);
assert.equal(built.signed,false);assert.equal(built.broadcast,false);
const unsigned=bitcoin.Psbt.fromBase64(built.unsignedPsbtBase64);
assert.equal(unsigned.txInputs.length,1);assert.equal(unsigned.txOutputs.length,1);
assert.equal(unsigned.locktime,locktime);
assert.equal(unsigned.data.inputs[0].redeemScript.toString('hex'),redeem.toString('hex'));
assert.equal(unsigned.data.inputs[0].nonWitnessUtxo.toString('hex'),fundingHex);
assert.equal(unsigned.data.inputs[0].bip32Derivation[0].pubkey.toString('hex'),pubkey.toString('hex'));
const baseTx=bitcoin.Transaction.fromBuffer(unsigned.data.globalMap.unsignedTx.toBuffer());
const signedTx=(opts={})=>{
 const tx=bitcoin.Transaction.fromBuffer(baseTx.toBuffer());
 tx.locktime=opts.locktime??tx.locktime;
 tx.ins[0].sequence=opts.sequence??tx.ins[0].sequence;
 const signingScript=opts.wrongScript?bitcoin.script.compile([bitcoin.script.number.encode(111),
  bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pubkey,bitcoin.opcodes.OP_CHECKSIG]):redeem;
 const digest=tx.hashForSignature(0,signingScript,bitcoin.Transaction.SIGHASH_ALL);
 const signature=Buffer.from(bitcoin.script.signature.encode(
  Buffer.from(secp256k1.sign(digest,privateKey).toCompactRawBytes()),bitcoin.Transaction.SIGHASH_ALL));
 if(opts.corruptSignature)signature[10]^=1;
 tx.ins[0].script=bitcoin.script.compile([signature,signingScript]);
 // Mutate AFTER signing: this must invalidate the SIGHASH_ALL signature.
 if(opts.modifyOutput)tx.outs[0].value--;
 return tx.toHex();
};
async function check(label,raw,allowed){
 const results=await rpc('testmempoolaccept',[[raw]]);
 assert.equal(results.length,1);
 assert.equal(results[0].allowed,allowed,label+': '+JSON.stringify(results[0]));
 console.log(JSON.stringify({label,allowed:results[0].allowed,reason:results[0]['reject-reason']??null}));
}

const {validateProfessionalRecipientSignedReturn,
 broadcastVerifiedProfessionalRegtestRelease,confirmProfessionalRegtestRedemption} =
 await import('./complete-recipient-regtest-release.mjs');

const recipientEvidence = prepareRecipientReleaseEvidence({
  publicHandoff: handoff,
  funding: details,
  releaseNumber: 1
});

assert.equal(recipientEvidence.releaseNumber, 1);
assert.equal(
  recipientEvidence.approvedUnsignedBase64,
  built.unsignedPsbtBase64
);
assert.match(
  recipientEvidence.expectedApprovedSha256,
  /^[0-9a-f]{64}$/
);
assert.equal(recipientEvidence.publicGift.fundingAddress, handoff.fundingAddress);
assert.equal(recipientEvidence.publicGift.releases.length, 1);
assert.equal(recipientEvidence.publicRelease.fundingTxid, txid);
assert.equal(recipientEvidence.publicRelease.fundingVout, vout);
assert.equal(recipientEvidence.publicRelease.lockHeight, locktime);
assert.equal(recipientEvidence.publicRelease.inputSats, inputSats);
assert.equal(recipientEvidence.publicRelease.amountSats, inputSats - 1000);
assert.equal(recipientEvidence.publicRelease.fundingScriptHex, p2sh.output.toString('hex'));
assert.equal(recipientEvidence.publicRelease.destinationScriptHex, dest.output.toString('hex'));
assert.equal(recipientEvidence.publicRelease.signingAuthorized, false);

mkdirSync('Professional/artifacts', { recursive: true });
writeFileSync(
  'Professional/artifacts/recipient-public-gift-regtest.json',
  JSON.stringify(recipientEvidence.publicGift, null, 2) + '\n'
);
writeFileSync(
  'Professional/artifacts/recipient-unsigned-psbt-regtest.json',
  JSON.stringify({
    releaseNumber: recipientEvidence.releaseNumber,
    approvedUnsignedBase64: recipientEvidence.approvedUnsignedBase64,
    expectedApprovedSha256: recipientEvidence.expectedApprovedSha256
  }, null, 2) + '\n'
);
console.log(
  'PASS: funded regtest release builder produces recipient PSBT evidence.'
);

// Disposable synthetic signer models Jade's signed PSBT return; no hardware
// secrets are accessed. Validate the exact same file contract as the browser.
const signedPsbt=bitcoin.Psbt.fromBase64(recipientEvidence.approvedUnsignedBase64);
const signatureDigest=baseTx.hashForSignature(0,redeem,bitcoin.Transaction.SIGHASH_ALL);
const syntheticSignature=Buffer.from(bitcoin.script.signature.encode(
 Buffer.from(secp256k1.sign(signatureDigest,privateKey).toCompactRawBytes()),
 bitcoin.Transaction.SIGHASH_ALL));
signedPsbt.updateInput(0,{partialSig:[{pubkey,signature:syntheticSignature}]});
const signedReturn={
 format:'bc1q21-professional-verified-jade-return-v1',network:'regtest',
 releaseNumber:1,approvedUnsignedSha256:recipientEvidence.expectedApprovedSha256,
 signedPsbtBase64:signedPsbt.toBase64(),signatureCryptographicallyVerified:true,
 chainVerified:false,broadcast:false
};
const finalized=validateProfessionalRecipientSignedReturn({
 gift:recipientEvidence.publicGift,
 evidence:{releaseNumber:1,approvedUnsignedBase64:recipientEvidence.approvedUnsignedBase64,
  expectedApprovedSha256:recipientEvidence.expectedApprovedSha256},
 signedReturn
});
assert.equal(finalized.signatureCryptographicallyVerified,true);
await check('Verified recipient signed-return transaction',finalized.rawTransactionHex,true);

await check('Professional-builder funded regtest CLTV spend',signedTx(),true);
await check('early locktime',signedTx({locktime:109}),false);
await check('final sequence',signedTx({sequence:0xffffffff}),false);
await check('bad signature',signedTx({corruptSignature:true}),false);
await check('modified output',signedTx({modifyOutput:true}),false);
await check('wrong redeem script',signedTx({wrongScript:true}),false);
// End-to-end disposable redemption: broadcast only on regtest, then mine
// a confirmation and verify the exact approved outpoint is spent.
const broadcast=await broadcastVerifiedProfessionalRegtestRelease(finalized.rawTransactionHex);
assert.equal(broadcast.txid,finalized.txid);
assert.equal(broadcast.broadcast,true);
const mempool=await rpc('getmempoolentry',[finalized.txid]);
assert.ok(mempool);
await rpc('generatetoaddress',[1,miningAddress]);
const confirmed=await rpc('getrawtransaction',[finalized.txid,true]);
assert.ok(confirmed.confirmations>=1,'Recipient redemption not confirmed');
assert.equal(await rpc('gettxout',[txid,vout]),null,'Redeemed gift output remains unspent');
const receipt=await confirmProfessionalRegtestRedemption({fundingTxid:txid,fundingVout:vout,releaseTxid:finalized.txid});
assert.equal(receipt.confirmed,true);
assert.ok(receipt.confirmations>=1);
await assert.rejects(confirmProfessionalRegtestRedemption({fundingTxid:txid,fundingVout:vout,releaseTxid:finalized.txid,expectedConfirmations:9999}),/not sufficiently confirmed/);
await assert.rejects(confirmProfessionalRegtestRedemption({fundingTxid:'00'.repeat(32),fundingVout:vout,releaseTxid:finalized.txid}),/does not spend selected gift output/);
console.log('PASS: funded gift -> synthetic Jade-compatible PSBT -> signed return -> regtest broadcast -> confirmed redemption.');
