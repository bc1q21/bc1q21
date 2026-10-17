#!/usr/bin/env python3
"""Public-only inspection of four disposable Jade regtest CLTV UTXOs.

Not retail gift discovery: these four outpoints were funded separately, and
their descriptor metadata comes from a prior public fixture, not a gift card.
Requires local Docker Bitcoin Core regtest at the restored blockchain height.
"""
import hashlib, json, subprocess, sys
from pathlib import Path

input_path, output_path = map(Path, sys.argv[1:])
fixture = json.loads(input_path.read_text())
assert fixture["format"] == "bc1q21-professional-four-jade-public-regtest-v1"
assert fixture["network"] == "regtest"
assert fixture["chainHeight"] == 121
assert fixture["signed"] is False
assert len(fixture["releases"]) == 4
def rpc(*args):
    data = subprocess.check_output([
        "docker", "exec", "bc1q21-public-discovery", "bitcoin-cli",
        "-datadir=/work", "-regtest", "-rpcuser=regtest",
        "-rpcpassword=disposable", *map(str,args)
    ], text=True)
    return json.loads(data)

height = rpc("getblockcount")
assert height == 121, "Wrong saved chain"
records = []
for index, r in enumerate(fixture["releases"]):
    assert r["release"] == index + 1
    assert r["locktime"] == [130,140,150,160][index]
    assert r["inputSats"] == [12000,15000,18000,21000][index]
    assert r["destinationSats"] == r["inputSats"] - 1000
    assert r["feeSats"] == 1000
    assert r["derivationPath"] == "m/84'/0'/0'/1/" + str(index)
    script = bytes.fromhex(r["redeemScriptHex"])
    # Script template: <height as minimally encoded script number> CLTV DROP <33-byte pubkey> CHECKSIG
    assert script[-35] == 33 and script[-1] == 0xac
    assert script[-34:-1].hex() == r["signerPubkeyHex"]
    assert script[-37:-35] == bytes.fromhex("b175")
    number_push_len = script[0]
    assert script[1+number_push_len:1+number_push_len+2] == bytes.fromhex("b175")
    little = script[1:1+number_push_len]
    assert int.from_bytes(little, "little", signed=False) == r["locktime"]
    h160 = hashlib.new("ripemd160", hashlib.sha256(script).digest()).digest()
    expected_spk = bytes.fromhex("a914") + h160 + bytes.fromhex("87")
    assert expected_spk.hex() == r["fundingScriptPubKeyHex"]
    txid = r["fundingTxid"]
    vout = r["vout"]
    assert len(txid) == 64 and isinstance(vout,int)
    utxo = rpc("gettxout", txid, vout, "true")
    assert utxo is not None, "Outpoint absent or spent"
    assert utxo["value"] == r["inputSats"] / 100_000_000
    assert utxo["scriptPubKey"]["hex"] == expected_spk.hex()
    records.append({
       "release": index + 1, "outpoint": txid + ":" + str(vout),
       "lockingScript": expected_spk.hex(),
       "fundingSats": r["inputSats"],
       "examplePayoutSats": r["destinationSats"],
       "exampleFeeSats": r["feeSats"],
       "cltvBlockHeight": r["locktime"],
       "matureAtSavedHeight": height >= r["locktime"],
       "unspentAtSavedHeight": True,
       "signerPathPublicMetadata": r["derivationPath"]
    })
assert len({x["outpoint"] for x in records}) == 4
result = {
  "format": "bc1q21-professional-public-regtest-outpoint-audit-v1",
  "network": "regtest", "snapshotHeight": height,
  "source": "four independent disposable funding outpoints, NOT retail gift transaction",
  "privateKeysIncluded": False,
  "giftLinkBindingProven": False,
  "encryptedFirstDateRecovered": False,
  "giftChainDiscoveryProven": False,
  "releases": records
}
output_path.write_text(json.dumps(result, indent=2)+"\n")
print("PASS public Core UTXO script/amount/CLTV crosschecks for",len(records),"disposable releases")
print("BOUNDARY: no gift-specific link identity, OP_RETURN recovery, or 24-date discovery proven")
