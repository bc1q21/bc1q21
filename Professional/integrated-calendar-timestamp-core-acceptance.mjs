// Bitcoin Core regtest: fund the exact Professional public-only handoff, build its PSBT,
// sign with a deterministic disposable regtest-only fixture key, and test mempool acceptance.
// Never broadcast. No Jade, mainnet, seed phrase, or production funding.
import assert from 'node:assert/strict';
import http from 'node:http';
import bitcoin from 'bitcoinjs-lib';
import { secp256k1 } from '@noble/curves/secp256k1';
import { Buffer } from 'node:buffer';
import { prepareProfessionalReleaseFromPublicHandoff } from './public-funding-release-integration.mjs';

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
const wallet='professional-calendar-timestamp';
await rpc('createwallet',[wallet]);
const miningAddress=await rpc('getnewaddress',[],wallet);
await rpc('generatetoaddress',[120,miningAddress]);

// Distinct deterministic fixture key: never use outside ephemeral regtest.
const privateKey=Buffer.alloc(32);privateKey[31]=9;
const pubkey=Buffer.from(secp256k1.getPublicKey(privateKey,true));
const locktime=1700000000; // UTC 2023-11-14, safely before disposable runner MTP
const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
 bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pubkey,bitcoin.opcodes.OP_CHECKSIG]);
const p2sh=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
const handoff={version:1,network:'regtest',signerPubkeyHex:pubkey.toString('hex'),locktime,
 redeemScriptHex:redeem.toString('hex'),fundingAddress:p2sh.address};
assert.ok((await rpc('getblockheader',[(await rpc('getbestblockhash'))])).mediantime>locktime,'Core MTP must exceed timestamp lock');
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
 const signingScript=opts.wrongScript?bitcoin.script.compile([bitcoin.script.number.encode(1700000001),
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
await check('Professional-builder funded regtest CLTV spend',signedTx(),true);
await check('early locktime',signedTx({locktime:1699999999}),false);
await check('final sequence',signedTx({sequence:0xffffffff}),false);
await check('bad signature',signedTx({corruptSignature:true}),false);
await check('modified output',signedTx({modifyOutput:true}),false);
await check('wrong redeem script',signedTx({wrongScript:true}),false);
console.log('PASS: genuine calendar-timestamp CLTV regtest UTXO -> public-only Professional PSBT -> disposable signature -> Bitcoin Core acceptance. No broadcast.');
