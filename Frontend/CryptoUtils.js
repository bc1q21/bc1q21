//============================================================================
// CRYPTO UTILITIES MODULE
// ============================================================================
class CryptoUtils {
    /**
     * Base58 alphabet for Bitcoin addresses
     */
    static BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

    /**
     * Encodes a buffer to Base58
     */
    static base58Encode(buffer) {
        let digits = [0];
        for (const byte of buffer) {
            let carry = byte;
            for (let j = 0; j < digits.length; ++j) {
                carry += digits[j] << 8;
                digits[j] = carry % 58;
                carry = (carry / 58) | 0;
            }
            while (carry) {
                digits.push(carry % 58);
                carry = (carry / 58) | 0;
            }
        }
        let result = '';
        for (const byte of buffer) {
            if (byte === 0) result += '1';
            else break;
        }
        return result + digits.reverse().map(d => CryptoUtils.BASE58_ALPHABET[d]).join('');
    }

    /**
     * Encodes payload with Base58Check (includes checksum)
     */
    static async base58CheckEncode(payload) {
        const checksum = await nobleHashes.sha256(await nobleHashes.sha256(payload));
        const full = new Uint8Array(payload.length + 4);
        full.set(payload);
        full.set(checksum.subarray(0, 4), payload.length);
        return CryptoUtils.base58Encode(full);
    }

    /**
     * Converts hex string to byte array
     */
    static hexToBytes(hex) {
        if (hex.length % 2 !== 0) throw new Error("Invalid hex");
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

    /**
     * Converts byte array to hex string
     */
    static bytesToHex(bytes) {
        return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Creates a hash160 (SHA256 + RIPEMD160) of input data
     */
    static hash160(data) {
        return nobleHashes.ripemd160(nobleHashes.sha256(data));
    }
}

// ============================================================================
// SEED GENERATION MODULE
// ============================================================================
class SeedGenerator {
    /**
     * Validates a BIP39 mnemonic phrase
     */
    static validateMnemonic(mnemonic) {
        return window.bip39?.validateMnemonic(mnemonic, window.english) || false;
    }

    /**
     * Converts a mnemonic phrase to a seed buffer
     */
    static async mnemonicToSeed(mnemonic) {
        if (!window.bip39) throw new Error('BIP39 library not loaded');
        return await window.bip39.mnemonicToSeed(mnemonic);
    }

    /**
     * Generates a new BIP39 mnemonic
     */
    static async generateMnemonic() {
        if (!window.bip39 || !window.english) {
            throw new Error('BIP39 library not loaded');
        }
        
        // Generate 128 bits (16 bytes) of cryptographically secure random entropy
        const entropy = new Uint8Array(16);
        crypto.getRandomValues(entropy);
        
        // Convert entropy to mnemonic using BIP39
        const mnemonic = window.bip39.entropyToMnemonic(entropy, window.english);
        
        return mnemonic;
    }
}

// ============================================================================
// KEY DERIVATION MODULE
// ============================================================================
class KeyDerivation {
    constructor() {
        this.reset();
    }

    reset() {
        this.masterKey = null;
        this.wif = '';
        this.publicKeyHex = '';
        this.addresses = {
            funding: '',      // m/84'/0'/0'/0/0
            recipient: '',    // m/84'/0'/0'/0/1
            cltv: []         // Array of CLTV addresses
        };
    }

    /**
     * Derives Bitcoin keys from a BIP39 mnemonic phrase
     */
    async deriveKeysFromMnemonic(mnemonic) {
        if (!SeedGenerator.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase');
        }

        if (!window.HDKey) throw new Error('HDKey library not loaded');

        const seed = await SeedGenerator.mnemonicToSeed(mnemonic);
        const root = window.HDKey.fromMasterSeed(seed);
        
        // Derive main key (m/44'/0'/0'/0/0) for WIF and public key
        const mainChild = root.derive("m/44'/0'/0'/0/0");
        if (!mainChild.privateKey) {
            throw new Error('Failed to derive private key');
        }

        // Create WIF private key
        const extended = new Uint8Array(mainChild.privateKey.length + 2);
        extended[0] = 0x80; // version byte
        extended.set(mainChild.privateKey, 1);
        extended[mainChild.privateKey.length + 1] = 0x01; // compressed flag
        this.wif = await CryptoUtils.base58CheckEncode(extended);
        this.publicKeyHex = CryptoUtils.bytesToHex(mainChild.publicKey);

        // BIP84 derivation for native segwit addresses
        const account = root.derive("m/84'/0'/0'");
        
        // Funding address (m/84'/0'/0'/0/0)
        const fundingKey = account.deriveChild(0).deriveChild(0);
        this.addresses.funding = await this.createBech32Address(fundingKey.publicKey);

        // Recipient address (m/84'/0'/0'/0/1)
        const recipientKey = account.deriveChild(0).deriveChild(1);
        this.addresses.recipient = await this.createBech32Address(recipientKey.publicKey);

        this.masterKey = root;
        return true;
    }

    /**
     * Creates a Bech32 address from a public key
     */
    async createBech32Address(pubkey) {
        if (!window.bech32) throw new Error('Bech32 library not loaded');
        
        const pubkeyHash = nobleHashes.sha256(pubkey);
        const hash160 = nobleHashes.ripemd160(pubkeyHash);
        const words = window.bech32.bech32.toWords(hash160);
        words.unshift(0x00); // witness version 0
        return window.bech32.bech32.encode('bc', words);
    }

    /**
     * Generates CLTV addresses for a schedule
     */
    async generateCltvAddresses(schedule) {
        if (!this.masterKey) {
            throw new Error('Master key not available. Please set up recovery words first.');
        }

        const addresses = [];
        const account = this.masterKey.derive("m/84'/0'/0'");

        for (let i = 0; i < schedule.length; i++) {
            const row = schedule[i];
            
            // Use different derivation path for each CLTV address
            const cltvKey = account.deriveChild(1).deriveChild(i + 10); // m/84'/0'/0'/1/10+i
            const locktime = Math.floor(new Date(row.date + 'T00:00:00Z').getTime() / 1000);
            
            const timelockScript = new TimelockScript();
            const address = await timelockScript.generateTimeLockedAddress(
                CryptoUtils.bytesToHex(cltvKey.publicKey), 
                locktime
            );

            addresses.push({
                date: row.date,
                btc: row.btc,
                address: address.p2shAddress,
                redeemScript: address.redeemScript,
                locktime: locktime,
                publicKey: CryptoUtils.bytesToHex(cltvKey.publicKey),
                derivationPath: `m/84'/0'/0'/1/${i + 10}`
            });
        }

        this.addresses.cltv = addresses;
        return addresses;
    }
}

// ============================================================================
// TIMELOCK SCRIPT MODULE
// ============================================================================
class TimelockScript {
    /**
     * Generates a time-locked P2SH address with CLTV
     */
    async generateTimeLockedAddress(pubkeyHex, locktime) {
        if (!/^[0-9a-fA-F]{66,130}$/.test(pubkeyHex)) {
            throw new Error('Invalid public key format');
        }

        if (locktime < 50000) {
            throw new Error('Timestamp must be >= 50000 (for CLTV to treat as date)');
        }

        const script = this.buildCLTVScript(locktime, pubkeyHex);
        const p2shAddress = await this.createP2SHAddress(script);
        const redeemScript = CryptoUtils.bytesToHex(script);
        
        return {
            p2shAddress,
            redeemScript,
            locktime
        };
    }

    /**
     * Builds a CLTV redeem script
     */
    buildCLTVScript(timestamp, pubkeyHex) {
        const script = [];
        const littleEndianUnlockTime = this.encodeScriptNumber(timestamp);
        
        script.push(littleEndianUnlockTime.length);    // Push length of timestamp
        script.push(...littleEndianUnlockTime);        // Push timestamp value
        script.push(0xb1);                             // OP_CHECKLOCKTIMEVERIFY
        script.push(0x75);                             // OP_DROP

        const pubkeyBytes = CryptoUtils.hexToBytes(pubkeyHex);
        script.push(pubkeyBytes.length);               // Push pubkey length
        script.push(...pubkeyBytes);                   // Push pubkey
        script.push(0xac);                             // OP_CHECKSIG

        return new Uint8Array(script);
    }

    /**
     * Creates a P2SH address from a redeem script
     */
    async createP2SHAddress(script) {
        const firstSha256 = await nobleHashes.sha256(script);
        const redeemHash = await nobleHashes.ripemd160(firstSha256);
        const version = 0x05; // P2SH version byte
        const redeemWithVersion = new Uint8Array([version, ...redeemHash]);

        const checksumFull = await nobleHashes.sha256(await nobleHashes.sha256(redeemWithVersion));
        const checksum = new Uint8Array(checksumFull).slice(0, 4);

        return CryptoUtils.base58Encode(new Uint8Array([...redeemWithVersion, ...checksum]));
    }

    /**
     * Encodes a number as a Bitcoin script number (little-endian)
     */
    encodeScriptNumber(num) {
        const result = [];
        while (num > 0) {
            result.push(num & 0xff);
            num >>= 8;
        }
        if (result[result.length - 1] & 0x80) {
            result.push(0);
        }
        return new Uint8Array(result);
    }
}
