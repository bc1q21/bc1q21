import QRCode from 'qrcode';
import bitcoin from 'bitcoinjs-lib';
import {secp256k1} from '@noble/curves/secp256k1';
import {hmac} from '@noble/hashes/hmac';
import {sha512} from '@noble/hashes/sha512';
import {sha256} from '@noble/hashes/sha256';
import {makeCryptoPsbtFrames} from '../crypto-psbt-frames.mjs';
import {verifyGiftReleaseBinding} from './verify-gift-release-binding.mjs';
import {parseBitcoinCoreGettxout} from '../bitcoin-core-gettxout-adapter.mjs';
import {checkGiftReleaseAgainstUtxoSnapshot} from './verify-gift-release-binding.mjs';
import {selectPublicGiftRelease} from './select-public-gift-release.mjs';
import { createJadeSignedCameraReceiver } from '../recipient-jade-signed-camera.browser.mjs';
// bc1q21 Professional isolated regtest browser integration; fixture-only, no broadcast.
import { Buffer } from 'buffer';
import { URDecoder } from '@ngraveio/bc-ur';
import cbor from 'cbor';
import { verifyProfessionalReturnedSignature } from './verify-returned-signature.mjs';
globalThis.Buffer=Buffer;
// Browser-only BIP32 non-hardened public derivation. No seed or private-key handling.
globalThis.bc1q21ProfessionalDerivePublicReleasePlan=function({accountXpub,releaseHeights}){
 if(typeof accountXpub!=='string'||!/^xpub[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(accountXpub))throw Error('Only account xpub supported');
 if(!Array.isArray(releaseHeights)||releaseHeights.length<1||releaseHeights.length>24||releaseHeights.some(n=>!Number.isSafeInteger(n)||n<17||n>499999999))throw Error('Invalid regtest block-height release plan');
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 let n=0n;for(const c of accountXpub){const k=alphabet.indexOf(c);if(k<0)throw Error('Invalid xpub alphabet');n=n*58n+BigInt(k);}
 let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
 const zeros=(accountXpub.match(/^1*/)||[''])[0].length;
 const data=Buffer.concat([Buffer.alloc(zeros),Buffer.from(hex,'hex')]);
 const hash=b=>Buffer.from(sha256(sha256(b)));
 if(data.length!==82||!hash(data.subarray(0,78)).subarray(0,4).equals(data.subarray(78)))throw Error('Invalid xpub checksum');
 if(data.readUInt32BE(0)!==0x0488b21e||data[4]!==3||data.readUInt32BE(9)!==0x80000000)throw Error('Expected account xpub depth 3, account 0');
 const derive=(node,index)=>{
  const indexBytes=Buffer.alloc(4);indexBytes.writeUInt32BE(index);
  const h=Buffer.from(hmac(sha512,node.chain,Buffer.concat([node.pub,indexBytes])));
  const k=BigInt('0x'+h.subarray(0,32).toString('hex'));
  if(k===0n||k>=secp256k1.CURVE.n)throw Error('Invalid child derivation scalar');
  const point=secp256k1.ProjectivePoint.BASE.multiply(k).add(secp256k1.ProjectivePoint.fromHex(node.pub));
  if(point.equals(secp256k1.ProjectivePoint.ZERO))throw Error('Invalid derived point');
  return {pub:Buffer.from(point.toRawBytes(true)),chain:h.subarray(32)};
 };
 const account={chain:data.subarray(13,45),pub:data.subarray(45,78)};
 secp256k1.ProjectivePoint.fromHex(account.pub);
 const branch=derive(account,1);
 return Object.freeze(releaseHeights.map((height,index)=>{
  const signer=derive(branch,index).pub;
  const redeem=bitcoin.script.compile([bitcoin.script.number.encode(height),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,signer,bitcoin.opcodes.OP_CHECKSIG]);
  const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
  return Object.freeze({index,lockHeight:height,signerPubkeyHex:signer.toString('hex'),redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address,fundingScriptPubKeyHex:payment.output.toString('hex'),network:'regtest',originAuthenticated:false,fundingAuthorized:false});
 }));
};
// Development-only public funding address preview from account xpub at /0/0.
// No wallet ownership authentication; never present as a payable address.
globalThis.bc1q21ProfessionalPreviewFundingPublicKey=function({accountXpub}){
 if(typeof accountXpub!=='string'||!/^xpub[1-9A-HJ-NP-Za-km-z]{100,120}$/.test(accountXpub))
  throw Error('Public account xpub required');
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 let n=0n;for(const c of accountXpub){const i=alphabet.indexOf(c);if(i<0)throw Error('Invalid xpub');n=n*58n+BigInt(i);}
 let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
 const raw=Buffer.concat([Buffer.alloc((accountXpub.match(/^1*/)||[''])[0].length),Buffer.from(hex,'hex')]);
 const hash=b=>Buffer.from(sha256(sha256(b)));
 if(raw.length!==82||!hash(raw.subarray(0,78)).subarray(0,4).equals(raw.subarray(78))||
    raw.readUInt32BE(0)!==0x0488b21e||raw[4]!==3||raw.readUInt32BE(9)!==0x80000000)
  throw Error('Invalid account xpub');
 const derive=(node,index)=>{
  const suffix=Buffer.alloc(4);suffix.writeUInt32BE(index);
  const digest=Buffer.from(hmac(sha512,node.chain,Buffer.concat([node.pub,suffix])));
  const scalar=BigInt('0x'+digest.subarray(0,32).toString('hex'));
  if(scalar===0n||scalar>=secp256k1.CURVE.n)throw Error('Invalid public child derivation');
  const point=secp256k1.ProjectivePoint.BASE.multiply(scalar).add(secp256k1.ProjectivePoint.fromHex(node.pub));
  if(point.equals(secp256k1.ProjectivePoint.ZERO))throw Error('Invalid derived public key');
  return {pub:Buffer.from(point.toRawBytes(true)),chain:digest.subarray(32)};
 };
 const account={pub:raw.subarray(45,78),chain:raw.subarray(13,45)};
 const pubkey=derive(derive(account,0),0).pub;
 const payment=bitcoin.payments.p2wpkh({pubkey,network:bitcoin.networks.regtest});
 return Object.freeze({format:'bc1q21-professional-public-funding-key-preview-v1',
  network:'regtest',derivationPath:"m/84'/0'/0'/0/0",
  publicKeyHex:pubkey.toString('hex'),scriptPubKeyHex:payment.output.toString('hex'),
  address:payment.address,accountXpubOriginAuthenticated:false,
  paymentAuthorized:false,canSign:false,canBroadcast:false});
};
// Public-only change output at /0/1 for funded creator transactions.
// Not a wallet identity attestation, not a payable address or signing grant.
globalThis.bc1q21ProfessionalPreviewChangeOutput=function({accountXpub}){
 const funding=globalThis.bc1q21ProfessionalPreviewFundingPublicKey({accountXpub});
 // Derive /0/1 from the same depth-three account, without private keys.
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 let n=0n;for(const c of accountXpub){const i=alphabet.indexOf(c);if(i<0)throw Error('Invalid xpub');n=n*58n+BigInt(i);}
 let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
 const raw=Buffer.concat([Buffer.alloc((accountXpub.match(/^1*/)||[''])[0].length),Buffer.from(hex,'hex')]);
 const derive=(node,index)=>{
  const suffix=Buffer.alloc(4);suffix.writeUInt32BE(index);
  const digest=Buffer.from(hmac(sha512,node.chain,Buffer.concat([node.pub,suffix])));
  const scalar=BigInt('0x'+digest.subarray(0,32).toString('hex'));
  if(scalar===0n||scalar>=secp256k1.CURVE.n)throw Error('Invalid public child scalar');
  const point=secp256k1.ProjectivePoint.BASE.multiply(scalar).add(secp256k1.ProjectivePoint.fromHex(node.pub));
  if(point.equals(secp256k1.ProjectivePoint.ZERO))throw Error('Invalid public child point');
  return {pub:Buffer.from(point.toRawBytes(true)),chain:digest.subarray(32)};
 };
 const account={pub:raw.subarray(45,78),chain:raw.subarray(13,45)};
 const pub=derive(derive(account,0),1).pub;
 const payment=bitcoin.payments.p2wpkh({pubkey:pub,network:bitcoin.networks.regtest});
 return Object.freeze({format:'bc1q21-professional-public-change-preview-v1',
  network:'regtest',address:payment.address,scriptPubKeyHex:payment.output.toString('hex'),
  publicKeyHex:pub.toString('hex'),derivationPath:"m/84'/0'/0'/0/1",
  walletOriginAuthenticated:false,canRequestPayment:false,canSign:false,canBroadcast:false});
};
// Gift-specific recipient output preview using Retail UTC calendar dates and
// Jade account xpub's /1/index public child keys. Not an authorization to fund.
globalThis.bc1q21ProfessionalPreviewGiftOutputs=function({accountXpub,releases}){
 if(!Array.isArray(releases)||releases.length<1||releases.length>24)
  throw Error('One to 24 releases required for current Jade creator workflow');
 const publicFunding=globalThis.bc1q21ProfessionalPreviewFundingPublicKey({accountXpub});
 const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
 let n=0n;for(const c of accountXpub){const i=alphabet.indexOf(c);if(i<0)throw Error('Invalid xpub');n=n*58n+BigInt(i);}
 let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
 const raw=Buffer.concat([Buffer.alloc((accountXpub.match(/^1*/)||[''])[0].length),Buffer.from(hex,'hex')]);
 const derive=(node,index)=>{
  const suffix=Buffer.alloc(4);suffix.writeUInt32BE(index);
  const digest=Buffer.from(hmac(sha512,node.chain,Buffer.concat([node.pub,suffix])));
  const scalar=BigInt('0x'+digest.subarray(0,32).toString('hex'));
  if(scalar===0n||scalar>=secp256k1.CURVE.n)throw Error('Invalid public child derivation');
  const point=secp256k1.ProjectivePoint.BASE.multiply(scalar).add(secp256k1.ProjectivePoint.fromHex(node.pub));
  if(point.equals(secp256k1.ProjectivePoint.ZERO))throw Error('Invalid public child point');
  return {pub:Buffer.from(point.toRawBytes(true)),chain:digest.subarray(32)};
 };
 const branch=derive({pub:raw.subarray(45,78),chain:raw.subarray(13,45)},1);
 const outputs=releases.map((release,index)=>{
  if(typeof release?.date!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(release.date)||
     !Number.isSafeInteger(release.amountSats)||release.amountSats<=0)
   throw Error('Invalid gift release');
  const ms=Date.parse(release.date+'T00:00:00.000Z');
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==release.date)
   throw Error('Invalid calendar date');
  const locktime=ms/1000;
  if(!Number.isSafeInteger(locktime)||locktime<500000000||locktime>0xffffffff)
   throw Error('Invalid CLTV timestamp');
  const pub=derive(branch,index).pub;
  const redeem=bitcoin.script.compile([bitcoin.script.number.encode(locktime),
    bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pub,bitcoin.opcodes.OP_CHECKSIG]);
  const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
  return Object.freeze({index,date:release.date,valueSats:release.amountSats,locktime,
    publicKeyHex:pub.toString('hex'),redeemScriptHex:redeem.toString('hex'),
    scriptPubKeyHex:payment.output.toString('hex'),giftAddress:payment.address,
    derivationPath:`m/84'/0'/0'/1/${index}`});
 });
 return Object.freeze({format:'bc1q21-professional-public-gift-outputs-preview-v1',
  network:'regtest',fundingPublicKeyHex:publicFunding.publicKeyHex,
  fundingScriptPubKeyHex:publicFunding.scriptPubKeyHex,
  outputs:Object.freeze(outputs),walletOriginAuthenticated:false,
  chainVerified:false,canRequestPayment:false,canSign:false,canBroadcast:false});
};
// Public-only CLTV script/address verification; does not attest wallet origin.
globalThis.bc1q21ProfessionalVerifyPublicHandoff=function(payload){
 const fields=['version','network','signerPubkeyHex','locktime','redeemScriptHex','fundingAddress'];
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length!==fields.length||Object.keys(payload).some(k=>!fields.includes(k)))throw Error('Invalid public-only handoff fields');
 if(payload.version!==1||payload.network!=='regtest'||typeof payload.signerPubkeyHex!=='string'||!/^(02|03)[0-9a-f]{64}$/i.test(payload.signerPubkeyHex)||!Number.isSafeInteger(payload.locktime)||payload.locktime<1||payload.locktime>0xffffffff||typeof payload.redeemScriptHex!=='string'||!/^[0-9a-f]+$/i.test(payload.redeemScriptHex))throw Error('Invalid regtest public handoff');
 const pubkey=Buffer.from(payload.signerPubkeyHex,'hex');
 const redeem=bitcoin.script.compile([bitcoin.script.number.encode(payload.locktime),bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,bitcoin.opcodes.OP_DROP,pubkey,bitcoin.opcodes.OP_CHECKSIG]);
 if(redeem.toString('hex')!==payload.redeemScriptHex.toLowerCase())throw Error('Public handoff redeem script mismatch');
 const payment=bitcoin.payments.p2sh({redeem:{output:redeem},network:bitcoin.networks.regtest});
 if(payload.fundingAddress!==payment.address)throw Error('Public handoff funding address mismatch');
 return Object.freeze({network:'regtest',version:1,signerPubkeyHex:pubkey.toString('hex'),locktime:payload.locktime,redeemScriptHex:redeem.toString('hex'),fundingAddress:payment.address,fundingScriptPubKeyHex:payment.output.toString('hex'),secretsReceived:false});
};
const approved='cHNidP8BAFICAAAAAZWWt9gtVaCtotddOPqVTUGGgcsGQIpROecI+/ZeSn2cAAAAAAD+////AbiCAQAAAAAAFgAUGFFAu1RwSp5zUBb6p6jb7kRJvdyAuFJlAAEAkwIAAAAB+eJO7arUra5pLt/blCfI60nvYZORs/xymLzqf5iOd8IAAAAAAP3///8DoIYBAAAAAAAXqRQhC8kpXH2XCPq0ZEw5Ow4ZCyDbk4dADQMAAAAAABepFHoIVN0kKE8sHtcfNOPSv3EqBT1Sh3Fk/pQAAAAAF6kUNnw+XxO0qIp/bD0ln/OzKGPPs2iHagEAAAEEKgSAuFJlsXUhA0gDJaBQZbLx/Ss+EMiC++3e2cv68v0KRX8vLNbIKZdArCIGA0gDJaBQZbLx/Ss+EMiC++3e2cv68v0KRX8vLNbIKZdAGOKawTxUAACAAAAAgAAAAIABAAAAAAAAAAAA';
const digest='c5cfe8f53212d2aa3a4f2a747993f62a1284e5f973627b1c9410b1ad61659961';
globalThis.bc1q21ProfessionalVerify=async function(frames){
 if(!Array.isArray(frames)||frames.length<1||frames.length>512)throw Error('Invalid frame count');
 const decoder=new URDecoder(),seen=new Set();
 for(const frame of frames){
  if(typeof frame!=='string'||frame.length>8192||!/^ur:crypto-psbt\//i.test(frame))throw Error('Invalid QR frame');
  const key=frame.trim().toLowerCase();if(seen.has(key))continue;seen.add(key);decoder.receivePart(frame);
 }
 if(!decoder.isComplete()||!decoder.isSuccess()||decoder.resultUR().type!=='crypto-psbt')throw Error('Signed Jade QR reconstruction incomplete');
 const payload=cbor.decodeFirstSync(Buffer.from(decoder.resultUR().cbor));
 if(!Buffer.isBuffer(payload)&&!(payload instanceof Uint8Array))throw Error('Invalid PSBT payload');
 const bytes=Buffer.from(payload);
 if(bytes.length>100000||bytes.subarray(0,5).toString('hex')!=='70736274ff')throw Error('Invalid PSBT header');
 const verified=verifyProfessionalReturnedSignature(approved,bytes.toString('base64'),digest);
 if(verified.signerPubkeyHex!=='03480325a05065b2f1fd2b3e10c882fbedded9cbfaf2fd0a457f2f2cd6c8299740')throw Error('Wrong signer');
 return verified;
};

/** Diagnostic-only physical camera integration. No transaction broadcast. */
globalThis.bc1q21ProfessionalAttachCamera=function({video,canvas,onStatus,onVerified}){
 if(typeof onVerified!=='function')throw Error('Verified callback required');
 const receiver=createJadeSignedCameraReceiver({video,canvas,onStatus,
  onSignedPsbt:async bytes=>{
   const verified=verifyProfessionalReturnedSignature(approved,Buffer.from(bytes).toString('base64'),digest);
   if(verified.signerPubkeyHex!=='03480325a05065b2f1fd2b3e10c882fbedded9cbfaf2fd0a457f2f2cd6c8299740'||
      verified.signatureCryptographicallyVerified!==true||verified.transactionMatches!==true||
      verified.broadcast!==false)throw Error('Jade signed return did not pass required checks');
   await onVerified(verified);
  }});
 return receiver;
};

// Public gift/release review is independent of the fixed Jade signing diagnostic.
globalThis.bc1q21ProfessionalSelectPublicGiftRelease=selectPublicGiftRelease;

// Caller-supplied UTXO snapshots are consistency checks, not authenticated RPC evidence.
globalThis.bc1q21ProfessionalCheckUtxoSnapshot=checkGiftReleaseAgainstUtxoSnapshot;

// Parsing an externally supplied response does not authenticate its Bitcoin Core origin.
globalThis.bc1q21ProfessionalParseCoreGettxout=parseBitcoinCoreGettxout;

/** Gift-specific signed Jade camera verification. No approval or broadcast.
 *  Caller-provided gift data and PSBT are NOT proof of authentic provenance.
 */
globalThis.bc1q21ProfessionalAttachGiftCamera=function({
 video,canvas,gift,release,approvedUnsignedBase64,expectedApprovedSha256,onStatus,onVerified
}){
 if(typeof onVerified!=='function')throw Error('Gift-specific verification callback required');
 const binding=verifyGiftReleaseBinding({gift,release,approvedUnsignedBase64,expectedApprovedSha256});
 if(binding.transactionMatchesSuppliedRelease!==true)throw Error('Gift-specific unsigned PSBT mismatch');
 return createJadeSignedCameraReceiver({video,canvas,onStatus,
  onSignedPsbt:async bytes=>{
   const verified=verifyProfessionalReturnedSignature(
    approvedUnsignedBase64,Buffer.from(bytes).toString('base64'),expectedApprovedSha256);
   if(verified.signatureCryptographicallyVerified!==true||
      verified.transactionMatches!==true||verified.broadcast!==false)
    throw Error('Gift-specific Jade signature failed verification');
   await onVerified(Object.freeze({...verified,selectedRelease:release.releaseNumber,
    giftProvenanceVerified:false,chainVerified:false,signingAuthorized:false,broadcast:false}));
  }});
};

// Public-only selected release/PSBT binding; does not confer spending authority.
globalThis.bc1q21ProfessionalVerifyGiftReleaseBinding=verifyGiftReleaseBinding;

/** Render a supplied, gift-matched unsigned PSBT as Jade animated QR images.
 * Diagnostic only: the caller must separately authenticate gift provenance.
 */
globalThis.bc1q21ProfessionalPrepareGiftUnsignedQr=async function({
 gift,release,approvedUnsignedBase64,expectedApprovedSha256
}){
 verifyGiftReleaseBinding({gift,release,approvedUnsignedBase64,expectedApprovedSha256});
 const frames=makeCryptoPsbtFrames(Buffer.from(approvedUnsignedBase64,'base64'));
 const images=await Promise.all(frames.map(frame=>QRCode.toDataURL(frame,{
  errorCorrectionLevel:'L',margin:2,width:360
 })));
 return Object.freeze({frames,images,network:'regtest',giftProvenanceVerified:false,
  signingAuthorized:false,broadcast:false});
};

// Actual regtest PSBT construction from public-only data, deliberately NOT
// a funding authorization. Inputs must later be independently confirmed by
// trusted Bitcoin Core before this transaction can be shown for signing.
import {snapshotFundedDistributionIntent} from '../funded-distribution-intent.mjs';
import {buildUnsignedFundedDistributionPsbt} from '../unsigned-funded-distribution-psbt.mjs';
import {verifyGiftCltvOutputs} from '../verify-gift-cltv-outputs.mjs';
globalThis.bc1q21ProfessionalConstructUntrustedCreatorPsbt=function({
 plan,accountXpub,masterFingerprintHex,utxos,networkFeeSats,
 serviceFeeOutput=null,changeOutput=null
}){
 if(typeof masterFingerprintHex!=='string'||!/^[a-f0-9]{8}$/i.test(masterFingerprintHex))
  throw Error('Jade master fingerprint required');
 const funding=globalThis.bc1q21ProfessionalPreviewFundingPublicKey({accountXpub});
 const preview=globalThis.bc1q21ProfessionalPreviewGiftOutputs({accountXpub,releases:plan?.releases});
 if(!Array.isArray(utxos)||!utxos.length||utxos.length>100)
  throw Error('Funding outpoints required');
 const intent=snapshotFundedDistributionIntent({
  network:'regtest',plan,utxos,
  giftOutputs:preview.outputs.map(o=>({
   date:o.date,valueSats:o.valueSats,locktime:o.locktime,scriptPubKeyHex:o.scriptPubKeyHex
  })),networkFeeSats,serviceFeeOutput,changeOutput
 });
 const locks=verifyGiftCltvOutputs({intent,plan,
  recipientPublicKeys:preview.outputs.map(o=>o.publicKeyHex)});
 if(locks.scriptsMatchSuppliedPublicKeysAndPlan!==true)
  throw Error('Gift output consistency check failed');
 const unsigned=buildUnsignedFundedDistributionPsbt(intent,{
  masterFingerprintHex,publicKeyHex:funding.publicKeyHex,path:funding.derivationPath
 });
 return Object.freeze({format:'bc1q21-professional-untrusted-creator-construction-v1',
  network:'regtest',intent,unsigned,recipientPublicKeys:Object.freeze(
   preview.outputs.map(o=>o.publicKeyHex)),
  giftScriptsChecked:true,chainVerified:false,recipientKeyOriginAuthenticated:false,
  independentGiftApproval:false,signingAuthorized:false,canSign:false,canBroadcast:false,
  nextStep:'TRUSTED_BITCOIN_CORE_AND_WALLET_IDENTITY_VERIFICATION_REQUIRED'});
};
// Creator transaction QR transport. Requires a separately constructed funded
// unsigned PSBT; rendering does NOT authorize the user to sign or broadcast.
globalThis.bc1q21ProfessionalRenderCreatorUnsignedQr=async function(unsigned){
 if(unsigned?.format!=='bc1q21-professional-funded-distribution-unsigned-psbt-v1'||
    unsigned.network!=='regtest'||unsigned.signed!==false||
    unsigned.broadcast!==false||unsigned.hardwareSignatureVerified!==false||
    typeof unsigned.unsignedPsbtBase64!=='string'||unsigned.unsignedPsbtBase64.length>150000||
    !/^[a-f0-9]{64}$/i.test(unsigned.psbtSha256))
  throw Error('Unsigned Professional regtest creator transaction required');
 const bytes=Buffer.from(unsigned.unsignedPsbtBase64,'base64');
 if(bytes.length<10||bytes.length>100000||
    bytes.subarray(0,5).toString('hex')!=='70736274ff'||
    Buffer.from(sha256(bytes)).toString('hex')!==unsigned.psbtSha256.toLowerCase())
  throw Error('Unsigned PSBT bytes or checksum mismatch');
 const psbt=bitcoin.Psbt.fromBuffer(bytes,{network:bitcoin.networks.regtest});
 if(psbt.data.inputs.some(input=>input.partialSig?.length||input.finalScriptSig||
    input.finalScriptWitness||input.tapKeySig))
  throw Error('PSBT already contains signatures');
 if(psbt.inputCount!==unsigned.fundingInputCount||
    psbt.txOutputs.length!==unsigned.totalOutputCount)
  throw Error('Unsigned transaction dimensions mismatch');
 const frames=makeCryptoPsbtFrames(bytes);
 const images=await Promise.all(frames.map(frame=>QRCode.toDataURL(frame,{
  errorCorrectionLevel:'L',margin:2,width:360
 })));
 return Object.freeze({images:Object.freeze(images),frameCount:images.length,
  approvedPsbtSha256:unsigned.psbtSha256.toLowerCase(),
  signingAuthorized:false,canBroadcast:false,network:'regtest'});
};
// Creator-side gift-specific Jade signed QR controller (isolated regtest).
// Only an already approved unsigned PSBT may be supplied by the caller.
// This diagnostic entry does not authenticate a file or approve a broadcast.
import {createCreatorSignedQrController} from '../creator-signed-qr-camera.browser.mjs';
globalThis.bc1q21ProfessionalAttachCreatorCamera = function(options) {
 return createCreatorSignedQrController(options);
};
