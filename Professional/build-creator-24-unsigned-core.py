#!/usr/bin/env python3
"""Build one unsigned 24-output funding PSBT on disposable isolated Bitcoin Core."""
import base64, hashlib, json, subprocess, sys
from decimal import Decimal
fixture=json.load(open(sys.argv[1]))
ds=fixture['descriptors']
assert fixture['network']=='regtest' and len(ds)==24
def rpc(*args,wallet=False):
 cmd=['docker','exec','bc1q21-creator-psbt','bitcoin-cli','-datadir=/work','-regtest','-rpcuser=regtest','-rpcpassword=disposable']
 if wallet:cmd.append('-rpcwallet=creator-test')
 v=subprocess.check_output(cmd+list(map(str,args)),text=True).strip()
 try:return json.loads(v)
 except json.JSONDecodeError:return v
def address(script):
 payload=bytes.fromhex('c4'+script[4:-2])
 raw=payload+hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
 alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
 n=int.from_bytes(raw,'big');out=''
 while n:n,rem=divmod(n,58);out=alphabet[rem]+out
 return '1'*(len(raw)-len(raw.lstrip(bytes([0]))))+out
assert rpc('getblockcount')==0
rpc('createwallet','creator-test')
addr=rpc('getnewaddress','creator','bech32',wallet=True)
rpc('generatetoaddress',121,addr)
coin=rpc('listunspent',101,9999999,json.dumps([addr]),wallet=True)[0]
outputs=[{address(d['scriptPubKey']):str(Decimal(d['sats'])/Decimal(100000000))} for d in ds]
built=rpc('walletcreatefundedpsbt',json.dumps([{'txid':coin['txid'],'vout':coin['vout']}]),json.dumps(outputs),0,json.dumps({'add_inputs':False,'fee_rate':2.0}),'true',wallet=True)
psbt=built['psbt']; raw=base64.b64decode(psbt)
assert raw.startswith(b'psbt'+bytes([255]))
decoded=rpc('decodepsbt',psbt)
tx=decoded['tx']
assert len(tx['vin'])==1 and len(tx['vout'])==25
assert built['changepos']>=0
matched=[]
for d in ds:
 found=[v for v in tx['vout'] if v['scriptPubKey']['hex']==d['scriptPubKey']]
 assert len(found)==1
 assert int(Decimal(str(found[0]['value']))*100000000)==d['sats']
 matched.append({'index':d['index'],'vout':found[0]['n'],'sats':d['sats'],'scriptPubKey':d['scriptPubKey']})
assert len(set(m['vout'] for m in matched))==24
assert len(decoded['inputs'])==1
assert all('partial_signatures' not in i and 'final_scriptwitness' not in i for i in decoded['inputs'])
assert 'witness_utxo' in decoded['inputs'][0] or 'non_witness_utxo' in decoded['inputs'][0]
record={'format':'bc1q21-professional-creator-24-unsigned-v1','network':'regtest','psbtBase64':psbt,'psbtSha256':hashlib.sha256(raw).hexdigest(),'psbtBytes':len(raw),'releaseOutputs':matched,'changeVout':built['changepos'],'feeBtc':str(decoded['fee']),'unsigned':True,'broadcast':False,'hardwareScanned':False}
with open(sys.argv[2],'x') as f:json.dump(record,f,indent=2)
print('PASS_CREATOR_24_UNSIGNED',json.dumps({'bytes':len(raw),'sha256':record['psbtSha256'],'outputs':len(matched),'signed':False}))
