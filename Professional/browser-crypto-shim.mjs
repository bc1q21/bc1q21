// Browser-only SHA-256 adapter for existing public PSBT verification code.
// No secret material or random-number generation.
import {sha256} from '@noble/hashes/sha256';
import {Buffer} from 'buffer';
export function createHash(algorithm){
 if(algorithm!=='sha256')throw Error('Unsupported browser digest');
 const parts=[];
 return {
  update(bytes){parts.push(Buffer.from(bytes));return this;},
  digest(encoding){const result=Buffer.from(sha256(Buffer.concat(parts)));return encoding?result.toString(encoding):result;}
 };
}
