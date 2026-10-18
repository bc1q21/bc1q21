import {URDecoder} from '@ngraveio/bc-ur';
import bitcoin from 'bitcoinjs-lib';
import ecc from 'tiny-secp256k1';
import {Buffer} from 'buffer';
const $=id=>document.getElementById(id);
const fixture=JSON.parse($('fixture').textContent);
function check(bytes){
 const a=bitcoin.Psbt.fromBase64(fixture.psbtBase64,{network:bitcoin.networks.regtest});
 const b=bitcoin.Psbt.fromBuffer(bytes,{network:bitcoin.networks.regtest});
 if(a.txInputs.length!==1||a.txOutputs.length!==25||b.txInputs.length!==1||b.txOutputs.length!==25)throw Error('Transaction dimensions differ');
 if(!Buffer.from(a.data.globalMap.unsignedTx.toBuffer()).equals(Buffer.from(b.data.globalMap.unsignedTx.toBuffer())))throw Error('Unsigned transaction mismatch');
 const before=a.data.inputs[0],after=b.data.inputs[0];
 if(!before.witnessUtxo||!after.witnessUtxo||before.witnessUtxo.value!==after.witnessUtxo.value||!Buffer.from(before.witnessUtxo.script).equals(Buffer.from(after.witnessUtxo.script)))throw Error('Funding input mismatch');
 if(before.partialSig?.length||after.partialSig?.length!==1)throw Error('Expected one new partial signature');
 const origin=before.bip32Derivation;
 if(origin?.length!==1||Buffer.from(origin[0].masterFingerprint).toString('hex')!==fixture.creatorFingerprint||origin[0].path!==fixture.creatorPath)throw Error('Unexpected Jade signer origin');
 if(!Buffer.from(after.partialSig[0].pubkey).equals(Buffer.from(origin[0].pubkey)))throw Error('Signer pubkey mismatch');
 if(!b.validateSignaturesOfInput(0,(pubkey,hash,sig)=>ecc.verify(hash,pubkey,sig)))throw Error('ECDSA signature failed verification');
 for(let i=0;i<24;i++){const out=b.txOutputs[i],expected=fixture.recipientOutputs[i];if(out.value!==expected.sats||!Buffer.from(out.script).equals(Buffer.from(expected.scriptPubKey,'hex')))throw Error('Recipient output mismatch: '+(i+1))}
 if(b.txOutputs[24].value!==fixture.changeSats)throw Error('Change mismatch');
 const fee=before.witnessUtxo.value-b.txOutputs.reduce((sum,out)=>sum+out.value,0);
 if(fee!==fixture.feeSats)throw Error('Fee mismatch');
 return 'Signature valid; 24 gifts, change and '+fee+' satoshi fee match. No broadcast.';
}
$('capture').onchange=async event=>{
 try{
 const f=event.target.files?.[0];if(!f||f.size>200000)throw Error('Select a QR capture text file smaller than 200 KB');
 const frames=(await f.text()).split(/\r?\n/).map(s=>s.trim()).filter(s=>/^ur:crypto-psbt\//i.test(s));
 if(frames.length<2)throw Error('No usable crypto-psbt frames');
 const decoder=new URDecoder();
 for(const frame of frames)decoder.receivePart(frame);
 if(!decoder.isComplete()||!decoder.isSuccess())throw Error('QR fountain reconstruction incomplete');
 const ur=decoder.resultUR();if(ur.type!=='crypto-psbt')throw Error('Unexpected QR type');
 const raw=Buffer.from(ur.decodeCBOR());
 if(raw.subarray(0,5).toString('hex')!=='70736274ff')throw Error('Invalid PSBT header');
 $('status').textContent='PASS — '+check(raw);
 }catch(error){$('status').textContent='NOT VERIFIED — '+error.message}
};
