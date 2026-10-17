#!/usr/bin/env python3
"""Isolated real-regtest gift-card locator discovery of ONE 24-output funding tx.
The destination scripts derive from a disposable PUBLIC xpub fixture.
Bitcoin Core mining/spending wallet exists only inside network-disabled Docker.
No Jade seed, real gift funds, browser signing or private material is handled.
"""
import base64, hashlib, json, os, subprocess, sys
from decimal import Decimal

PUBLIC_FILE, OUTPUT_FILE = sys.argv[1:]
data=json.load(open(PUBLIC_FILE))
assert data['format']=='bc1q21-professional-watchonly-review-v1'
assert data['network']=='regtest' and data['privateKeysIncluded'] is False
descriptors=data['descriptors']
assert len(descriptors)==24 and len({d['scriptPubKey'] for d in descriptors})==24

def rpc(*args,wallet=False):
    cmd=['docker','exec','bc1q21-single-gift','bitcoin-cli','-datadir=/work','-regtest',
         '-rpcuser=regtest','-rpcpassword=disposable']
    if wallet:cmd+=['-rpcwallet=test-gift-creator']
    cmd += list(map(str,args))
    result=subprocess.check_output(cmd,text=True).strip()
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return result  # Bitcoin Core CLI returns plain addresses and txids as unquoted text

def p2sh_addr(script):
    assert len(script)==46 and script[:4]=='a914' and script[-2:]=='87'
    payload=b'\xc4'+bytes.fromhex(script[4:-2])
    check=hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
    alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    num=int.from_bytes(payload+check,'big')
    encoded=''
    while num:
        num,rem=divmod(num,58)
        encoded=alphabet[rem]+encoded
    return '1'*(len(payload+check)-len((payload+check).lstrip(b'\x00')))+encoded

rpc('createwallet','test-gift-creator')
funding=rpc('getnewaddress','gift-funding','bech32',wallet=True)
assert funding.startswith('bcrt1')
mined=rpc('generatetoaddress',121,funding)
assert len(mined)==121 and rpc('getblockcount')==121
available=rpc('listunspent',101,9999999,json.dumps([funding]),wallet=True)
assert available,'No mature coinbase UTXO at gift funding address'
coin=available[0]
assert coin['address']==funding
marker=b'bc1q21-professional-synthetic-gift-24-v1'
outputs=[{'data':marker.hex()}]
for d in descriptors:
    assert d['vout']>=1
    outputs.append({p2sh_addr(d['scriptPubKey']):str(Decimal(d['sats'])/Decimal(100000000))})
raw=rpc('createrawtransaction',json.dumps([{'txid':coin['txid'],'vout':coin['vout']}]),json.dumps(outputs))
funded=rpc('fundrawtransaction',raw,json.dumps({'add_inputs':False}),wallet=True)
signed=rpc('signrawtransactionwithwallet',funded['hex'],wallet=True)
assert signed['complete']
txid=rpc('sendrawtransaction',signed['hex'])
rpc('generatetoaddress',1,funding)
assert rpc('getblockcount')==122
tx=rpc('getrawtransaction',txid,'true')
assert tx['confirmations']>=1
assert len(tx['vin'])==1
prev=rpc('getrawtransaction',coin['txid'],'true')
input_origin=prev['vout'][coin['vout']]['scriptPubKey'].get('address')
assert input_origin==funding,'Gift link not tied to actual funded input'
all_vouts=tx['vout']
assert any(v['scriptPubKey']['hex']=='6a'+format(len(marker),'02x')+marker.hex() for v in all_vouts)
matched=[]
for index,d in enumerate(descriptors):
    expected=d['scriptPubKey']
    matches=[v for v in all_vouts if v['scriptPubKey']['hex']==expected]
    assert len(matches)==1,'Missing or duplicate public gift output'
    v=matches[0]
    assert v['n']==index+1,'Output ordering mismatch'
    assert int(Decimal(str(v['value']))*100000000)==d['sats']
    utxo=rpc('gettxout',txid,index+1,'true')
    assert utxo is not None and utxo['scriptPubKey']['hex']==expected
    matched.append({'index':index,'vout':v['n'],'scriptPubKey':expected,'sats':d['sats']})
assert len(matched)==24 and len({m['vout'] for m in matched})==24
result={'format':'bc1q21-professional-single-regtest-gift-discovery-v1',
        'network':'regtest','blockHeight':122,'giftLinkFundingAddress':funding,
        'fundingInputOriginConfirmed':True,'fundingTxid':txid,'tag':marker.decode(),
        'all24OutputsFundedAndUnspent':True,'releaseOutputs':matched,
        'source':'isolated real Bitcoin Core synthetic funding transaction',
        'dateDecryptProven':False,'xpubOriginAuthenticated':False,
        'giftLinkOwnershipAuthenticated':False,'jadeRecoveryProven':False}
open(OUTPUT_FILE,'w').write(json.dumps(result,indent=2)+'\n')
print('PASS_REAL_CORE_24_OUTPUT_SINGLE_GIFT_DISCOVERY',json.dumps({
'height':122,'releases':24,'giftLinkFundingAddress':funding,'fundingTxid':txid,
'utxoMatches':24,'inputOriginVerified':True}))
print('NOT PROVEN: gift wallet xpub provenance, encrypted first date, Jade restore or real retail-compatible gift metadata')
