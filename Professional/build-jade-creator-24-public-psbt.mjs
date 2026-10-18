// Disposable regtest creator funding PSBT: Jade public xpub owns the input.
// No private key, hardware access, production network, or transaction broadcast by this script.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {HDKey} from '@scure/bip32';
import bitcoin from 'bitcoinjs-lib';
const xpub='xpub6DEmMYe9YX53jYvrsLgDexWdvPX7t3MRtKtN2VyPBcBQdMLdatwyzkiBSHzaMh7X7jaThREnhz4YmkZqxDEvpqTnNmMXp2HjinP9Sqakg78';
const fingerprint='e29ac13c';
const fixture=JSON.parse(readFileSync(process.argv[2],'utf8'));
assert.equal(fixture.network,'regtest');
assert.equal(fixture.descriptors.length,24);
const account=HDKey.fromExtendedKey(xpub);
assert.ok(!account.privateKey);
const signer=account.deriveChild(0).deriveChild(0);
const change=account.deriveChild(0).deriveChild(1);
const network=bitcoin.networks.regtest;
const signerPub=Buffer.from(signer.publicKey);
const signerAddress=bitcoin.payments.p2wpkh({pubkey:signerPub,network});
const changeAddress=bitcoin.payments.p2wpkh({pubkey:Buffer.from(change.publicKey),network});
function rpc(...args){
 const cmd=['exec','bc1q21-jade-creator','bitcoin-cli','-datadir=/work','-regtest','-rpcuser=regtest','-rpcpassword=disposable'];
 const s=execFileSync('docker',[...cmd,...args.map(String)],{encoding:'utf8'}).trim();
 try{return JSON.parse(s)}catch{return s}
}
function wallet(...args){
 const cmd=['exec','bc1q21-jade-creator','bitcoin-cli','-datadir=/work','-regtest','-rpcuser=regtest','-rpcpassword=disposable','-rpcwallet=mining'];
 const s=execFileSync('docker',[...cmd,...args.map(String)],{encoding:'utf8'}).trim();
 try{return JSON.parse(s)}catch{return s}
}
assert.equal(rpc('getblockcount'),0);
rpc('createwallet','mining');
const mining=wallet('getnewaddress');
wallet('generatetoaddress',121,mining);
const fundingTxid=wallet('sendtoaddress',signerAddress.address,'0.01');
wallet('generatetoaddress',1,mining);
const funded=rpc('getrawtransaction',fundingTxid,'true');
const vouts=funded.vout.filter(v=>v.scriptPubKey.hex===signerAddress.output.toString('hex'));
assert.equal(vouts.length,1);
const utxo=vouts[0];
assert.equal(utxo.value,0.01);
assert.ok(rpc('gettxout',fundingTxid,utxo.n));
const psbt=new bitcoin.Psbt({network});
psbt.addInput({hash:fundingTxid,index:utxo.n,witnessUtxo:{script:signerAddress.output,value:1000000},
 bip32Derivation:[{masterFingerprint:Buffer.from(fingerprint,'hex'),path:"m/84'/0'/0'/0/0",pubkey:signerPub}]});
let total=0;
for(const d of fixture.descriptors){
 const value=d.sats;total+=value;
 psbt.addOutput({script:Buffer.from(d.scriptPubKey,'hex'),value});
}
const fee=2500,changeSats=1000000-total-fee;
assert.ok(changeSats>1000);
psbt.addOutput({address:changeAddress.address,value:changeSats});
assert.equal(psbt.txInputs.length,1);
assert.equal(psbt.txOutputs.length,25);
assert.equal(psbt.data.inputs[0].partialSig,undefined);
const raw=psbt.toBuffer();
const record={format:'bc1q21-professional-creator-24-jade-public-unsigned-v1',network:'regtest',
 creatorFingerprint:fingerprint,creatorPath:"m/84'/0'/0'/0/0",
 creatorPubkeyHex:signerPub.toString('hex'),creatorAddress:signerAddress.address,
 creatorFundingOutpoint:fundingTxid+':'+utxo.n,creatorInputSats:1000000,
 recipientOutputs:fixture.descriptors.map((d,i)=>({index:i,sats:d.sats,scriptPubKey:d.scriptPubKey})),
 changeAddress:changeAddress.address,changeSats,feeSats:fee,
 psbtBase64:psbt.toBase64(),psbtSha256:createHash('sha256').update(raw).digest('hex'),
 psbtBytes:raw.length,unsigned:true,hardwareScanned:false,broadcast:false,
 caveat:'xpub and fingerprint are prior public test records, not fresh device attestation'};
writeFileSync(process.argv[3],JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('PASS_JADE_PUBLIC_CREATOR_24_UNSIGNED',JSON.stringify({inputSats:1000000,recipientSats:total,changeSats,feeSats:fee,psbtBytes:raw.length,psbtSha256:record.psbtSha256}));
