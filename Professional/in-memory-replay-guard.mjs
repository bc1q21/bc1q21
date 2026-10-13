// Test-only shared replay guard for multiple Professional sessions in one
// Node.js process. NOT persistent, distributed, or a blockchain UTXO check.
// Uses public funding outpoints; never stores secrets or broadcasts.
const fail=m=>{throw Error('Professional replay guard: '+m)};
const txidPattern=/^[a-f0-9]{64}$/i;
export function createInMemoryProfessionalReplayGuard(){
 const consumed=new Set();
 return Object.freeze({
  claim:(txid,vout)=>{
   if(typeof txid!=='string'||!txidPattern.test(txid)||
      !Number.isSafeInteger(vout)||vout<0||vout>0xffffffff)
    fail('Invalid public funding outpoint');
   const key=txid.toLowerCase()+':'+vout;
   if(consumed.has(key))fail('Funding outpoint already claimed by another session');
   consumed.add(key);
   return true;
  },
  has:(txid,vout)=>{
   if(typeof txid!=='string'||!txidPattern.test(txid)||
      !Number.isSafeInteger(vout)||vout<0||vout>0xffffffff)
    fail('Invalid public funding outpoint');
   return consumed.has(txid.toLowerCase()+':'+vout);
  },
  count:()=>consumed.size
 });
}
