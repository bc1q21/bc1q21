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
